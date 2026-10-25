import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { query, transaction } from '../config/db.js';
import { validate } from '../middleware/validate.middleware.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { AppError } from '../middleware/errorHandler.js';
import { auditLog } from '../services/audit.service.js';
import crypto from 'crypto';

const router = Router();

const RegisterSchema = z.object({
  name:     z.string().min(2).max(120),
  email:    z.string().email(),
  password: z.string().min(8).max(128),
  role:     z.enum(['user', 'reviewer']).default('user'),
});

const LoginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
}

const GoogleAuthSchema = z.object({
  email:    z.string().email(),
  name:     z.string().min(1),
  googleId: z.string().optional(),
  avatar:   z.string().optional(),
});

// POST /api/v1/auth/google — Enterprise Google OAuth
router.post('/google', validate(GoogleAuthSchema), async (req, res, next) => {
  const { email, name, googleId } = req.body;
  try {
    let result = await query(
      `SELECT id, name, email, role, status FROM users WHERE email = :email`,
      { email }
    );
    let user;

    if (result.rows.length === 0) {
      const newId = crypto.randomUUID();
      const dummyHash = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 12);
      await transaction(async (conn) => {
        await conn.execute(
          `INSERT INTO users (id, name, email, password_hash, role, status)
           VALUES (:id, :name, :email, :hash, 'user', 'active')`,
          { id: newId, name, email, hash: dummyHash }
        );
      });
      user = { id: newId, name, email, role: 'user' };

      await auditLog({
        eventType: 'USER_REGISTERED_GOOGLE',
        actorId: newId,
        resourceType: 'user',
        resourceId: newId,
        decision: 'ALLOW',
      });
    } else {
      user = {
        id: result.rows[0].ID,
        name: result.rows[0].NAME,
        email: result.rows[0].EMAIL,
        role: result.rows[0].ROLE,
      };
    }

    const token = signToken({ id: user.id, email: user.email, role: user.role });

    await auditLog({
      eventType: 'USER_LOGIN_GOOGLE',
      actorId: user.id,
      resourceType: 'user',
      resourceId: user.id,
      decision: 'ALLOW',
    });

    res.json({
      success: true,
      token,
      user,
      authMethod: 'google_oauth2',
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/auth/register
router.post('/register', validate(RegisterSchema), async (req, res, next) => {
  const { name, email, password, role } = req.body;
  try {
    // Check uniqueness
    const existing = await query(
      `SELECT id FROM users WHERE email = :email`,
      { email }
    );
    if (existing.rows.length > 0) {
      return next(new AppError('An account with this email already exists.', 409));
    }

    const hash = await bcrypt.hash(password, 12);
    const newId = crypto.randomUUID();

    await transaction(async (conn) => {
      await conn.execute(
        `INSERT INTO users (id, name, email, password_hash, role, status)
         VALUES (:id, :name, :email, :hash, :role, 'active')`,
        { id: newId, name, email, hash, role }
      );
    });

    const token = signToken({ id: newId, email, role });

    await auditLog({
      eventType: 'USER_REGISTERED',
      actorId:   newId,
      resourceType: 'user',
      resourceId:   newId,
      decision:  'ALLOW',
    });

    res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      token,
      user: { id: newId, name, email, role },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/auth/login
router.post('/login', validate(LoginSchema), async (req, res, next) => {
  const { email, password } = req.body;
  try {
    const result = await query(
      `SELECT id, name, email, password_hash, role, status FROM users WHERE email = :email`,
      { email }
    );
    if (result.rows.length === 0) {
      return next(new AppError('Invalid email or password.', 401));
    }

    const user = result.rows[0];
    if (user.STATUS !== 'active') {
      return next(new AppError('Account is suspended.', 403));
    }

    const valid = await bcrypt.compare(password, user.PASSWORD_HASH);
    if (!valid) {
      return next(new AppError('Invalid email or password.', 401));
    }

    const token = signToken({ id: user.ID, email: user.EMAIL, role: user.ROLE });

    await auditLog({
      eventType:    'USER_LOGIN',
      actorId:      user.ID,
      resourceType: 'user',
      resourceId:   user.ID,
      decision:     'ALLOW',
    });

    res.json({
      success: true,
      token,
      user: { id: user.ID, name: user.NAME, email: user.EMAIL, role: user.ROLE },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/auth/logout
router.post('/logout', authenticate, async (req, res) => {
  // JWT is stateless — client discards token. Log the event.
  await auditLog({
    eventType:    'USER_LOGOUT',
    actorId:      req.user.id,
    resourceType: 'user',
    resourceId:   req.user.id,
    decision:     'ALLOW',
  }).catch(() => {});
  res.json({ success: true, message: 'Logged out.' });
});

// GET /api/v1/auth/me
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, name, email, role, status, created_at FROM users WHERE id = :id`,
      { id: req.user.id }
    );
    if (result.rows.length === 0) return next(new AppError('User not found.', 404));
    const u = result.rows[0];
    res.json({
      success: true,
      user: {
        id:        u.ID,
        name:      u.NAME,
        email:     u.EMAIL,
        role:      u.ROLE,
        status:    u.STATUS,
        createdAt: u.CREATED_AT,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
