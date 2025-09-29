'use strict';

// Mock logger for testing
class Logger {
  constructor(module) {
    this.module = module;
  }
  
  // Mock log methods
  error(...args) {
    console.error(`[${this.module}]`, ...args);
  }
  
  warn(...args) {
    console.warn(`[${this.module}]`, ...args);
  }
  
  info(...args) {
    console.info(`[${this.module}]`, ...args);
  }
  
  debug(...args) {
    console.debug(`[${this.module}]`, ...args);
  }
  
  verbose(...args) {
    console.log(`[${this.module}]`, ...args);
  }
  
  silly(...args) {
    console.log(`[${this.module}]`, ...args);
  }
  
  log(level, ...args) {
    this[level](...args);
  }
}

// Mock homey-log module
module.exports = {
  Logger,
  
  // For backward compatibility
  createLog(module) {
    return new Logger(module);
  },
  
  // For backward compatibility
  createLogger(module) {
    return new Logger(module);
  },
  
  // For backward compatibility
  get(module) {
    return new Logger(module);
  },
  
  // Set log level (no-op in tests)
  setLevel() {},
  
  // Enable/disable logging (no-op in tests)
  enable() {},
  disable() {},
  
  // Log levels
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
    verbose: 4,
    silly: 5,
  },
  
  // Default log level
  level: 'info',
  
  // Create a new logger instance
  create(module) {
    return new Logger(module);
  },
  
  // Mock transport (no-op in tests)
  transports: {
    console: {},
    file: {},
  },
  
  // Mock addTransport (no-op in tests)
  addTransport() {},
  
  // Mock removeTransport (no-op in tests)
  removeTransport() {},
  
  // Mock clearTransports (no-op in tests)
  clearTransports() {},
  
  // Mock configure (no-op in tests)
  configure() {},
  
  // Mock log function
  log(level, ...args) {
    const logger = new Logger();
    logger.log(level, ...args);
  },
  
  // Mock log functions for each level
  error: console.error.bind(console),
  warn: console.warn.bind(console),
  info: console.info.bind(console),
  debug: console.debug.bind(console),
  verbose: console.log.bind(console),
  silly: console.log.bind(console),
};
