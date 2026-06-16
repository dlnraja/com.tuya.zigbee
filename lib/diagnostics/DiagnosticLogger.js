'use strict';

/**
 * DiagnosticLogger - Structured logging utility for verbose debugging
 *
 * Provides:
 * - Timestamp with milliseconds
 * - Module name identification
 * - Log levels (info, warn, error, debug, verbose)
 * - Device ID context (when available)
 * - DP ID context (when applicable)
 * - Diagnostic mode toggle via device setting
 * - Export capability for debugging
 *
 * Usage:
 *   const DiagnosticLogger = require('../diagnostics/DiagnosticLogger');
 *   const logger = new DiagnosticLogger(this, 'TuyaEF00Manager');
 *
 *   logger.info('DP report received', { dpId: 1, value: 25 });
 *   logger.debug('Frame data', { endpointId: 1, clusterId: 0xEF00 });
 *   logger.error('Command failed', { operation: 'sendTimeSync', error: err.message });
 */

class DiagnosticLogger {
  /**
   * Create a DiagnosticLogger instance
   * @param {Object} device - Homey device instance (for settings access and device ID)
   * @param {string} moduleName - Name of the module using this logger
   */
  constructor(device, moduleName) {
    this._device = device;
    this._moduleName = moduleName || 'Unknown';
    this._buffer = [];
    this._maxBufferSize = 500;
    this._enabled = true; // Default to enabled, check setting on each log
  }

  /**
   * Check if verbose diagnostic logging is enabled for this device
   * Controlled by 'verbose_diagnostic_logging' device setting
   * @returns {boolean}
   */
  _isVerboseEnabled() {
    try {
      if (this._device && typeof this._device.getSetting === 'function') {
        return this._device.getSetting('verbose_diagnostic_logging') === true;
      }
    } catch (e) {
      // Setting access failed, default to disabled for verbose
    }
    return false;
  }

  /**
   * Get device identifier for log context
   * @returns {string}
   */
  _getDeviceId() {
    try {
      if (this._device && typeof this._device.getData === 'function') {
        return this._device.getData().id || 'unknown-device';
      }
      if (this._device && typeof this._device.getName === 'function') {
        return this._device.getName() || 'unknown-device';
      }
    } catch (e) {
      // Device access failed
    }
    return 'unknown-device';
  }

  /**
   * Format a structured log entry
   * @param {string} level - Log level (INFO, WARN, ERROR, DEBUG, VERBOSE)
   * @param {string} message - Log message
   * @param {Object} [context={}] - Additional context (dpId, operation, etc.)
   * @returns {Object} Formatted log entry
   */
  _formatEntry(level, message, context = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      module: this._moduleName,
      device: this._getDeviceId(),
      message,
      ...context
    };

    // Add to buffer for export
    this._buffer.push(entry);
    if (this._buffer.length > this._maxBufferSize) {
      this._buffer.shift();
    }

