'use strict';

/**
 * HealthMonitor — Layer L10
 * Surveillance des battements de cœur (heartbeat) des devices Zigbee
 * 
 * Sources de heartbeat:
 *   - Cluster 0x0000 (Basic), attribut 0xFF01 (Xiaomi/Aqara lifeline)
 *   - Cluster 0x0000, attribut 0xFF02 (Tuya heartbeat)
 *   - Rapports périodiques de température/humidité (capteurs)
 *   - Événements de mouvement (radars mmWave)
 *   - Changements d'état on/off (switches, plugs)
 * 
 * Stratégie adaptative:
 *   - Mains-powered: timeout 10 min, ping actif
 *   - Battery-powered: timeout 60 min, passif (attend le wake-up)
 *   - mmWave radars: timeout 2 min (rapport très fréquent)
 *   - IR blasters: timeout 30 min
 */

const EventEmitter = require('events');

// Seuils par défaut (ms)
const DEFAULT_THRESHOLDS = {
  mains_powered: 10 * 60 * 1000,      // 10 min
  battery_powered: 60 * 60 * 1000,     // 60 min
  mmwave_radar: 2 * 60 * 1000,         // 2 min
  ir_blaster: 30 * 60 * 1000,          // 30 min
  sleepy_sensor: 120 * 60 * 1000,      // 2 heures (capteurs très endormis)
};

// Nombre de battements manqués avant marquage "indisponible"
const MISSED_HEARTBEATS_THRESHOLD = 3;

// Intervalle de vérification (1 minute)
const CHECK_INTERVAL_MS = 60 * 1000;

class DeviceHealth {
  constructor(deviceId, options = {}) {
    this.deviceId = deviceId;
    this.deviceType = options.deviceType || 'mains_powered';
    this.lastHeartbeat = Date.now();
    this.lastSeen = Date.now();
    this.heartbeatCount = 0;
    this.missedHeartbeats = 0;
    this.isReachable = true;
    this.isSleepy = options.isSleepy || false;
    this.manufacturer = options.manufacturer || '';
    this.modelId = options.modelId || '';
    this.threshold = options.threshold || DEFAULT_THRESHOLDS[this.deviceType] || DEFAULT_THRESHOLDS.mains_powered;
    this.consecutiveMissed = 0;
    this.history = []; // Derniers 10 heartbeats (circular buffer)
    this.avgInterval = 0;
    this.lastValues = {}; // Dernières valeurs reçues (pour 0xFF01 parsing)
  }

  recordHeartbeat(values = {}) {
    const now = Date.now();
    const interval = now - this.lastHeartbeat;
    
    this.lastHeartbeat = now;
    this.lastSeen = now;
    this.heartbeatCount++;
    this.consecutiveMissed = 0;
    this.isReachable = true;
    
    // Historique (circular buffer de 10)
    this.history.push({ timestamp: now, interval, values });
    if (this.history.length > 10) this.history.shift();
    
    // Calculer intervalle moyen
    if (this.history.length > 1) {
      const intervals = this.history.slice(1).map(h => h.interval);
      this.avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    }
    
    // Stocker les valeurs du lifeline (0xFF01)
    if (values && Object.keys(values).length > 0) {
      this.lastValues = { ...this.lastValues, ...values };
    }
  }

  checkLiveness() {
    const now = Date.now();
    const elapsed = now - this.lastHeartbeat;
    
    if (elapsed > this.threshold) {
      this.consecutiveMissed++;
      
      if (this.consecutiveMissed >= MISSED_HEARTBEATS_THRESHOLD) {
        if (this.isReachable) {
          this.isReachable = false;
          return 'UNREACHABLE';
        }
        return 'STILL_UNREACHABLE';
      }
      
      return 'MISSED';
    }
    
    return 'OK';
  }

  getUptime() {
    return Date.now() - this.lastSeen;
  }

  toJSON() {
    return {
      deviceId: this.deviceId,
      deviceType: this.deviceType,
      isReachable: this.isReachable,
      lastHeartbeat: this.lastHeartbeat,
      heartbeatCount: this.heartbeatCount,
      consecutiveMissed: this.consecutiveMissed,
      avgInterval: Math.round(this.avgInterval),
      threshold: this.threshold,
      lastValues: this.lastValues,
    };
  }
}

class HealthMonitor extends EventEmitter {
  constructor(options = {}) {
    super();
    this.devices = new Map();
    this.checkInterval = options.checkInterval || CHECK_INTERVAL_MS;
    this.enabled = options.enabled !== false;
    this._checkTimer = null;
    this._started = false;
  }

