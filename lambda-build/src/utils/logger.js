/**
 * Simple logger implementation that doesn't require external dependencies
 */

// Create default logger with console
const createLogger = () => {
  return {
    info: (message, meta = {}) => console.log(JSON.stringify({ level: 'info', message, ...meta })),
    error: (message, meta = {}) => console.error(JSON.stringify({ level: 'error', message, ...meta })),
    warn: (message, meta = {}) => console.warn(JSON.stringify({ level: 'warn', message, ...meta })),
    debug: (message, meta = {}) => console.debug(JSON.stringify({ level: 'debug', message, ...meta }))
  };
};

// Default logger
const defaultLogger = createLogger();

// Add request context to the logger
const addRequestContext = (requestId) => {
  return {
    info: (message, meta = {}) => defaultLogger.info(message, { requestId, ...meta }),
    error: (message, meta = {}) => defaultLogger.error(message, { requestId, ...meta }),
    warn: (message, meta = {}) => defaultLogger.warn(message, { requestId, ...meta }),
    debug: (message, meta = {}) => defaultLogger.debug(message, { requestId, ...meta })
  };
};

module.exports = {
  logger: defaultLogger,
  addRequestContext
};
