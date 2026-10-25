import { Router } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { query, transaction } from '../config/db.js';
import { analyzeWithNemotron } from '../services/nemotron.service.js';
import { evaluatePolicy, deriveDecision } from '../services/policy.service.js';
import { calculateRiskScore, scoreToSeverity, scoreToDecision } from '../services/risk.service.js';
import { detectSensitiveData } from '../services/data-protection.service.js';
import { detectThreatsLocally } from './security.routes.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();
router.use(authenticate);

// GET /api/v1/evaluation/datasets
router.get('/datasets', async (req, res, next) => {
  try {
    const result = await query(`SELECT id, name, version, description, created_at FROM benchmark_datasets ORDER BY created_at DESC`);
    res.json({ success: true, datasets: result.rows });
  } catch (err) { next(err); }
});

// POST /api/v1/evaluation/runs — Start a benchmark run
router.post('/runs', requireRole('admin'), validate(z.object({ datasetId: z.string().min(1).max(64) })), async (req, res, next) => {
  const { datasetId } = req.body;
  const runId = crypto.randomUUID();

  try {
    const dsRes = await query(`SELECT * FROM benchmark_datasets WHERE id = :id`, { id: datasetId });
    if (dsRes.rows.length === 0) return next(new AppError('Dataset not found', 404));

    const casesRes = await query(`SELECT * FROM benchmark_cases WHERE dataset_id = :id`, { id: datasetId });
    const cases    = casesRes.rows;

    await transaction(async (conn) => {
      await conn.execute(
        `INSERT INTO benchmark_runs (id, dataset_id, initiated_by, model_identifier, status, started_at)
         VALUES (:id, :dsId, :creatorId, :model, 'running', SYSTIMESTAMP)`,
        { id: runId, dsId: datasetId, creatorId: req.user.id, model: process.env.NEBIUS_MODEL || 'deterministic-only' }
      );
    });

    // Run asynchronously — return runId immediately
    runBenchmarkAsync(runId, cases, req.user.id).catch(err =>
      console.error('[EVAL] Background benchmark failed:', err.message)
    );

    res.status(202).json({ success: true, runId, message: 'Benchmark run started. Poll /runs/:id for status.' });
  } catch (err) { next(err); }
});

// GET /api/v1/evaluation/runs
router.get('/runs', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT * FROM (
         SELECT id, dataset_id, status, metrics_json, started_at, completed_at
         FROM benchmark_runs
         ORDER BY started_at DESC
       ) WHERE ROWNUM <= 20`
    );
    res.json({ success: true, runs: result.rows });
  } catch (err) { next(err); }
});

// GET /api/v1/evaluation/runs/:id
router.get('/runs/:id', async (req, res, next) => {
  try {
    const run = await query(`SELECT * FROM benchmark_runs WHERE id = :id`, { id: req.params.id });
    if (run.rows.length === 0) return next(new AppError('Run not found', 404));
    res.json({ success: true, run: run.rows[0] });
  } catch (err) { next(err); }
});

// GET /api/v1/evaluation/runs/:id/results
router.get('/runs/:id/results', async (req, res, next) => {
  try {
    const results = await query(
      `SELECT br.*, bc.category, bc.expected_decision, bc.case_key
       FROM benchmark_results br
       JOIN benchmark_cases bc ON br.case_id = bc.id
       WHERE br.run_id = :id ORDER BY bc.category`,
      { id: req.params.id }
    );
    res.json({ success: true, results: results.rows });
  } catch (err) { next(err); }
});

// ── Internal async benchmark runner ──────────────────────
async function runBenchmarkAsync(runId, cases, userId) {
  let tp = 0, fp = 0, tn = 0, fn = 0;
  const startTime = Date.now();

  for (const bc of cases) {
    const caseStart = Date.now();
    try {
      const inputData   = typeof bc.INPUT_DATA === 'string' ? JSON.parse(bc.INPUT_DATA) : bc.INPUT_DATA;
      const content     = inputData.content || inputData.text || JSON.stringify(inputData);
      const expectedDec = bc.EXPECTED_DECISION || 'ALLOW';

      // Deterministic analysis
      const threats = detectThreatsLocally(content);
      const sensitiveFindings = detectSensitiveData(content);
      const riskScore  = calculateRiskScore({ threatTypes: threats, hasSensitiveData: sensitiveFindings.length > 0 });
      const actualDec  = scoreToDecision(riskScore);

      const isMalicious = ['BLOCK', 'REQUIRE_APPROVAL'].includes(expectedDec);
      const isDetected  = ['BLOCK', 'REQUIRE_APPROVAL'].includes(actualDec);

      if (isMalicious  && isDetected)  tp++;
      if (!isMalicious && isDetected)  fp++;
      if (!isMalicious && !isDetected) tn++;
      if (isMalicious  && !isDetected) fn++;

      const pass = actualDec === expectedDec;
      const resultId = crypto.randomUUID();
      await transaction(async (conn) => {
        await conn.execute(
          `INSERT INTO benchmark_results (id, run_id, case_id, actual_decision, latency_ms, pass_status)
           VALUES (:id, :runId, :caseId, :dec, :lat, :pass)`,
          { id: resultId, runId, caseId: bc.ID, dec: actualDec, lat: Date.now() - caseStart, pass: pass ? 'pass' : 'fail' }
        );
      });
    } catch (err) {
      console.warn(`[EVAL] Case ${bc.ID} error:`, err.message);
    }
  }

  const total     = tp + fp + tn + fn;
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall    = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1        = precision + recall > 0 ? 2 * precision * recall / (precision + recall) : 0;

  const metrics = {
    truePositives:   tp, falsePositives: fp,
    trueNegatives:   tn, falseNegatives: fn,
    precision:       Math.round(precision * 1000) / 1000,
    recall:          Math.round(recall   * 1000) / 1000,
    f1Score:         Math.round(f1       * 1000) / 1000,
    detectionRate:   tp + fn > 0 ? Math.round(tp / (tp + fn) * 1000) / 1000 : 0,
    falsePositiveRate: fp + tn > 0 ? Math.round(fp / (fp + tn) * 1000) / 1000 : 0,
    totalCases:      total,
    totalLatencyMs:  Date.now() - startTime,
  };

  await transaction(async (conn) => {
    await conn.execute(
      `UPDATE benchmark_runs SET status = 'completed', metrics_json = :metrics, completed_at = SYSTIMESTAMP WHERE id = :id`,
      { metrics: JSON.stringify(metrics), id: runId }
    );
  });
}

export default router;
