import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import 'dotenv/config';

// ── Route Imports ──────────────────────────────────────────
import healthRoutes   from './routes/health.routes.js';
import authRoutes     from './routes/auth.routes.js';
import agentRoutes    from './routes/agents.routes.js';
import scanRoutes     from './routes/security.routes.js';
import sandboxRoutes  from './routes/sandbox.routes.js';
import actionRoutes   from './routes/actions.routes.js';
import policyRoutes   from './routes/policies.routes.js';
import approvalRoutes from './routes/approvals.routes.js';
import incidentRoutes from './routes/incidents.routes.js';
import auditRoutes    from './routes/audit.routes.js';
import evalRoutes     from './routes/evaluation.routes.js';
import dashRoutes     from './routes/dashboard.routes.js';

// ── Middleware Imports ─────────────────────────────────────
import { errorHandler }   from './middleware/errorHandler.js';
import { requestLogger }  from './middleware/requestLogger.js';

const app = express();

// ── Security Headers ───────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// ── CORS ───────────────────────────────────────────────────
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',');
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not permitted`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Body Parsing ──────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ── Global Rate Limiter ───────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests. Please try again later.' },
});
app.use(globalLimiter);

// ── Strict limiter for AI scan (expensive endpoint) ───────
const scanLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { success: false, error: 'Scan rate limit reached. Please wait a moment.' },
});

// ── Request Logger ────────────────────────────────────────
app.use(requestLogger);

// ── Routes ────────────────────────────────────────────────
const v1 = '/api/v1';

app.use(`${v1}/health`,        healthRoutes);
app.use(`${v1}/auth`,          authRoutes);
app.use(`${v1}/dashboard`,     dashRoutes);
app.use(`${v1}/security`,      scanLimiter, scanRoutes);
app.use(`${v1}/agents`,        agentRoutes);
app.use(`${v1}/sandbox`,       sandboxRoutes);
app.use(`${v1}/agent-actions`, actionRoutes);
app.use(`${v1}/policies`,      policyRoutes);
app.use(`${v1}/approvals`,     approvalRoutes);
app.use(`${v1}/incidents`,     incidentRoutes);
app.use(`${v1}/audit`,         auditRoutes);
app.use(`${v1}/evaluation`,    evalRoutes);

// ── 404 Handler ───────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route ${req.method} ${req.path} not found` });
});

// ── Centralized Error Handler ─────────────────────────────
app.use(errorHandler);

export default app;