    return entry;
  }

  /**
   * Format context object to string for device.log()
   * @param {Object} context
   * @returns {string}
   */
  _contextToString(context) {
    if (!context || Object.keys(context).length === 0) return '';
    const parts = [];
    for (const [key, value] of Object.entries(context)) {
      if (value !== undefined && value !== null) {
        parts.push(`${key}=${typeof value === 'object' ? JSON.stringify(value) : value}`);
      }
    }
    return parts.length > 0 ? ` {${parts.join(', ')}}` : '';
  }

  /**
   * Log at INFO level - normal operational events
   * @param {string} message
   * @param {Object} [context={}]
   */
  info(message, context = {}) {
    const entry = this._formatEntry('INFO', message, context);
    if (this._device && typeof this._device.log === 'function') {
      this._device.log(`[${this._moduleName}] ${message}${this._contextToString(context)}`);
    }
    return entry;
  }

  /**
   * Log at WARN level - unexpected but recoverable situations
   * @param {string} message
   * @param {Object} [context={}]
   */
  warn(message, context = {}) {
    const entry = this._formatEntry('WARN', message, context);
    if (this._device && typeof this._device.log === 'function') {
      this._device.log(`[${this._moduleName}] WARN: ${message}${this._contextToString(context)}`);
    }
    return entry;
  }

  /**
   * Log at ERROR level - failures that need attention
   * @param {string} message
   * @param {Object} [context={}]
   */
  error(message, context = {}) {
    const entry = this._formatEntry('ERROR', message, context);
    if (this._device && typeof this._device.error === 'function') {
      this._device.error(`[${this._moduleName}] ERROR: ${message}${this._contextToString(context)}`);
    }
    return entry;
  }

  /**
   * Log at DEBUG level - detailed operational info (always logged when verbose disabled)
   * @param {string} message
   * @param {Object} [context={}]
   */
  debug(message, context = {}) {
    const entry = this._formatEntry('DEBUG', message, context);
    // Debug is always logged (useful for critical debug paths)
    if (this._device && typeof this._device.log === 'function') {
      this._device.log(`[${this._moduleName}] DEBUG: ${message}${this._contextToString(context)}`);
    }
    return entry;
  }

  /**
   * Log at VERBOSE level - only when verbose diagnostic logging is enabled
   * @param {string} message
   * @param {Object} [context={}]
   */
  verbose(message, context = {}) {
    const entry = this._formatEntry('VERBOSE', message, context);
    if (this._isVerboseEnabled()) {
      if (this._device && typeof this._device.log === 'function') {
        this._device.log(`[${this._moduleName}] VERBOSE: ${message}${this._contextToString(context)}`);
      }
    }
    return entry;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Specialized logging methods for common patterns
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Log a DP (Datapoint) report received
   * @param {number} dpId - DP ID
   * @param {string} dpType - DP type (bool, value, string, enum, raw)
   * @param {*} value - DP value
   * @param {Object} [extra={}]
   */
  dpReport(dpId, dpType, value, extra = {}) {
    return this.info(`DP report received`, {
      dpId,
      dpType,
      value,
      ...extra
    });
  }

  /**
   * Log a DP command being sent
   * @param {number} dpId - DP ID
   * @param {string} command - Command name
   * @param {*} value - Value being sent
   */
  dpCommand(dpId, command, value) {
    return this.info(`DP command sending`, {
      dpId,
      command,
      value
    });
  }

  /**
   * Log a capability change
   * @param {string} capability - Capability name
   * @param {*} value - New value
   * @param {*} previousValue - Previous value
   */
  capabilityChange(capability, value, previousValue) {
    return this.verbose(`Capability changed`, {
      capability,
      value,
      previousValue
    });
  }

  /**
   * Log a flow card trigger
   * @param {string} cardId - Flow card ID
   * @param {Object} [tokens={}]
   */
  flowTrigger(cardId, tokens = {}) {
    return this.info(`Flow card triggered`, {
      cardId,
      tokens
    });
  }

  /**
   * Log frame reception (L0 layer)
   * @param {Object} frameData - Frame data
   */
  frameReceived(frameData) {
    return this.verbose(`Frame received`, {
      endpointId: frameData.endpointId,
      clusterId: frameData.clusterId,
      frameLength: frameData.frame?.length || 0,
      ...frameData.meta
    });
  }

  /**
   * Log command sending
   * @param {string} cluster - Cluster name
   * @param {string} command - Command name
   * @param {Object} [params={}]
   */
  commandSending(cluster, command, params = {}) {
    return this.debug(`Command sending`, {
      cluster,
      command,
      params
    });
  }

  /**
   * Log error with operation context for catch blocks
   * @param {string} operation - What operation failed
   * @param {Error} error - The error that occurred
   * @param {Object} [extra={}]
   */
  operationFailed(operation, error, extra = {}) {
    return this.error(`Operation failed: ${operation}`, {
      operation,
      errorMessage: error?.message || String(error),
      errorStack: error?.stack?.split('\n').slice(0, 3).join(' | '),
      suggestion: this._getSuggestion(operation, error),
      ...extra
    });
  }

  /**
   * Get user-friendly suggestion based on operation and error
   * @param {string} operation
   * @param {Error} error
   * @returns {string}
   */
  _getSuggestion(operation, error) {
    const msg = error?.message || '';

    if (operation.includes('bind')) {
      return 'Check if device is paired and in range. Try re-pairing if persistent.';
    }
    if (operation.includes('time_sync') || operation.includes('timeSync')) {
      return 'Time sync is non-critical. Device will retry automatically.';
    }
    if (operation.includes('capability')) {
      return 'Check if capability is registered correctly in driver.compose.json.';
    }
    if (operation.includes('flow') || operation.includes('FlowCard')) {
      return 'Verify flow card ID matches driver.flow.compose.json definition.';
    }
    if (msg.includes('TIMEOUT') || msg.includes('MAC_NO_ACK')) {
      return 'Device may be out of range or sleeping. Check Zigbee network health.';
    }
    if (msg.includes('destroyed') || msg.includes('Cannot access')) {
      return 'Device was removed during operation. This is expected during unpairing.';
    }

    return 'Check device logs and Homey Zigbee network status.';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Log export for debugging
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get all buffered log entries
   * @param {Object} [filter={}] - Optional filter { level, since, limit }
   * @returns {Array}
   */
  getLogs(filter = {}) {
    let logs = [...this._buffer];

    if (filter.level) {
      logs = logs.filter(l => l.level === filter.level);
    }
    if (filter.since) {
      const since = new Date(filter.since);
      logs = logs.filter(l => new Date(l.timestamp) >= since);
    }
    if (filter.limit) {
      logs = logs.slice(-filter.limit);
    }

    return logs;
  }

  /**
   * Get log buffer as formatted string for export
   * @returns {string}
   */
  exportLogs() {
    return this._buffer.map(entry =>
      `[${entry.timestamp}] [${entry.level}] [${entry.module}] [${entry.device}] ${entry.message}${this._contextToString(entry)}`
    ).join('\n');
  }

  /**
   * Clear log buffer
   */
  clearBuffer() {
    this._buffer = [];
  }

  /**
   * Get log statistics
   * @returns {Object}
   */
  getStats() {
    const stats = {
      total: this._buffer.length,
      byLevel: {},
      byModule: {},
      oldestEntry: this._buffer[0]?.timestamp || null,
      newestEntry: this._buffer[this._buffer.length - 1]?.timestamp || null
    };

    for (const entry of this._buffer) {
      stats.byLevel[entry.level] = (stats.byLevel[entry.level] || 0) + 1;
      stats.byModule[entry.module] = (stats.byModule[entry.module] || 0) + 1;
    }

    return stats;
  }
}

/**
 * Factory function to create a DiagnosticLogger bound to a device
 * @param {Object} device - Homey device instance
 * @param {string} moduleName - Module name
 * @returns {DiagnosticLogger}
 */
DiagnosticLogger.create = function(device, moduleName) {
  return new DiagnosticLogger(device, moduleName);
};

module.exports = DiagnosticLogger;
