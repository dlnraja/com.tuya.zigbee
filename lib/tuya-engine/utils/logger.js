'use strict';

/**
 * Leveled logging utility for Tuya Zigbee devices
 * 
 * LOG_LEVEL environment variable controls verbosity:
 * - 'info' (default): Essential events only
 * - 'debug': Detailed operational information
 * - 'trace': Full packet-level information
 * 
 * @example
 * const logger = require('./utils/logger');
 * const log = logger.createLogger(this, 'motion_sensor');
 * log.info('Device initialized');
 * log.debug('Capability registered', { capability: 'alarm_motion' });
 * log.trace('Raw ZCL report', zclFrame);
 */

const LOG_LEVELS = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
};

class Logger {
  constructor(device, context = '') {
    this.device = device;
    this.context = context;
    this.level = LOG_LEVELS[process.env.LOG_LEVEL] || LOG_LEVELS.info;
  }

  trace(message, data) {
    if (this.level <= LOG_LEVELS.trace) {
      this._log('TRACE', message, data);
    }
  }

  debug(message, data) {
    if (this.level <= LOG_LEVELS.debug) {
      this._log('DEBUG', message, data);
    }
  }

  info(message, data) {
    if (this.level <= LOG_LEVELS.info) {
      this._log('INFO', message, data);
    }
  }

  warn(message, data) {
    if (this.level <= LOG_LEVELS.warn) {
      this._log('WARN', message, data);
    }
  }

  error(message, data) {
    this._log('ERROR', message, data);
  }

  _log(level, message, data) {
    const prefix = this.context ? `[${this.context}]` : '';
    const suffix = data ? ` ${JSON.stringify(data)}` : '';
    
    if (level === 'ERROR' && this.device.error) {
      this.device.error(`${prefix} ${message}${suffix}`);
    } else if (this.device.log) {
      this.device.log(`${prefix} ${message}${suffix}`);
    }
  }

  /**
   * Group related log entries (e.g., IAS enrollment sequence)
   */
  group(title, entries) {
    this.info(`=== ${title} ===`);
    entries.forEach(entry => {
      if (typeof entry === 'string') {
        this.info(`  ${entry}`);
      } else {
        this.info(`  ${entry.message}`, entry.data);
      }
    });
    this.info(`=== END ${title} ===`);
  }
}

/**
 * Create a logger instance for a device
 * @param {Object} device - Homey device instance
 * @param {string} context - Logger context (e.g., driver name)
 * @returns {Logger}
 */
function createLogger(device, context) {
  return new Logger(device, context);
}

module.exports = {
  createLogger,
  LOG_LEVELS,
};
