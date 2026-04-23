'use strict';

/**
 * LOGGER PROFESSIONNEL HOMEY SDK3
 */

class Logger {
  static LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3,
    TRACE: 4
  };

  static EMOJI = {
    ERROR: '[ERROR]',
    WARN: '[WARN]',
    INFO: '[INFO]',
    DEBUG: '[SEARCH]',
    TRACE: '',
    ZIGBEE: '',
    CLUSTER: '',
    ATTRIBUTE: '[DATA]',
    COMMAND: '',
    CAPABILITY: '',
    DEVICE: '[POWER]'
  };

  constructor(device) {
    this.device = device;
    this.deviceName = device.getName ? device.getName() : 'Unknown Device';
    this.driverId = device.driver ? device.driver.id : 'unknown';
    this.level = this._getLogLevel();
  }

  _getLogLevel() {
    try {
      return this.device.getSetting('debug_logging') ? Logger.LEVELS.TRACE : Logger.LEVELS.INFO;
    } catch (err) {
      return Logger.LEVELS.INFO;
    }
  }

  _format(level, category, message, data = null) {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const emoji = Logger.EMOJI[level] || '';
    const catEmoji = Logger.EMOJI[category] || '';
    
    let formatted = `${emoji} [${timestamp}] [${this.driverId}] ${catEmoji} ${message}`;
    if (data) formatted += '\n' + JSON.stringify(data, null, 2);
    return formatted;
  }

  _log(level, category, message, data = null) {
    if (Logger.LEVELS[level] <= this.level) {
      const formatted = this._format(level, category, message, data);
      if (level === 'ERROR') this.device.error(formatted);
      else this.device.log(formatted);
    }
  }

  error(message, data = null) { this._log('ERROR', 'ERROR', message, data); }
  warn(message, data = null) { this._log('WARN', 'WARN', message, data); }
  info(message, data = null) { this._log('INFO', 'INFO', message, data); }
  debug(message, data = null) { this._log('DEBUG', 'DEBUG', message, data); }
  trace(message, data = null) { this._log('TRACE', 'TRACE', message, data); }

  zigbeeNode(zclNode) {
    if (Logger.LEVELS.DEBUG <= this.level) {
      this._log('DEBUG', 'ZIGBEE', 'ZigBee Node Information', {
        ieeeAddress: zclNode.ieeeAddress,
        manufacturerName: zclNode.manufacturerName,
        productId: zclNode.productId,
        endpoints: Object.keys(zclNode.endpoints || {})
      });
    }
  }

  deviceUnavailable(reason = null) {
    this._log('WARN', 'DEVICE', `Device unavailable: ${this.deviceName}`, reason ? { reason } : null);
  }

  settingsChange(changedKeys, oldSettings, newSettings) {
    if (changedKeys.includes('debug_logging')) {
      this.level = this._getLogLevel();
      this.info(`Debug logging ${newSettings.debug_logging ? 'enabled' : 'disabled'}`);
    }
  }
}

module.exports = Logger;
