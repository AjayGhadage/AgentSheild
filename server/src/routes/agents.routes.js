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

const AgentSchema = z.object({
  name:          z.string().min(2).max(120),
  description:   z.string().max(1000).optional(),
  configuration: z.record(z.unknown()).optional(),
  status:        z.enum(['active', 'inactive', 'suspended']).optional(),
});

// GET /api/v1/agents
router.get('/', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, owner_id, name, description, status, created_at
       FROM agents WHERE owner_id = :ownerId ORDER BY created_at DESC`,
      { ownerId: req.user.id }
    );
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
});

// POST /api/v1/agents
router.post('/', validate(AgentSchema), async (req, res, next) => {
  const { name, description, configuration } = req.body;
  const newId = crypto.randomUUID();
  try {
    await transaction(async (conn) => {
      await conn.execute(
        `INSERT INTO agents (id, owner_id, name, description, configuration, status)
         VALUES (:id, :ownerId, :name, :aDesc, :config, 'active')`,
        {
          id:      newId,
          ownerId: req.user.id,
          name,
          aDesc:   description || null,
          config:  configuration ? JSON.stringify(configuration) : null,
        }
      );
      // Default safe permissions
      await conn.execute(
        `INSERT INTO agent_permissions (id, agent_id, tool_name, allowed)
         VALUES (:id, :agentId, 'read_public_document', 1)`,
        { id: crypto.randomUUID(), agentId: newId }
      );
    });

    await auditLog({ actorId: req.user.id, eventType: 'AGENT_CREATED', resourceType: 'agent', resourceId: newId, decision: 'ALLOW' });

    res.status(201).json({ success: true, agent: { id: newId, name, description } });
  } catch (err) { next(err); }
});

// GET /api/v1/agents/:id
router.get('/:id', async (req, res, next) => {
  try {
    const [agentRes, permRes] = await Promise.all([
      query(`SELECT * FROM agents WHERE id = :id AND owner_id = :ownerId`, { id: req.params.id, ownerId: req.user.id }),
      query(`SELECT tool_name, permission_scope, allowed FROM agent_permissions WHERE agent_id = :id`, { id: req.params.id }),
    ]);
    if (agentRes.rows.length === 0) return next(new AppError('Agent not found', 404));
    const a = agentRes.rows[0];
    res.json({
      success: true,
      agent: {
        id: a.ID, ownerId: a.OWNER_ID, name: a.NAME, description: a.DESCRIPTION,
        status: a.STATUS, createdAt: a.CREATED_AT,
        permissions: permRes.rows,
      },
    });
  } catch (err) { next(err); }
});

// PATCH /api/v1/agents/:id
router.patch('/:id', validate(AgentSchema.partial()), async (req, res, next) => {
  try {
    const check = await query(`SELECT id FROM agents WHERE id = :id AND owner_id = :ownerId`, { id: req.params.id, ownerId: req.user.id });
    if (check.rows.length === 0) return next(new AppError('Agent not found', 404));

    const { name, description, configuration, status } = req.body;
    await transaction(async (conn) => {
      if (name)        await conn.execute(`UPDATE agents SET name = :v, updated_at = SYSTIMESTAMP WHERE id = :id`, { v: name,        id: req.params.id });
      if (description) await conn.execute(`UPDATE agents SET description = :v, updated_at = SYSTIMESTAMP WHERE id = :id`, { v: description, id: req.params.id });
      if (configuration) await conn.execute(`UPDATE agents SET configuration = :v, updated_at = SYSTIMESTAMP WHERE id = :id`, { v: JSON.stringify(configuration), id: req.params.id });
      if (status)      await conn.execute(`UPDATE agents SET status = :v, updated_at = SYSTIMESTAMP WHERE id = :id`, { v: status, id: req.params.id });
    });

    res.json({ success: true, message: 'Agent updated.' });
  } catch (err) { next(err); }
});

// GET /api/v1/agents/:id/actions
router.get('/:id/actions', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT * FROM (
         SELECT id, tool_name, status, risk_score, created_at
         FROM agent_actions WHERE agent_id = :id
         ORDER BY created_at DESC
       ) WHERE ROWNUM <= 50`,
      { id: req.params.id }
    );
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
});

export default router;
