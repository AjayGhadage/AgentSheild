import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { query } from '../config/db.js';

const router = Router();
router.use(authenticate);

// GET /api/v1/dashboard/overview
router.get('/overview', async (req, res, next) => {
  try {
    const [scans, actions, incidents, pending] = await Promise.all([
      query(`SELECT COUNT(*) AS "total",
                    SUM(CASE WHEN severity='critical' THEN 1 ELSE 0 END) AS "critical",
                    SUM(CASE WHEN severity='high'     THEN 1 ELSE 0 END) AS "high",
                    SUM(CASE WHEN severity='medium'   THEN 1 ELSE 0 END) AS "medium",
                    SUM(CASE WHEN severity='low'      THEN 1 ELSE 0 END) AS "low"
             FROM security_scans WHERE user_id = :userId`, { userId: req.user.id }),
      query(`SELECT COUNT(*) AS "total",
                    SUM(CASE WHEN aa.status='blocked'  THEN 1 ELSE 0 END) AS "blocked",
                    SUM(CASE WHEN aa.status='allowed'  THEN 1 ELSE 0 END) AS "allowed"
             FROM agent_actions aa
             JOIN agents a ON aa.agent_id = a.id
             WHERE a.owner_id = :userId`, { userId: req.user.id }),
      query(`SELECT COUNT(*) AS "total",
                    SUM(CASE WHEN status='open' THEN 1 ELSE 0 END) AS "open"
             FROM incidents`),
      query(`SELECT COUNT(*) AS "total" FROM approval_requests WHERE status='pending'`),
    ]);

    res.json({
      success: true,
      overview: {
        scans:     scans.rows[0],
        actions:   actions.rows[0],
        incidents: incidents.rows[0],
        pendingApprovals: pending.rows[0].total,
      },
    });
  } catch (err) { next(err); }
});

// GET /api/v1/dashboard/activity
router.get('/activity', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT * FROM (
         SELECT al.event_type, al.decision, al.created_at, al.resource_type
         FROM audit_logs al
         ORDER BY al.created_at DESC
       ) WHERE ROWNUM <= 10`
    );
    res.json({ success: true, activity: result.rows });
  } catch (err) { next(err); }
});

// GET /api/v1/dashboard/trends
router.get('/trends', async (req, res, next) => {
  try {
    // Last 7 days scan counts grouped by day
    const result = await query(
      `SELECT TRUNC(created_at) AS "day",
              COUNT(*) AS "total",
              SUM(CASE WHEN severity IN ('high','critical') THEN 1 ELSE 0 END) AS "threats"
       FROM security_scans
       WHERE user_id = :userId
         AND created_at >= SYSTIMESTAMP - INTERVAL '7' DAY
       GROUP BY TRUNC(created_at)
       ORDER BY TRUNC(created_at) ASC`,
      { userId: req.user.id }
    );
    res.json({ success: true, trends: result.rows });
  } catch (err) { next(err); }
});

export default router;