  start() {
    if (this._started) return;
    this._started = true;
    this._checkTimer = setInterval(() => this._checkAll(), this.checkInterval);
    this.emit('started');
  }

  stop() {
    if (this._checkTimer) {
      clearInterval(this._checkTimer);
      this._checkTimer = null;
    }
    this._started = false;
    this.emit('stopped');
  }

  /**
   * Enregistre un device pour le monitoring
   * @param {object} device - Device Homey
   * @param {object} options - { deviceType, isSleepy, manufacturer, modelId, threshold }
   */
  registerDevice(device, options = {}) {
    const deviceId = device.id || device.getData?.()?.id || 'unknown';
    
    // Auto-détecter le type si non spécifié
    if (!options.deviceType) {
      options.deviceType = this._detectDeviceType(device, options);
    }
    
    const health = new DeviceHealth(deviceId, options);
    this.devices.set(deviceId, health);
    this.emit('device_registered', deviceId, options.deviceType);
    return health;
  }

  /**
   * Enregistre un heartbeat pour un device
   * @param {string} deviceId - ID du device
   * @param {object} values - Valeurs extraites (voltage, temp, RSSI, etc.)
   */
  recordHeartbeat(deviceId, values = {}) {
    const health = this.devices.get(deviceId);
    if (!health) return;
    
    const wasUnreachable = !health.isReachable;
    health.recordHeartbeat(values);
    
    if (wasUnreachable) {
      this.emit('device_recovered', deviceId);
    }
  }

  /**
   * Parse le buffer lifeline 0xFF01 (Xiaomi/Aqara)
   * Format: TLV (Type-Length-Value) avec types spécifiques
   * @param {Buffer} buffer - Buffer brut 0xFF01
   * @returns {object} - Valeurs parsées
   */
  parseLifeline0xFF01(buffer) {
    if (!Buffer.isBuffer(buffer) || buffer.length < 3) return {};
    
    const results = {};
    let offset = 0;
    
    try {
      while (offset < buffer.length - 2) {
        const type = buffer[offset++];
        const size = buffer[offset++];
        
        if (offset + size > buffer.length) break;
        
        const valueBuffer = buffer.slice(offset, offset + size);
        offset += size;
        
        switch (type) {
          case 0x01: // Boolean (on/off state)
            results.state = valueBuffer[0] === 1;
            break;
          case 0x03: // Temperature (°C * 100)
            if (size >= 2) {
              results.temperature = valueBuffer.readInt16LE(0) / 100;
            }
            break;
          case 0x05: // Humidity (% * 100)
            if (size >= 2) {
              results.humidity = valueBuffer.readUInt16LE(0) / 100;
            }
            break;
          case 0x06: // Pressure (hPa * 10)
            if (size >= 2) {
              results.pressure = valueBuffer.readUInt16LE(0) / 10;
            }
            break;
          case 0x07: // Battery voltage (mV)
            if (size >= 2) {
              results.batteryVoltage = valueBuffer.readUInt16LE(0);
              // Conversion approximative mV → %
              const mv = results.batteryVoltage;
              results.battery = Math.min(100, Math.max(0, Math.round((mv - 2200) / (3000 - 2200) * 100)));
            }
            break;
          case 0x08: // RSSI (dBm)
            if (size >= 1) {
              results.rssi = valueBuffer.readInt8(0);
            }
            break;
          case 0x09: // Luminance (lux)
            if (size >= 4) {
              results.illuminance = valueBuffer.readUInt32LE(0);
            } else if (size >= 2) {
              results.illuminance = valueBuffer.readUInt16LE(0);
            }
            break;
          case 0x0A: // Moisture (%)
            if (size >= 1) {
              results.moisture = valueBuffer[0];
            }
            break;
          case 0x0B: // Conductivity (µS/cm)
            if (size >= 2) {
              results.conductivity = valueBuffer.readUInt16LE(0);
            }
            break;
          case 0x0C: // Power (W)
            if (size >= 4) {
              results.power = valueBuffer.readUInt32LE(0);
            } else if (size >= 2) {
              results.power = valueBuffer.readUInt16LE(0);
            }
            break;
          case 0x0D: // Energy (Wh)
            if (size >= 4) {
              results.energy = valueBuffer.readUInt32LE(0);
            }
            break;
          case 0x0E: // Voltage (V * 10)
            if (size >= 2) {
              results.voltage = valueBuffer.readUInt16LE(0) / 10;
            }
            break;
          case 0x0F: // Current (mA)
            if (size >= 2) {
              results.current = valueBuffer.readUInt16LE(0);
            }
            break;
          default:
            // Type inconnu, stocker en hex
            results[`unknown_${type}`] = valueBuffer.toString('hex');
        }
      }
    } catch (err) {
      // Parsing partiel — on retourne ce qu'on a
      results._parseError = err.message;
    }
    
    return results;
  }

