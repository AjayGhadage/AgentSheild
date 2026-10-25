import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { query } from '../config/db.js';
import { verifyChain } from '../services/audit.service.js';

const router = Router();
router.use(authenticate);

// GET /api/v1/audit
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, eventType, actorId } = req.query;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Number(limit));
    const offset = (pageNum - 1) * limitNum;
    const maxRow = offset + limitNum;
    const binds = { offset, maxRow };
    const where = [];
    if (eventType) { where.push('event_type = :eventType'); binds.eventType = eventType; }
    if (actorId)   { where.push('actor_id = :actorId');    binds.actorId   = actorId; }
    const whereStr = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const result = await query(
      `SELECT * FROM (
         SELECT a.*, ROWNUM rnum FROM (
           SELECT id, event_id, trace_id, actor_id, agent_id, event_type,
                  resource_type, resource_id, decision, previous_hash, record_hash, created_at
           FROM audit_logs ${whereStr}
           ORDER BY created_at DESC
         ) a WHERE ROWNUM <= :maxRow
       ) WHERE rnum > :offset`,
      binds
    );
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
});

// GET /api/v1/audit/:id
router.get('/:id', async (req, res, next) => {
  try {
    const result = await query(`SELECT * FROM audit_logs WHERE id = :id`, { id: req.params.id });
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, record: result.rows[0] });
  } catch (err) { next(err); }
});

// POST /api/v1/audit/verify
router.post('/verify', async (req, res, next) => {
  try {
    const verification = await verifyChain();
    res.json({ success: true, verification });
  } catch (err) { next(err); }
});

export default router;
