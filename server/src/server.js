import 'dotenv/config';
import app from './app.js';
import { initializePool, closePool } from './config/db.js';

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Initialize Oracle connection pool first
    await initializePool();
    console.log('[BOOT] Oracle connection pool ready');

    const server = app.listen(PORT, () => {
      console.log(`[BOOT] AgentShield API running on http://localhost:${PORT}`);
      console.log(`[BOOT] Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`[BOOT] API prefix:  /api/v1`);
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      console.log(`\n[BOOT] Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        await closePool().catch(console.error);
        console.log('[BOOT] Server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));

  } catch (err) {
    console.error('[BOOT] Failed to start server:', err.message);
    process.exit(1);
  }
}

startServer();
