'use strict';

/**
 * L10 - Health Monitor
 * Surveillance heartbeat attribut 0xFF01 cluster 0x0000 (Basic)
 * Détection proactive devices "sleepy" / "dead"
 * Check-in adaptatif: secteur 10min / pile 2h / mmWave 1min
 */
class HealthMonitor {
  constructor(device, options = {}) {
    this.device = device;
    this.devices = new Map(); // ieeeAddr -> { lastSeen, interval, powerSource, status }
    this.checkInterval = options.checkInterval || 60000; // 1min
    this.defaultTimeouts = {
      mains: options.mainsTimeout || 600000,    // 10min
      battery: options.batteryTimeout || 7200000, // 2h
      radar: options.radarTimeout || 60000        // 1min
    };
    this.missedThreshold = options.missedThreshold || 3;
    this.timer = setInterval(() => this._checkHealth(), this.checkInterval);
  }

  /**
   * Enregistre un device pour surveillance
   * @param {string} ieeeAddr - Adresse IEEE du device
   * @param {Object} info - { powerSource: 'mains'|'battery', type: string }
   */
  register(ieeeAddr, info = {}) {
    const powerSource = info.powerSource || 'mains';
    const timeout = this._getTimeout(powerSource, info.type);

    this.devices.set(ieeeAddr, {
      lastSeen: Date.now(),
      interval: timeout,
      powerSource,
      type: info.type || 'generic',
      missedBeats: 0,
      status: 'online'
    });

    this.device.log(`[L10] Device ${ieeeAddr} enregistré (${powerSource}, timeout: ${timeout / 1000}s)`);
  }

  /**
   * Met à jour le dernier heartbeat reçu
   * @param {string} ieeeAddr - Adresse IEEE du device
   */
  heartbeat(ieeeAddr) {
    const entry = this.devices.get(ieeeAddr);
    if (!entry) return;

    const wasOffline = entry.status === 'offline';
    entry.lastSeen = Date.now();
    entry.missedBeats = 0;
    entry.status = 'online';

    if (wasOffline) {
      this.device.log(`[L10] Device ${ieeeAddr} revenu en ligne`);
      this._emitStatusChange(ieeeAddr, 'online');
    }
  }

  /**
   * Vérifie la santé de tous les devices enregistrés
   * @private
   */
  _checkHealth() {
    const now = Date.now();

    for (const [ieeeAddr, entry] of this.devices) {
      const elapsed = now - entry.lastSeen;

      if (elapsed > entry.interval) {
        entry.missedBeats++;

        if (entry.missedBeats >= this.missedThreshold && entry.status !== 'offline') {
          entry.status = 'offline';
          this.device.log(`[L10] ⚠️ Device ${ieeeAddr} OFFLINE (${entry.missedBeats} battements manqués)`);
          this._emitStatusChange(ieeeAddr, 'offline');
        }
      }
    }
  }

  /**
   * Détermine le timeout selon le type d'alimentation et le device
   * @private
   */
  _getTimeout(powerSource, type) {
    if (type === 'radar' || type === 'presence') return this.defaultTimeouts.radar;
    if (powerSource === 'battery') return this.defaultTimeouts.battery;
    return this.defaultTimeouts.mains;
  }

  /**
   * Émet un événement de changement de statut
   * @private
   */
  _emitStatusChange(ieeeAddr, status) {
    if (this.device.homey && typeof this.device.setCapabilityValue === 'function') {
      try {
        this.device.setCapabilityValue('alarm_device_unavailable', status === 'offline').catch(() => {});
      } catch (e) {
        // Capability might not exist on all devices
      }
    }
  }

  /**
   * Retourne le statut d'un device
   * @param {string} ieeeAddr
   * @returns {string} 'online' | 'offline' | 'unknown'
   */
  getStatus(ieeeAddr) {
    const entry = this.devices.get(ieeeAddr);
    return entry ? entry.status : 'unknown';
  }

  /**
   * Retourne la liste des devices offline
   * @returns {string[]}
   */
  getOfflineDevices() {
    const offline = [];
    for (const [addr, entry] of this.devices) {
      if (entry.status === 'offline') offline.push(addr);
    }
    return offline;
  }

  /**
   * Désenregistre un device
   * @param {string} ieeeAddr
   */
  unregister(ieeeAddr) {
    this.devices.delete(ieeeAddr);
  }

  /**
   * Détruit le moniteur
   */
  destroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.devices.clear();
  }
}

module.exports = HealthMonitor;