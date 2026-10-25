/**
 * Structured request logger — avoids logging sensitive body fields.
 */
const REDACT_FIELDS = new Set(['password', 'password_hash', 'token', 'apiKey', 'api_key', 'secret']);

function redactBody(body) {
  if (!body || typeof body !== 'object') return body;
  const safe = { ...body };
  for (const key of Object.keys(safe)) {
    if (REDACT_FIELDS.has(key)) safe[key] = '[REDACTED]';
  }
  return safe;
}

export function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const level = res.statusCode >= 500 ? 'ERROR' : res.statusCode >= 400 ? 'WARN' : 'INFO';
    console.log(`[${level}] ${req.method} ${req.path} ${res.statusCode} (${ms}ms)`);
  });
  next();
}
