import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { query, transaction } from '../config/db.js';
import { auditLog } from '../services/audit.service.js';
import { AppError } from '../middleware/errorHandler.js';
import { z } from 'zod';
import { validate } from '../middleware/validate.middleware.js';
import crypto from 'crypto';

const router = Router();
router.use(authenticate);

// GET /api/v1/incidents
router.get('/', async (req, res, next) => {
  try {
    const { status, severity, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(50, Number(limit));
    const offset = (pageNum - 1) * limitNum;
    const maxRow = offset + limitNum;
    const binds = { offset, maxRow };
    const where = [];
    if (status)   { where.push('status = :status');   binds.status   = status; }
    if (severity) { where.push('severity = :severity'); binds.severity = severity; }
    const whereStr = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const result = await query(
      `SELECT * FROM (
         SELECT a.*, ROWNUM rnum FROM (
           SELECT id, title, severity, status, agent_id, created_at, updated_at
           FROM incidents ${whereStr}
           ORDER BY created_at DESC
         ) a WHERE ROWNUM <= :maxRow
       ) WHERE rnum > :offset`,
      binds
    );
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
});

// GET /api/v1/incidents/:id
router.get('/:id', async (req, res, next) => {
  try {
    const inc = await query(`SELECT * FROM incidents WHERE id = :id`, { id: req.params.id });
    if (inc.rows.length === 0) return next(new AppError('Incident not found', 404));
    const events = await query(
      `SELECT id, event_type, event_data_redacted, created_at FROM incident_events WHERE incident_id = :id ORDER BY created_at ASC`,
      { id: req.params.id }
    );
    res.json({ success: true, incident: inc.rows[0], events: events.rows });
  } catch (err) { next(err); }
});

// PATCH /api/v1/incidents/:id
router.patch('/:id', requireRole('admin', 'reviewer'), validate(z.object({
  status: z.enum(['open','investigating','resolved']).optional(),
  notes:  z.string().max(2000).optional(),
})), async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    await transaction(async (conn) => {
      if (status) {
        const resolved = status === 'resolved' ? ', resolved_at = SYSTIMESTAMP' : '';
        await conn.execute(
          `UPDATE incidents SET status = :status, updated_at = SYSTIMESTAMP ${resolved} WHERE id = :id`,
          { status, id: req.params.id }
        );
      }
      if (notes) {
        await conn.execute(
          `INSERT INTO incident_events (id, incident_id, event_type, event_data_redacted)
           VALUES (:id, :incId, 'NOTE_ADDED', :notes)`,
          { id: crypto.randomUUID(), incId: req.params.id, notes }
        );
      }
    });
    await auditLog({ actorId: req.user.id, eventType: 'INCIDENT_UPDATED', resourceType: 'incident', resourceId: req.params.id, decision: status || 'update' });
    res.json({ success: true, message: 'Incident updated.' });
  } catch (err) { next(err); }
});

// GET /api/v1/incidents/:id/events
router.get('/:id/events', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT * FROM incident_events WHERE incident_id = :id ORDER BY created_at ASC`,
      { id: req.params.id }
    );
    res.json({ success: true, events: result.rows });
  } catch (err) { next(err); }
});

export default router;