  /**
   * Gère un message Zigbee entrant pour le health monitoring
   * @param {object} device - Device Homey
   * @param {object} frame - Trame Zigbee
   */
  handleMessage(device, frame) {
    if (!this.enabled) return;
    
    const deviceId = device.id || device.getData?.()?.id;
    if (!deviceId) return;
    
    // Détecter les heartbeats selon le cluster/attribut
    const { clusterId, attrId, data } = frame;
    
    if (clusterId === 0x0000) {
      // Basic cluster
      if (attrId === 0xFF01 && Buffer.isBuffer(data)) {
        // Lifeline Xiaomi/Aqara
        const values = this.parseLifeline0xFF01(data);
        this.recordHeartbeat(deviceId, values);
        this.emit('lifeline', deviceId, values);
      } else if (attrId === 0xFF02) {
        // Tuya heartbeat
        this.recordHeartbeat(deviceId, { tuya_heartbeat: true });
      } else {
        // Tout autre attribut Basic = le device est vivant
        this.recordHeartbeat(deviceId);
      }
    } else {
      // Tout message Zigbee = le device est vivant
      this.recordHeartbeat(deviceId);
    }
  }

  /**
   * Vérifie la vitalité de tous les devices enregistrés
   * @returns {Array} - Liste des changements d'état
   */
  _checkAll() {
    const changes = [];
    
    for (const [deviceId, health] of this.devices) {
      const status = health.checkLiveness();
      
      switch (status) {
        case 'UNREACHABLE':
          changes.push({ deviceId, status: 'unreachable', health: health.toJSON() });
          this.emit('device_unreachable', deviceId, health.toJSON());
          break;
        case 'MISSED':
          changes.push({ deviceId, status: 'missed', missed: health.consecutiveMissed });
          this.emit('heartbeat_missed', deviceId, health.consecutiveMissed);
          break;
        case 'STILL_UNREACHABLE':
          // Pas de re-emit, déjà marqué
          break;
        case 'OK':
          // Tout va bien
          break;
      }
    }
    
    return changes;
  }

  /**
   * Auto-détecte le type de device pour adapter le timeout
   */
  _detectDeviceType(device, options) {
    const modelId = (options.modelId || device.getData?.()?.modelId || '').toLowerCase();
    const manufacturer = (options.manufacturer || '').toLowerCase();
    
    // mmWave radars
    if (modelId.includes('mmwave') || modelId.includes('radar') || modelId.includes('hl0ss9oa') || modelId.includes('ts0225')) {
      return 'mmwave_radar';
    }
    
    // IR blasters
    if (modelId.includes('ir') || modelId.includes('zsung') || modelId.includes('zs3l') || modelId.includes('ufo-r11')) {
      return 'ir_blaster';
    }
    
    // Battery devices (capteurs, boutons)
    if (options.isSleepy || modelId.includes('sensor') || modelId.includes('button') || modelId.includes('contact') || modelId.includes('motion')) {
      return 'battery_powered';
    }
    
    return 'mains_powered';
  }

  /**
   * Récupère le statut de santé d'un device
   */
  getDeviceHealth(deviceId) {
    const health = this.devices.get(deviceId);
    return health ? health.toJSON() : null;
  }

  /**
   * Récupère un résumé global
   */
  getSummary() {
    let reachable = 0;
    let unreachable = 0;
    let sleepy = 0;
    
    for (const [, health] of this.devices) {
      if (health.isReachable) reachable++;
      else unreachable++;
      if (health.isSleepy) sleepy++;
    }
    
    return {
      total: this.devices.size,
      reachable,
      unreachable,
      sleepy,
      checkInterval: this.checkInterval,
    };
  }

  unregisterDevice(deviceId) {
    this.devices.delete(deviceId);
  }

  destroy() {
    this.stop();
    this.devices.clear();
    this.removeAllListeners();
  }
}

module.exports = { HealthMonitor, DeviceHealth };