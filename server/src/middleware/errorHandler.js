/**
 * Centralized error handler — must be last middleware in Express.
 */
export function errorHandler(err, req, res, next) {
  const status = err.statusCode || err.status || 500;
  const isDev  = process.env.NODE_ENV === 'development';

  // Don't leak internal Oracle/stack details in production
  const message = status < 500 || isDev
    ? err.message || 'An error occurred'
    : 'Internal server error';

  console.error(`[ERROR] ${req.method} ${req.path} → ${status}: ${err.message}`);
  if (isDev && err.stack) console.error(err.stack);

  res.status(status).json({
    success: false,
    error: message,
    ...(isDev && err.details ? { details: err.details } : {}),
  });
}

/** Convenience factory for HTTP errors */
export class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details    = details;
    this.name       = 'AppError';
  }
}
