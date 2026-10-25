import { Router } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { validate } from '../middleware/validate.middleware.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { query, transaction } from '../config/db.js';
import { getTool, listTools } from '../services/sandbox-tools.js';
import { evaluatePolicy, deriveDecision } from '../services/policy.service.js';
import { detectSensitiveData, redactSensitiveData } from '../services/data-protection.service.js';
import { calculateRiskScore, scoreToSeverity, evaluateFiveSignals } from '../services/risk.service.js';
import { analyzeWithNemotron } from '../services/nemotron.service.js';
import { auditLog } from '../services/audit.service.js';
import { detectAttackChains } from '../services/attack-chain.service.js';
import { detectThreatsLocally } from './security.routes.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();
router.use(authenticate);

const RunSchema = z.object({
  agentId:        z.string().min(1).max(64),
  toolName:       z.string().min(1).max(120),
  toolArgs:       z.record(z.unknown()).default({}),
  traceId:        z.string().min(1).max(64).optional(),
  prompt:         z.string().optional(),
  ragContent:     z.string().optional(),
  memoryContent:  z.string().optional(),
});

// GET /api/v1/sandbox/tools
router.get('/tools', (req, res) => {
  res.json({ success: true, tools: listTools() });
});

// POST /api/v1/sandbox/runs — Main enforcement gateway
router.post('/runs', validate(RunSchema), async (req, res, next) => {
  const { agentId, toolName, toolArgs, traceId: clientTrace, prompt, ragContent, memoryContent } = req.body;
  const traceId = clientTrace || crypto.randomUUID();
  const actionId = crypto.randomUUID();

  try {
    // ── 1. Validate tool is registered ────────────────────────
    const tool = getTool(toolName);
    if (!tool) {
      return next(new AppError(`Tool "${toolName}" is not registered in the sandbox.`, 400));
    }

    // ── 2. Load agent + permissions ────────────────────────────
    const agentRes = await query(
      `SELECT id, owner_id, status FROM agents WHERE id = :agentId`,
      { agentId }
    );
    if (agentRes.rows.length === 0) return next(new AppError('Agent not found', 404));
    if (agentRes.rows[0].STATUS !== 'active') {
      return next(new AppError(`Agent is currently ${agentRes.rows[0].STATUS} (quarantined/isolated). Reactivate agent in settings to continue.`, 403));
    }

    const permRes = await query(
      `SELECT tool_name, allowed FROM agent_permissions WHERE agent_id = :agentId`,
      { agentId }
    );
    const permissions = permRes.rows;

    // ── 3. Sensitive data in arguments ─────────────────────────
    const argsStr         = JSON.stringify(toolArgs);
    const sensitiveFindings = detectSensitiveData(argsStr);
    const argsRedacted    = redactSensitiveData(argsStr);
    const argsHash        = crypto.createHash('sha256').update(argsStr).digest('hex');

    // ── 4. AI analysis ─────────────────────────────────────────
    const promptText = prompt || `Agent wants to call: ${toolName}\nArguments: ${argsRedacted}`;
    const modelResult = await analyzeWithNemotron(promptText, { toolName, toolArgs });

    const threatTypes = modelResult.fromModel
      ? modelResult.analysis.threat_types.filter(t => t !== 'none')
      : detectThreatsLocally(promptText);
    const modelScore  = modelResult.fromModel ? modelResult.analysis.risk_score : null;

    // Check RAG / Memory poisoning
    const ragThreats = ragContent ? detectThreatsLocally(ragContent) : [];
    const memoryThreats = memoryContent ? detectThreatsLocally(memoryContent) : [];

    const permissionAllowed = permissions.some(p => p.TOOL_NAME === toolName && p.ALLOWED === 1);
    const isDenied = !permissionAllowed && permissions.length > 0;

    // ── 5. 5-Signal Risk evaluation (Paper FR-01 to FR-05) ────
    const fiveSignals = evaluateFiveSignals({
      threatTypes,
      hasSensitiveData: sensitiveFindings.length > 0,
      toolName,
      modelScore,
      memoryPoisoned: memoryThreats.length > 0,
      ragPoisoned: ragThreats.length > 0,
      isDenied,
    });

    const riskScore = Math.round(fiveSignals.effectiveRisk);
    const severity  = fiveSignals.severity;

    // ── 6. Policy evaluation ───────────────────────────────────
    const evaluations  = evaluatePolicy({ action: { toolName, toolArgs }, agentPermissions: permissions, riskScore });
    const policyDecision = deriveDecision(evaluations);

    // Final decision incorporates 5-signal model and policy
    let finalDecision = fiveSignals.decision;
    if (policyDecision === 'BLOCK') finalDecision = 'BLOCK';
    if (policyDecision === 'REQUIRE_APPROVAL' && finalDecision === 'ALLOW') finalDecision = 'CONFIRM';

    const modelRec = modelResult.fromModel ? modelResult.analysis.recommended_action : null;

    // ── 7. Detect attack chains ────────────────────────────────
    const chainDetections = await detectAttackChains(agentId).catch(() => []);

    // ── 8. ISOLATE path (R* > 80) ──────────────────────────────
    if (finalDecision === 'ISOLATE' || riskScore > 80) {
      await transaction(async (conn) => {
        await conn.execute(
          `INSERT INTO agent_actions
             (id, agent_id, trace_id, tool_name, arguments_redacted, arguments_hash,
              risk_score, status, execution_started_at)
           VALUES
             (:id, :agentId, :traceId, :toolName, :argsRedacted, :argsHash,
              :riskScore, 'isolated', SYSTIMESTAMP)`,
          {
            id:           actionId,
            agentId,
            traceId,
            toolName,
            argsRedacted,
            argsHash,
            riskScore,
          }
        );
        // Quarantine agent session:
        await conn.execute(
          `UPDATE agents SET status = 'suspended', updated_at = SYSTIMESTAMP WHERE id = :agentId`,
          { agentId }
        );
      });

      await auditLog({
        traceId, actorId: req.user.id, agentId,
        eventType: 'AGENT_ISOLATED', resourceType: 'agent', resourceId: agentId,
        decision: 'ISOLATE',
        evidence: { toolName, riskScore, threatTypes, ragThreats, memoryThreats },
      });

      return res.status(200).json({
        success: true,
        result: {
          actionId, traceId, finalDecision: 'ISOLATE',
          riskScore, severity: 'critical',
          modelRecommendation: modelRec,
          policyDecision: 'ISOLATE',
          toolExecuted: false,
          blockReason: 'Critical multi-signal security violation (R* > 80). Agent quarantined and session isolated.',
          explanation: 'AgentShield AI quarantined this agent. All tool execution suspended pending security analyst review.',
          evaluations,
          chainDetections,
          signals: fiveSignals.signals,
          weightedRisk: fiveSignals.weightedRisk,
          dominantSafeguard: fiveSignals.dominantSafeguard,
          effectiveRisk: fiveSignals.effectiveRisk,
          dominantTriggered: fiveSignals.dominantTriggered,
          agentQuarantined: true,
        },
      });
    }

    // ── 9. Persist action record for non-isolated runs ─────────
    await transaction(async (conn) => {
      await conn.execute(
        `INSERT INTO agent_actions
           (id, agent_id, trace_id, tool_name, arguments_redacted, arguments_hash,
            risk_score, status, execution_started_at)
         VALUES
           (:id, :agentId, :traceId, :toolName, :argsRedacted, :argsHash,
            :riskScore, :status, SYSTIMESTAMP)`,
        {
          id:          actionId,
          agentId,
          traceId,
          toolName,
          argsRedacted,
          argsHash,
          riskScore,
          status:      finalDecision === 'ALLOW' ? 'allowed'
                     : (finalDecision === 'REQUIRE_APPROVAL' || finalDecision === 'CONFIRM') ? 'require_approval'
                     : 'blocked',
        }
      );

      // Persist policy evaluations
      for (const ev of evaluations) {
        await conn.execute(
          `INSERT INTO policy_evaluations (id, action_id, check_name, outcome, evidence_redacted)
           VALUES (:id, :actionId, :checkName, :outcome, :evidence)`,
          {
            id:        crypto.randomUUID(),
            actionId,
            checkName: ev.check,
            outcome:   ev.outcome,
            evidence:  ev.reason,
          }
        );
      }
    });

    // ── 10. BLOCK path ─────────────────────────────────────────
    if (finalDecision === 'BLOCK') {
      await auditLog({
        traceId, actorId: req.user.id, agentId,
        eventType: 'ACTION_BLOCKED', resourceType: 'agent_action', resourceId: actionId,
        decision: 'BLOCK',
        evidence: { toolName, riskScore, threatTypes, evaluations, signals: fiveSignals.signals },
      });

      const blockReason = evaluations.find(e => e.outcome === 'fail')?.reason || (isDenied ? 'Least-privilege permission denied for tool' : 'Policy violation');

      return res.status(200).json({
        success: true,
        result: {
          actionId, traceId, finalDecision: 'BLOCK',
          riskScore, severity,
          modelRecommendation: modelRec,
          policyDecision,
          toolExecuted: false,
          blockReason,
          explanation: `Blocked: ${blockReason}`,
          evaluations,
          chainDetections,
          signals: fiveSignals.signals,
          weightedRisk: fiveSignals.weightedRisk,
          dominantSafeguard: fiveSignals.dominantSafeguard,
          effectiveRisk: fiveSignals.effectiveRisk,
          dominantTriggered: fiveSignals.dominantTriggered,
          sensitiveDataFound: sensitiveFindings.length > 0,
        },
      });
    }

    // ── 11. REQUIRE_APPROVAL / CONFIRM path ────────────────────
    if (finalDecision === 'REQUIRE_APPROVAL' || finalDecision === 'CONFIRM') {
      const approvalId  = crypto.randomUUID();
      const expiresAt   = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
      await transaction(async (conn) => {
        await conn.execute(
          `INSERT INTO approval_requests (id, action_id, requested_by, status, action_hash, expires_at)
           VALUES (:id, :actionId, :userId, 'pending', :hash, :expires)`,
          { id: approvalId, actionId, userId: req.user.id, hash: argsHash, expires: expiresAt }
        );
      });

      await auditLog({
        traceId, actorId: req.user.id, agentId,
        eventType: 'APPROVAL_REQUESTED', resourceType: 'approval', resourceId: approvalId,
        decision: 'REQUIRE_APPROVAL',
      });

      return res.status(200).json({
        success: true,
        result: {
          actionId, traceId, finalDecision: 'REQUIRE_APPROVAL',
          approvalId, expiresAt,
          riskScore, severity,
          modelRecommendation: modelRec,
          policyDecision,
          toolExecuted: false,
          explanation: evaluations.find(e => e.outcome === 'requires_approval')?.reason || 'Requires human approval',
          evaluations,
          signals: fiveSignals.signals,
          weightedRisk: fiveSignals.weightedRisk,
          dominantSafeguard: fiveSignals.dominantSafeguard,
          effectiveRisk: fiveSignals.effectiveRisk,
          dominantTriggered: fiveSignals.dominantTriggered,
        },
      });
    }

    // ── 12. ALLOW path — execute sandboxed tool ────────────────
    let toolResult;
    let execStatus = 'completed';
    try {
      toolResult = await tool.execute(toolArgs);
    } catch (execErr) {
      execStatus = 'failed';
      toolResult = { error: execErr.message };
    }

    await transaction(async (conn) => {
      await conn.execute(
        `UPDATE agent_actions
         SET status = :status, execution_result = :result, execution_completed_at = SYSTIMESTAMP
         WHERE id = :id`,
        { status: execStatus, result: JSON.stringify(toolResult), id: actionId }
      );
    });

    await auditLog({
      traceId, actorId: req.user.id, agentId,
      eventType: 'ACTION_EXECUTED', resourceType: 'agent_action', resourceId: actionId,
      decision: 'ALLOW',
      evidence: { toolName, execStatus, signals: fiveSignals.signals },
    });

    res.json({
      success: true,
      result: {
        actionId, traceId, finalDecision: 'ALLOW',
        riskScore, severity,
        modelRecommendation: modelRec,
        policyDecision,
        toolExecuted: true,
        toolResult,
        evaluations,
        chainDetections,
        signals: fiveSignals.signals,
        weightedRisk: fiveSignals.weightedRisk,
        dominantSafeguard: fiveSignals.dominantSafeguard,
        effectiveRisk: fiveSignals.effectiveRisk,
        dominantTriggered: fiveSignals.dominantTriggered,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/sandbox/runs/:id
router.get('/runs/:id', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT aa.*, ap.tool_name AS perm_tool FROM agent_actions aa
       LEFT JOIN agents a ON aa.agent_id = a.id
       WHERE aa.id = :id AND a.owner_id = :ownerId`,
      { id: req.params.id, ownerId: req.user.id }
    );
    if (result.rows.length === 0) return next(new AppError('Run not found', 404));
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
});

export default router;
