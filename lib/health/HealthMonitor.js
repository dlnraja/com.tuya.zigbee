'use strict';

/**
 * L10: HealthMonitor
 * Monitors battery-powered Zigbee sensor heartbeats and check-in timestamps.
 * Useful for catching devices that have gone silent due to flat batteries or mesh signal loss.
 */
class HealthMonitor {
  constructor(homey, timeoutMs = 25 * 60 * 60 * 1000) { // 25 hours check-in window
    this.homey = homey;
    this.timeoutMs = timeoutMs;
    this.lastSeen = new Map(); // key: deviceId, value: timestamp
  }

  /**
   * Record a check-in event for an device
   * @param {string} deviceId - Unique device identifier
   */
  recordCheckIn(deviceId) {
    this.lastSeen.set(deviceId, Date.now());
  }

  /**
   * Check if a specific device is offline/silent
   * @param {string} deviceId - Unique device identifier
   * @returns {boolean}
   */
  isOffline(deviceId) {
    if (!this.lastSeen.has(deviceId)) return false;
    const elapsed = Date.now() - this.lastSeen.get(deviceId);
    return elapsed > this.timeoutMs;
  }

  /**
   * Get list of all registered devices that have gone silent
   * @returns {Array<string>} - Array of offline device IDs
   */
  getOfflineDevices() {
    const offline = [];
    const now = Date.now();
    for (const [deviceId, timestamp] of this.lastSeen.entries()) {
      if (now - timestamp > this.timeoutMs) {
        offline.push(deviceId);
      }
    }
    return offline;
  }

  /**
   * Get the last check-in timestamp for an device
   * @param {string} deviceId 
   * @returns {number|null}
   */
  getLastSeen(deviceId) {
    return this.lastSeen.get(deviceId) || null;
  }

  /**
   * Remove a device from tracking (e.g. on unpairing)
   * @param {string} deviceId 
   */
  removeDevice(deviceId) {
    this.lastSeen.delete(deviceId);
  }
}

module.exports = HealthMonitor;