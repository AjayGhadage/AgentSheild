import { Router } from 'express';
import { testDatabaseConnection } from '../config/db.js';

const router = Router();

// GET /api/v1/health
router.get('/', async (req, res) => {
  const start = Date.now();
  let dbStatus = 'ok';
  let dbInfo   = null;

  try {
    dbInfo = await testDatabaseConnection();
  } catch (err) {
    dbStatus = 'error';
    console.error('[HEALTH] DB check failed:', err.message);
  }

  res.status(dbStatus === 'ok' ? 200 : 503).json({
    success: dbStatus === 'ok',
    service: 'AgentShield API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    latencyMs: Date.now() - start,
    checks: {
      database: {
        status: dbStatus,
        type: 'Oracle',
        ...(dbInfo ? { user: dbInfo.username, serverTime: dbInfo.serverTime } : {}),
      },
    },
  });
});

export default router;
