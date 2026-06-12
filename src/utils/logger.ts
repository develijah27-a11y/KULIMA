/**
 * Logging Utility
 * 
 * Provides structured logging with severity levels and context tracking.
 * Automatically sanitizes sensitive information from logs.
 * 
 * Requirements: 13.4, 13.5, 13.6
 */

/**
 * Log severity levels
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

/**
 * Request context for logging
 */
export interface LogContext {
  userId?: string;
  endpoint?: string;
  method?: string;
  timestamp?: string;
  requestId?: string;
  [key: string]: any;
}

/**
 * Sensitive data patterns to redact from logs
 */
const SENSITIVE_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /api[_-]?key/i,
  /service[_-]?role/i,
  /auth/i,
  /bearer/i,
  /credential/i,
  /private[_-]?key/i,
];

/**
 * Check if a key name indicates sensitive data
 */
function isSensitiveKey(key: string): boolean {
  return SENSITIVE_PATTERNS.some(pattern => pattern.test(key));
}

/**
 * Sanitize an object by redacting sensitive fields
 */
function sanitize(obj: any): any {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitize(item));
  }

  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (isSensitiveKey(key)) {
      sanitized[key] = '[REDACTED]';
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitize(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Format log message with context
 */
function formatLogMessage(
  level: LogLevel,
  message: string,
  context?: LogContext,
  data?: any
): string {
  const timestamp = context?.timestamp || new Date().toISOString();
  const logContext = context ? sanitize({ ...context, timestamp: undefined }) : {};
  
  const logEntry = {
    timestamp,
    level,
    message,
    ...(Object.keys(logContext).length > 0 && { context: logContext }),
    ...(data && { data: sanitize(data) }),
  };

  return JSON.stringify(logEntry);
}

/**
 * Log error message
 */
export function logError(
  message: string,
  context?: LogContext,
  error?: Error | any
): void {
  const errorData = error instanceof Error
    ? { name: error.name, message: error.message, stack: error.stack }
    : error;

  const formattedMessage = formatLogMessage(LogLevel.ERROR, message, context, errorData);
  console.error(formattedMessage);
}

/**
 * Log warning message
 */
export function logWarn(
  message: string,
  context?: LogContext,
  data?: any
): void {
  const formattedMessage = formatLogMessage(LogLevel.WARN, message, context, data);
  console.warn(formattedMessage);
}

/**
 * Log info message
 */
export function logInfo(
  message: string,
  context?: LogContext,
  data?: any
): void {
  const formattedMessage = formatLogMessage(LogLevel.INFO, message, context, data);
  console.info(formattedMessage);
}

/**
 * Log debug message
 */
export function logDebug(
  message: string,
  context?: LogContext,
  data?: any
): void {
  // Only log debug messages in development
  if (process.env.NODE_ENV === 'development') {
    const formattedMessage = formatLogMessage(LogLevel.DEBUG, message, context, data);
    console.debug(formattedMessage);
  }
}

/**
 * Generic log function with configurable level
 */
export function log(
  level: LogLevel,
  message: string,
  context?: LogContext,
  data?: any
): void {
  switch (level) {
    case LogLevel.ERROR:
      logError(message, context, data);
      break;
    case LogLevel.WARN:
      logWarn(message, context, data);
      break;
    case LogLevel.INFO:
      logInfo(message, context, data);
      break;
    case LogLevel.DEBUG:
      logDebug(message, context, data);
      break;
    default:
      logInfo(message, context, data);
  }
}

/**
 * Create a logger with preset context
 */
export function createLogger(defaultContext: LogContext) {
  return {
    error: (message: string, data?: any) =>
      logError(message, defaultContext, data),
    warn: (message: string, data?: any) =>
      logWarn(message, defaultContext, data),
    info: (message: string, data?: any) =>
      logInfo(message, defaultContext, data),
    debug: (message: string, data?: any) =>
      logDebug(message, defaultContext, data),
  };
}
