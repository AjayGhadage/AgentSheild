import { Router } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { validate } from '../middleware/validate.middleware.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { query, transaction } from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';
import { auditLog } from '../services/audit.service.js';

const router = Router();
router.use(authenticate);

const PolicySchema = z.object({
  name:          z.string().min(2).max(120),
  description:   z.string().max(1000).optional(),
  policy_type:   z.enum(['tool_access', 'data_protection', 'approval', 'rate_limit']),
  configuration: z.record(z.unknown()),
  enabled:       z.boolean().default(true),
});

// GET /api/v1/policies
router.get('/', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, name, description, policy_type, enabled, version_num, created_at FROM security_policies ORDER BY created_at DESC`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
});

// POST /api/v1/policies
router.post('/', requireRole('admin'), validate(PolicySchema), async (req, res, next) => {
  const { name, description, policy_type, configuration, enabled } = req.body;
  const policyId = crypto.randomUUID();
  try {
    await transaction(async (conn) => {
      await conn.execute(
        `INSERT INTO security_policies (id, name, description, policy_type, configuration, enabled, created_by)
         VALUES (:id, :name, :pDesc, :pType, :config, :enabled, :creator)`,
        { id: policyId, name, pDesc: description || null, pType: policy_type, config: JSON.stringify(configuration), enabled: enabled ? 1 : 0, creator: req.user.id }
      );
      // Create first version snapshot
      await conn.execute(
        `INSERT INTO policy_versions (id, policy_id, version_number, configuration_snapshot, created_by)
         VALUES (:id, :policyId, 1, :snap, :creator)`,
        { id: crypto.randomUUID(), policyId, snap: JSON.stringify(configuration), creator: req.user.id }
      );
    });
    await auditLog({ actorId: req.user.id, eventType: 'POLICY_CREATED', resourceType: 'policy', resourceId: policyId, decision: 'ALLOW' });
    res.status(201).json({ success: true, policyId });
  } catch (err) { next(err); }
});

// GET /api/v1/policies/:id
router.get('/:id', async (req, res, next) => {
  try {
    const result = await query(`SELECT * FROM security_policies WHERE id = :id`, { id: req.params.id });
    if (result.rows.length === 0) return next(new AppError('Policy not found', 404));
    res.json({ success: true, policy: result.rows[0] });
  } catch (err) { next(err); }
});

// PATCH /api/v1/policies/:id
router.patch('/:id', requireRole('admin'), validate(PolicySchema.partial()), async (req, res, next) => {
  try {
    const pol = await query(`SELECT * FROM security_policies WHERE id = :id`, { id: req.params.id });
    if (pol.rows.length === 0) return next(new AppError('Not found', 404));
    const { configuration } = req.body;
    const newVersion = Number(pol.rows[0].VERSION_NUM || 1) + 1;
    await transaction(async (conn) => {
      await conn.execute(
        `UPDATE security_policies SET version_num = :v, updated_at = SYSTIMESTAMP WHERE id = :id`,
        { v: newVersion, id: req.params.id }
      );
      if (configuration) {
        await conn.execute(
          `INSERT INTO policy_versions (id, policy_id, version_number, configuration_snapshot, created_by)
           VALUES (:id, :pId, :vn, :snap, :creator)`,
          { id: crypto.randomUUID(), pId: req.params.id, vn: newVersion, snap: JSON.stringify(configuration), creator: req.user.id }
        );
      }
    });
    res.json({ success: true, message: 'Policy updated.' });
  } catch (err) { next(err); }
});

// GET /api/v1/policies/:id/versions
router.get('/:id/versions', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, version_number, created_by, created_at FROM policy_versions WHERE policy_id = :id ORDER BY version_number DESC`,
      { id: req.params.id }
    );
    res.json({ success: true, versions: result.rows });
  } catch (err) { next(err); }
});

// POST /api/v1/policies/simulate — What-if policy comparison
router.post('/simulate', requireRole('admin'), async (req, res, next) => {
  try {
    const { baseConfiguration, proposedConfiguration, testCases = [] } = req.body;
    const { evaluatePolicy, deriveDecision } = await import('../services/policy.service.js');

    const results = testCases.map((tc) => {
      const baseEvals      = evaluatePolicy({ action: tc.action, agentPermissions: tc.permissions || [], policy: baseConfiguration, riskScore: tc.riskScore || 0 });
      const proposedEvals  = evaluatePolicy({ action: tc.action, agentPermissions: tc.permissions || [], policy: proposedConfiguration, riskScore: tc.riskScore || 0 });
      const baseDecision     = deriveDecision(baseEvals);
      const proposedDecision = deriveDecision(proposedEvals);

      return {
        caseId:          tc.id,
        label:           tc.label,
        baseDecision,
        proposedDecision,
        changed:         baseDecision !== proposedDecision,
        newlyBlocked:    baseDecision !== 'BLOCK' && proposedDecision === 'BLOCK',
        newlyPermitted:  baseDecision === 'BLOCK' && proposedDecision !== 'BLOCK',
      };
    });

    res.json({ success: true, simulation: { results, changedCount: results.filter(r => r.changed).length } });
  } catch (err) { next(err); }
});

export default router;
