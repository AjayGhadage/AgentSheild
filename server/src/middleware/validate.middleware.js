import { AppError } from './errorHandler.js';

/**
 * validate(schema) — Zod schema validation middleware.
 * Validates req.body against the provided Zod schema.
 */
export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = result.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return next(new AppError('Validation failed', 400, details));
    }
    req.body = result.data;
    next();
  };
}

/**
 * validateQuery(schema) — validates req.query
 */
export function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const details = result.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return next(new AppError('Invalid query parameters', 400, details));
    }
    req.query = result.data;
    next();
  };
}
