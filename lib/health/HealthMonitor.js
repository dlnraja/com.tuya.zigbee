const EventEmitter = require('events');

/**
 * L13: HealthMonitor (Hardened)
 * Monitors Zigbee sensor heartbeats and check-in timestamps with tiered status.
 * v8.1.0: Added HEALTH_STATUS categorization, EventEmitter, and persistence hooks.
 */
class HealthMonitor extends EventEmitter {
  static STATUS = {
    HEALTHY: 'healthy',   // Recent activity
    STALE: 'stale',       // Activity missed one cycle
    SILENT: 'silent',     // Activity missed multiple cycles
    DEAD: 'dead'          // Long-term inactivity
  };

  constructor(homey, options = {}) {
    super();
    this.homey = homey;
    this.defaultTimeoutMs = options.defaultTimeoutMs || 25 * 60 * 60 * 1000; // 25 hours
    this.staleThreshold = options.staleThreshold || 12 * 60 * 60 * 1000; // 12 hours
    this.deadThreshold = options.deadThreshold || 72 * 60 * 60 * 1000; // 72 hours
    
    this.lastSeen = new Map(); // key: deviceId, value: timestamp
    this.modelOverrides = new Map(); // key: modelId, value: timeoutMs
  }

  /**
   * Set a custom timeout for a specific model
   */
  setModelTimeout(modelId, timeoutMs) {
    this.modelOverrides.set(modelId, timeoutMs);
  }

  /**
   * Record a check-in event
   */
  recordCheckIn(deviceId, modelId = null) {
    const now = Date.now();
    const previous = this.lastSeen.get(deviceId);
    this.lastSeen.set(deviceId, now);

    if (!previous) {
      this.emit('deviceAdded', { deviceId, timestamp: now });
    } else {
      const status = this.getDeviceStatus(deviceId, modelId);
      this.emit('checkIn', { deviceId, timestamp: now, previous, status });
    }
  }

  /**
   * Get calculated status for a device
   */
  getDeviceStatus(deviceId, modelId = null) {
    if (!this.lastSeen.has(deviceId)) {return HealthMonitor.STATUS.DEAD;}
    
    const now = Date.now();
    const lastSeen = this.lastSeen.get(deviceId);
    const elapsed = now - lastSeen;
    const timeout = this.modelOverrides.get(modelId) || this.defaultTimeoutMs;

    if (elapsed < this.staleThreshold) {return HealthMonitor.STATUS.HEALTHY;}
    if (elapsed < timeout) {return HealthMonitor.STATUS.STALE;}
    if (elapsed < this.deadThreshold) {return HealthMonitor.STATUS.SILENT;}
    return HealthMonitor.STATUS.DEAD;
  }

  /**
   * Check if a specific device is effectively offline
   */
  isOffline(deviceId, modelId = null) {
    const status = this.getDeviceStatus(deviceId, modelId);
    return status === HealthMonitor.STATUS.SILENT || status === HealthMonitor.STATUS.DEAD;
  }

  /**
   * Get list of all devices by status
   */
  getDevicesByStatus(status) {
    const result = [];
    for (const [deviceId, timestamp] of this.lastSeen.entries()) {
      if (this.getDeviceStatus(deviceId) === status) {
        result.push({ deviceId, timestamp });
      }
    }
    return result;
  }

  /**
   * Synchronize health data to device storage (Persistence hook)
   */
  async persistDeviceHealth(device) {
    const deviceId = device.getData().id;
    const lastSeen = this.lastSeen.get(deviceId);
    if (lastSeen) {
      await device.setStoreValue('last_seen_timestamp', lastSeen).catch(() => {});
      await device.setStoreValue('health_status', this.getDeviceStatus(deviceId)).catch(() => {});
    }
  }

  /**
   * Remove a device from tracking
   */
  removeDevice(deviceId) {
    this.lastSeen.delete(deviceId);
    this.emit('deviceRemoved', { deviceId });
  }
}

module.exports = HealthMonitor;