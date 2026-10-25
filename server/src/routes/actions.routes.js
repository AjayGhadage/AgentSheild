import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { query } from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();
router.use(authenticate);

// GET /api/v1/agent-actions
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, agentId, risk } = req.query;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(50, Number(limit));
    const offset = (pageNum - 1) * limitNum;
    const maxRow = offset + limitNum;

    let whereClauses = ['a.owner_id = :ownerId'];
    const binds = { ownerId: req.user.id, offset, maxRow };

    if (status)  { whereClauses.push('aa.status = :status');  binds.status  = status; }
    if (agentId) { whereClauses.push('aa.agent_id = :agId'); binds.agId   = agentId; }
    if (risk === 'high')     whereClauses.push('aa.risk_score >= 60');
    if (risk === 'critical') whereClauses.push('aa.risk_score >= 80');
    if (risk === 'medium')   whereClauses.push('aa.risk_score BETWEEN 30 AND 59');
    if (risk === 'low')      whereClauses.push('aa.risk_score < 30');

    const where = whereClauses.join(' AND ');

    const result = await query(
      `SELECT * FROM (
         SELECT q.*, ROWNUM rnum FROM (
           SELECT aa.id, aa.tool_name, aa.status, aa.risk_score, aa.created_at,
                  a.name AS agent_name, aa.trace_id
           FROM agent_actions aa
           JOIN agents a ON aa.agent_id = a.id
           WHERE ${where}
           ORDER BY aa.created_at DESC
         ) q WHERE ROWNUM <= :maxRow
       ) WHERE rnum > :offset`,
      binds
    );

    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
});

// GET /api/v1/agent-actions/:id
router.get('/:id', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT aa.*, a.name AS agent_name, a.owner_id
       FROM agent_actions aa
       JOIN agents a ON aa.agent_id = a.id
       WHERE aa.id = :id AND a.owner_id = :ownerId`,
      { id: req.params.id, ownerId: req.user.id }
    );
    if (result.rows.length === 0) return next(new AppError('Action not found', 404));

    const evals = await query(
      `SELECT check_name, outcome, evidence_redacted FROM policy_evaluations WHERE action_id = :id`,
      { id: req.params.id }
    );

    res.json({ success: true, action: result.rows[0], evaluations: evals.rows });
  } catch (err) { next(err); }
});

export default router;
