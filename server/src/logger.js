import { randomUUID } from 'crypto';

const REDACT_KEYS = ['token', 'secret', 'authorization', 'accessToken', 'accountNumber'];

function redactValue(value) {
  if (typeof value === 'string') {
    if (value.length > 12) return `${value.slice(0, 4)}***REDACTED***`;
    return '***REDACTED***';
  }
  if (typeof value === 'number') return '***REDACTED***';
  if (Array.isArray(value)) return value.map(redactValue);
  if (typeof value === 'object' && value !== null) return redactMeta(value);
  return value;
}

function redactMeta(meta) {
  if (meta === null || typeof meta !== 'object') return meta;
  const sanitized = Array.isArray(meta) ? [] : {};
  for (const [key, value] of Object.entries(meta)) {
    const lower = key.toLowerCase();
    if (REDACT_KEYS.some(k => lower.includes(k))) {
      sanitized[key] = redactValue(value);
    } else {
      sanitized[key] = typeof value === 'object' ? redactMeta(value) : value;
    }
  }
  return sanitized;
}

export function requestLogger(req, _res, next) {
  const correlationId = req.headers['x-correlation-id'] || randomUUID();
  req.correlationId = correlationId;
  req.requestTimestamp = Date.now();
  req.log = createLogger(correlationId);
  next();
}

function createLogger(correlationId) {
  const format = (level, message, meta = {}) =>
    JSON.stringify({ level, correlationId, message, ...redactMeta(meta) });
  return {
    info: (message, meta = {}) => console.log(format('info', message, meta)),
    warn: (message, meta = {}) => console.warn(format('warn', message, meta)),
    error: (message, meta = {}) => console.error(format('error', message, meta)),
  };
}

export const logger = createLogger('system');
