'use strict';

/**
 * LOGGER PROFESSIONNEL HOMEY SDK3
 * 
 * Système de logging avancé conforme à la documentation Homey SDK v3
 * - Niveaux de log: ERROR, WARN, INFO, DEBUG, TRACE
 * - Logs structurés avec contexte
 * - Support Zigbee (clusters, endpoints, attributes)
 * - Formatage coloré pour lisibilité
 * - Contrôle via settings
 */

class Logger {
  /**
   * Niveaux de log
   */
  static LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3,
    TRACE: 4
  };

  /**
   * Emojis pour les niveaux
   */
  static EMOJI = {
    ERROR: '[ERROR]',
    WARN: '[WARN]',
    INFO: '[INFO]',
    DEBUG: '[SEARCH]',
    TRACE: '🔬',
    ZIGBEE: '📡',
    CLUSTER: '⚙️',
    ATTRIBUTE: '[DATA]',
    COMMAND: '⚡',
    CAPABILITY: '🎛️',
    DEVICE: '[POWER]'
  };

  constructor(device) {
    this.device = device;
    this.deviceName = device.getName ? device.getName() : 'Unknown Device';
    this.driverId = device.driver ? device.driver.id : 'unknown';
    
    // Niveau de log par défaut
    this.level = this._getLogLevel();
  }

  /**
   * Récupère le niveau de log depuis les settings
   */
  _getLogLevel() {
    try {
      const debugEnabled = this.device.getSetting('debug_logging');
      return debugEnabled ? Logger.LEVELS.TRACE : Logger.LEVELS.INFO;
    } catch (err) {
      return Logger.LEVELS.INFO;
    }
  }

  /**
   * Formate un message avec contexte
   */
  _format(level, category, message, data = null) {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const emoji = Logger.EMOJI[level] || '';
    const catEmoji = Logger.EMOJI[category] || '';
    
    let formatted = `${emoji} [${timestamp}] [${this.driverId}] ${catEmoji} ${message}`;
    
    if (data) {
      formatted += '\n' + JSON.stringify(data, null, 2);
    }
    
    return formatted;
  }

  /**
   * Log un message si le niveau est suffisant
   */
  _log(level, category, message, data = null) {
    if (Logger.LEVELS[level] <= this.level) {
      const formatted = this._format(level, category, message, data);
      
      if (level === 'ERROR') {
        this.device.error(formatted);
      } else {
        this.device.log(formatted);
      }
    }
  }

  /**
   * Logs publics
   */
  error(message, data = null) {
    this._log('ERROR', 'ERROR', message, data);
  }

  warn(message, data = null) {
    this._log('WARN', 'WARN', message, data);
  }

  info(message, data = null) {
    this._log('INFO', 'INFO', message, data);
  }

  debug(message, data = null) {
    this._log('DEBUG', 'DEBUG', message, data);
  }

  trace(message, data = null) {
    this._log('TRACE', 'TRACE', message, data);
  }

  /**
   * LOGS ZIGBEE SPÉCIALISÉS
   */

  /**
   * Log information sur un ZigBeeNode
   */
  zigbeeNode(zclNode) {
    if (Logger.LEVELS.DEBUG <= this.level) {
      const nodeInfo = {
        ieeeAddress: zclNode.ieeeAddress,
        manufacturerName: zclNode.manufacturerName,
        productId: zclNode.productId,
        endpoints: Object.keys(zclNode.endpoints || {})
      };
      
      this._log('DEBUG', 'ZIGBEE', 'ZigBee Node Information', nodeInfo);
    }
  }

  /**
   * Log endpoints disponibles
   */
  zigbeeEndpoints(zclNode) {
    if (Logger.LEVELS.DEBUG <= this.level) {
      const endpoints = {};
      
      for (const [epId, endpoint] of Object.entries(zclNode.endpoints || {})) {
        endpoints[epId] = {
          clusters: endpoint.clusters ? Object.keys(endpoint.clusters) : [],
          deviceId: endpoint.deviceId,
          profileId: endpoint.profileId
        };
      }
      
      this._log('DEBUG', 'ZIGBEE', 'ZigBee Endpoints', endpoints);
    }
  }

  /**
   * Log clusters disponibles sur un endpoint
   */
  zigbeeClusters(endpoint, epId = 1) {
    if (Logger.LEVELS.DEBUG <= this.level) {
      const clusters = {};
      
      for (const [clusterId, cluster] of Object.entries(endpoint.clusters || {})) {
        clusters[clusterId] = {
          name: cluster.name || 'unknown',
          attributes: Object.keys(cluster.attrs || {}),
          commands: Object.keys(cluster.commands || {})
        };
      }
      
      this._log('DEBUG', 'CLUSTER', `Endpoint ${epId} Clusters`, clusters);
    }
  }

  /**
   * Log lecture d'attribut
   */
  zigbeeReadAttribute(clusterName, attributeName, value) {
    if (Logger.LEVELS.TRACE <= this.level) {
      this._log('TRACE', 'ATTRIBUTE', `Read ${clusterName}.${attributeName}`, { value });
    }
  }

  /**
   * Log écriture d'attribut
   */
  zigbeeWriteAttribute(clusterName, attributeName, value) {
    if (Logger.LEVELS.DEBUG <= this.level) {
      this._log('DEBUG', 'ATTRIBUTE', `Write ${clusterName}.${attributeName}`, { value });
    }
  }

  /**
   * Log commande Zigbee
   */
  zigbeeCommand(clusterName, commandName, args = {}) {
    if (Logger.LEVELS.DEBUG <= this.level) {
      this._log('DEBUG', 'COMMAND', `Command ${clusterName}.${commandName}`, args);
    }
  }

  /**
   * Log report d'attribut (notification)
   */
  zigbeeReport(clusterName, reports) {
    if (Logger.LEVELS.TRACE <= this.level) {
      this._log('TRACE', 'ATTRIBUTE', `Report from ${clusterName}`, reports);
    }
  }

  /**
   * LOGS CAPABILITIES
   */

  /**
   * Log changement de capability
   */
  capabilityChange(capabilityId, value, opts = {}) {
    if (Logger.LEVELS.INFO <= this.level) {
      this._log('INFO', 'CAPABILITY', `${capabilityId} changed to ${value}`, opts);
    }
  }

  /**
   * Log listener capability
   */
  capabilityListener(capabilityId, value, opts = {}) {
    if (Logger.LEVELS.DEBUG <= this.level) {
      this._log('DEBUG', 'CAPABILITY', `${capabilityId} listener triggered`, { value, opts });
    }
  }

  /**
   * LOGS DEVICE
   */

  /**
   * Log initialisation device
   */
  deviceInit() {
    this._log('INFO', 'DEVICE', `Device initialized: ${this.deviceName}`);
  }

  /**
   * Log device ready
   */
  deviceReady() {
    this._log('INFO', 'DEVICE', `Device ready: ${this.deviceName}`);
  }

  /**
   * Log device available
   */
  deviceAvailable() {
    this._log('INFO', 'DEVICE', `Device available: ${this.deviceName}`);
  }

  /**
   * Log device unavailable
   */
  deviceUnavailable(reason = null) {
    this._log('WARN', 'DEVICE', `Device unavailable: ${this.deviceName}`, reason ? { reason } : null);
  }

  /**
   * Log device deleted
   */
  deviceDeleted() {
    this._log('INFO', 'DEVICE', `Device deleted: ${this.deviceName}`);
  }

  /**
   * Log settings change
   */
  settingsChange(changedKeys, oldSettings, newSettings) {
    if (Logger.LEVELS.DEBUG <= this.level) {
      this._log('DEBUG', 'DEVICE', 'Settings changed', {
        changed: changedKeys,
        old: oldSettings,
        new: newSettings
      });
    }
    
    // Update log level si debug_logging a changé
    if (changedKeys.includes('debug_logging')) {
      this.level = this._getLogLevel();
      this.info(`Debug logging ${newSettings.debug_logging ? 'enabled' : 'disabled'}`);
    }
  }

  /**
   * HELPERS
   */

  /**
   * Log une erreur avec stack trace
   */
  exception(message, error) {
    const errorData = {
      message: error.message,
      stack: error.stack,
      code: error.code,
      name: error.name
    };
    
    this._log('ERROR', 'ERROR', message, errorData);
  }

  /**
   * Log performance (timing)
   */
  timing(operation, durationMs) {
    if (Logger.LEVELS.DEBUG <= this.level) {
      this._log('DEBUG', 'INFO', `${operation} took ${durationMs}ms`);
    }
  }

  /**
   * Créer un timer pour mesurer la performance
   */
  startTimer(label) {
    const start = Date.now();
    return {
      end: () => {
        const duration = Date.now() - start;
        this.timing(label, duration);
        return duration;
      }
    };
  }

  // ========== NOUVELLES MÉTHODES (SDK v3 Enhanced) ==========

  /**
   * Log pairing start
   */
  pairingStart(deviceType) {
    this._log('INFO', 'DEVICE', `Pairing started: ${deviceType}`);
  }

  /**
   * Log pairing success
   */
  pairingSuccess(deviceInfo) {
    this._log('INFO', 'DEVICE', 'Pairing successful', deviceInfo);
  }

  /**
   * Log pairing failure
   */
  pairingFailed(reason, error) {
    this._log('ERROR', 'DEVICE', `Pairing failed: ${reason}`, { 
      error: error.message,
      stack: error.stack 
    });
  }

  /**
   * Log setting change
   */
  settingChanged(key, oldValue, newValue) {
    this._log('DEBUG', 'DEVICE', `Setting ${key} changed`, {
      from: oldValue,
      to: newValue
    });
  }

  /**
   * Log flow triggered
   */
  flowTriggered(cardId, tokens = {}) {
    this._log('DEBUG', 'CAPABILITY', `Flow triggered: ${cardId}`, tokens);
  }

  /**
   * Log flow condition
   */
  flowCondition(cardId, args = {}, result) {
    this._log('DEBUG', 'CAPABILITY', `Flow condition ${cardId}: ${result}`, args);
  }

  /**
   * Log flow action
   */
  flowAction(cardId, args = {}) {
    this._log('DEBUG', 'CAPABILITY', `Flow action: ${cardId}`, args);
  }

  /**
   * Log network health
   */
  networkHealth(lqi, rssi, neighbors) {
    this._log('TRACE', 'ZIGBEE', 'Network health', { lqi, rssi, neighbors });
    
    if (lqi && lqi < 100) {
      this.warn(`Low LQI detected: ${lqi}`, {
        recommendation: 'Add Zigbee router or move device closer to Homey'
      });
    }
  }

  /**
   * Log capability update
   */
  capabilityUpdate(capability, value, reason = 'unknown') {
    this._log('INFO', 'CAPABILITY', `${capability} → ${value}`, { reason });
  }

  /**
   * Log capability command
   */
  capabilityCommand(capability, value) {
    this._log('DEBUG', 'COMMAND', `Command: ${capability} = ${value}`);
  }
}

module.exports = Logger;
