import { Router } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { validate } from '../middleware/validate.middleware.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { query, transaction } from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';
import { auditLog } from '../services/audit.service.js';
import { getTool } from '../services/sandbox-tools.js';
import { evaluatePolicy, deriveDecision } from '../services/policy.service.js';

const router = Router();
router.use(authenticate);

// GET /api/v1/approvals
router.get('/', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT * FROM (
         SELECT ar.id, ar.status, ar.expires_at, ar.created_at,
                 aa.tool_name, aa.arguments_redacted, aa.risk_score, aa.agent_id,
                 a.name AS agent_name
         FROM approval_requests ar
         JOIN agent_actions aa ON ar.action_id = aa.id
         JOIN agents a ON aa.agent_id = a.id
         WHERE a.owner_id = :ownerId OR :role IN ('admin','reviewer')
         ORDER BY ar.created_at DESC
       ) WHERE ROWNUM <= 50`,
      { ownerId: req.user.id, role: req.user.role }
    );
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
});

// POST /api/v1/approvals/:id/approve
router.post('/:id/approve', requireRole('admin', 'reviewer'), async (req, res, next) => {
  const { id } = req.params;
  const { reason = '' } = req.body;

  try {
    const arRes = await query(
      `SELECT ar.*, aa.arguments_hash, aa.tool_name, aa.agent_id, aa.arguments_redacted
       FROM approval_requests ar
       JOIN agent_actions aa ON ar.action_id = aa.id
       WHERE ar.id = :id`,
      { id }
    );
    if (arRes.rows.length === 0) return next(new AppError('Approval request not found', 404));
    const ar = arRes.rows[0];

    if (ar.STATUS !== 'pending')     return next(new AppError('Request is no longer pending', 409));
    if (new Date(ar.EXPIRES_AT) < new Date()) {
      await transaction(async conn => {
        await conn.execute(`UPDATE approval_requests SET status = 'expired' WHERE id = :id`, { id });
      });
      return next(new AppError('Approval request has expired', 410));
    }

    // Re-validate permissions before executing
    const permRes = await query(
      `SELECT tool_name, allowed FROM agent_permissions WHERE agent_id = :agId`,
      { agId: ar.AGENT_ID }
    );
    const reEval   = evaluatePolicy({ action: { toolName: ar.TOOL_NAME }, agentPermissions: permRes.rows, riskScore: 0 });
    const reDecision = deriveDecision(reEval);
    if (reDecision === 'BLOCK') {
      return next(new AppError('Action is now blocked by policy — approval cannot proceed.', 403));
    }

    // Execute sandboxed tool
    const tool  = getTool(ar.TOOL_NAME);
    let toolResult = { note: 'Tool not registered' };
    if (tool) {
      try {
        const args = JSON.parse(ar.ARGUMENTS_REDACTED || '{}');
        toolResult = await tool.execute(args);
      } catch (e) {
        toolResult = { error: e.message };
      }
    }

    await transaction(async (conn) => {
      await conn.execute(
        `UPDATE approval_requests
         SET status = 'approved', reviewed_by = :rev, reviewed_at = SYSTIMESTAMP, reason = :reason
         WHERE id = :id`,
        { rev: req.user.id, reason, id }
      );
      await conn.execute(
        `UPDATE agent_actions SET status = 'completed', execution_result = :result, execution_completed_at = SYSTIMESTAMP
         WHERE id = :actionId`,
        { result: JSON.stringify(toolResult), actionId: ar.ACTION_ID }
      );
    });

    await auditLog({
      actorId: req.user.id, agentId: ar.AGENT_ID,
      eventType: 'ACTION_APPROVED_AND_EXECUTED', resourceType: 'approval', resourceId: id,
      decision: 'ALLOW', evidence: { toolName: ar.TOOL_NAME, reviewer: req.user.email },
    });

    res.json({ success: true, message: 'Approved and executed.', toolResult });
  } catch (err) { next(err); }
});

// POST /api/v1/approvals/:id/reject
router.post('/:id/reject', requireRole('admin', 'reviewer'), async (req, res, next) => {
  const { id } = req.params;
  const { reason = '' } = req.body;

  try {
    const arRes = await query(`SELECT * FROM approval_requests WHERE id = :id`, { id });
    if (arRes.rows.length === 0) return next(new AppError('Not found', 404));
    if (arRes.rows[0].STATUS !== 'pending') return next(new AppError('Not pending', 409));

    await transaction(async (conn) => {
      await conn.execute(
        `UPDATE approval_requests SET status = 'rejected', reviewed_by = :rev, reviewed_at = SYSTIMESTAMP, reason = :reason WHERE id = :id`,
        { rev: req.user.id, reason, id }
      );
      await conn.execute(
        `UPDATE agent_actions SET status = 'blocked' WHERE id = :actionId`,
        { actionId: arRes.rows[0].ACTION_ID }
      );
    });

    await auditLog({
      actorId: req.user.id, eventType: 'APPROVAL_REJECTED', resourceType: 'approval', resourceId: id,
      decision: 'BLOCK',
    });

    res.json({ success: true, message: 'Rejected.' });
  } catch (err) { next(err); }
});

export default router;
