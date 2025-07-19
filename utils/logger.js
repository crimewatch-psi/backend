/**
 * Production-ready logging utility
 */

const isDevelopment = process.env.NODE_ENV !== 'production';

class Logger {
  static info(message, meta = {}) {
    if (isDevelopment) {
      console.log(`ℹ️  [INFO] ${message}`, meta);
    }
    // In production, you'd send to logging service like Winston, Datadog, etc.
  }

  static error(message, error = null, meta = {}) {
    const errorData = {
      message,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : null,
      meta,
      timestamp: new Date().toISOString()
    };

    console.error(`❌ [ERROR] ${message}`, errorData);
    
    // In production, send to error monitoring service
    // Example: Sentry.captureException(error);
  }

  static warn(message, meta = {}) {
    if (isDevelopment) {
      console.warn(`⚠️  [WARN] ${message}`, meta);
    }
    // In production, you'd send to logging service
  }

  static debug(message, meta = {}) {
    if (isDevelopment) {
      console.debug(`🐛 [DEBUG] ${message}`, meta);
    }
  }

  static performance(operation, duration, meta = {}) {
    const logData = {
      operation,
      duration: `${duration}ms`,
      meta,
      timestamp: new Date().toISOString()
    };

    if (isDevelopment) {
      console.log(`⚡ [PERF] ${operation}: ${duration}ms`, logData);
    }

    // In production, send to APM service like New Relic, Datadog
    if (duration > 5000) { // Log slow operations
      console.warn(`🐌 [SLOW] ${operation}: ${duration}ms`, logData);
    }
  }
}

module.exports = Logger;