const EventEmitter = require('events');

/**
 * L13: HealthMonitor (Hardened)
 * Monitors Zigbee sensor heartbeats and check-in timestamps with tiered status.
 * v8.1.0: Added HEALTH_STATUS categorization, EventEmitter, and persistence hooks.
 * v9.1.0: Added proactive reconnection, device aging, and connectivity diagnostics (Issue #5)
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

    // v9.1.0: Proactive reconnection and connectivity tracking (Issue #5)
    this.deviceMetadata = new Map(); // key: deviceId, value: { modelId, manufacturerName, firstSeen, reconnectAttempts, ... }
    this.reconnectHistory = new Map(); // key: deviceId, value: [{ timestamp, success, method }]
    this._healthCheckInterval = null;
    this._proactiveReconnectEnabled = options.proactiveReconnect !== false;
  }

  /**
   * Set a custom timeout for a specific model
   */
  setModelTimeout(modelId, timeoutMs) {
    this.modelOverrides.set(modelId, timeoutMs);
  }

  /**
   * v9.1.0: Register device metadata for better tracking
   */
  registerDevice(deviceId, metadata = {}) {
    if (!this.deviceMetadata.has(deviceId)) {
      this.deviceMetadata.set(deviceId, {
        modelId: metadata.modelId || null,
        manufacturerName: metadata.manufacturerName || null,
        firstSeen: Date.now(),
        lastReconnectAttempt: null,
        reconnectAttempts: 0,
        totalReconnects: 0,
        consecutiveFailures: 0,
        ...metadata
      });
      this.reconnectHistory.set(deviceId, []);
    }
  }

  /**
   * Record a check-in event
   */
  recordCheckIn(deviceId, modelId = null) {
    const now = Date.now();
    const previous = this.lastSeen.get(deviceId);
    this.lastSeen.set(deviceId, now);

    // Update device metadata if available
    const metadata = this.deviceMetadata.get(deviceId);
    if (metadata) {
      metadata.consecutiveFailures = 0; // Reset on successful check-in
    }

    if (!previous) {
      this.emit('deviceAdded', { deviceId, timestamp: now });
    } else {
      const status = this.getDeviceStatus(deviceId, modelId);
      this.emit('checkIn', { deviceId, timestamp: now, previous, status });

      // v9.1.0: Emit connectivity restored event if device was previously offline
      if (status === HealthMonitor.STATUS.HEALTHY && metadata?.lastReconnectAttempt) {
        this.emit('connectivityRestored', { deviceId, timestamp: now });
      }
    }
  }

  /**
   * v9.1.0: Record reconnection attempt
   */
  recordReconnectAttempt(deviceId, success, method = 'unknown') {
    const now = Date.now();
    const history = this.reconnectHistory.get(deviceId) || [];
    history.push({ timestamp: now, success, method });

    // Keep only last 50 reconnect attempts
    if (history.length > 50) {
      history.shift();
    }
    this.reconnectHistory.set(deviceId, history);

    const metadata = this.deviceMetadata.get(deviceId);
    if (metadata) {
      metadata.lastReconnectAttempt = now;
      metadata.reconnectAttempts++;
      if (success) {
        metadata.totalReconnects++;
        metadata.consecutiveFailures = 0;
      } else {
        metadata.consecutiveFailures++;
      }
    }

    this.emit('reconnectAttempt', { deviceId, success, method, timestamp: now });
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
    this.deviceMetadata.delete(deviceId);
    this.reconnectHistory.delete(deviceId);
    this.emit('deviceRemoved', { deviceId });
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // v9.1.0: PROACTIVE RECONNECTION & HEALTH MONITORING (Issue #5)
  // Fixes intermittent disconnections on Zigbee 3.0 models
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Start proactive health checking
   * Periodically checks device status and triggers reconnection if needed
   */
  startHealthChecking(intervalMs = 300000) { // 5 minutes default
    if (this._healthCheckInterval) {
      clearInterval(this._healthCheckInterval);
    }

    this._healthCheckInterval = this.homey.setInterval(() => {
      this._performHealthCheck();
    }, intervalMs);

    this.emit('healthCheckStarted', { intervalMs });
  }

  /**
   * Stop health checking
   */
  stopHealthChecking() {
    if (this._healthCheckInterval) {
      clearInterval(this._healthCheckInterval);
      this._healthCheckInterval = null;
    }
  }

  /**
   * Perform a health check on all tracked devices
   */
  _performHealthCheck() {
    const now = Date.now();
    const devicesToReconnect = [];

    for (const [deviceId, lastSeen] of this.lastSeen.entries()) {
      const status = this.getDeviceStatus(deviceId);
      const metadata = this.deviceMetadata.get(deviceId);

      if (status === HealthMonitor.STATUS.SILENT || status === HealthMonitor.STATUS.DEAD) {
        // Check if we should attempt reconnection
        const timeSinceLastReconnect = metadata?.lastReconnectAttempt
          ? now - metadata.lastReconnectAttempt
          : Infinity;

        // Don't reconnect too frequently (minimum 10 minutes between attempts)
        if (timeSinceLastReconnect > 600000) {
          // Don't reconnect if too many consecutive failures (max 3)
          if (!metadata || metadata.consecutiveFailures < 3) {
            devicesToReconnect.push({ deviceId, status, metadata });
          }
        }
      }
    }

    if (devicesToReconnect.length > 0) {
      this.emit('devicesNeedReconnect', devicesToReconnect);
    }

    // Emit health summary
    this.emit('healthCheckComplete', {
      timestamp: now,
      totalDevices: this.lastSeen.size,
      healthy: this.getDevicesByStatus(HealthMonitor.STATUS.HEALTHY).length,
      stale: this.getDevicesByStatus(HealthMonitor.STATUS.STALE).length,
      silent: this.getDevicesByStatus(HealthMonitor.STATUS.SILENT).length,
      dead: this.getDevicesByStatus(HealthMonitor.STATUS.DEAD).length,
      needsReconnect: devicesToReconnect.length
    });
  }

  /**
   * v9.1.0: Get device connectivity diagnostics
   */
  getDeviceDiagnostics(deviceId) {
    const metadata = this.deviceMetadata.get(deviceId);
    const lastSeen = this.lastSeen.get(deviceId);
    const reconnectHistory = this.reconnectHistory.get(deviceId) || [];

    const status = this.getDeviceStatus(deviceId);
    const now = Date.now();

    return {
      deviceId,
      status,
      lastSeen,
      timeSinceLastSeen: lastSeen ? now - lastSeen : null,
      metadata: metadata || null,
      reconnectStats: {
        totalAttempts: reconnectHistory.length,
        successful: reconnectHistory.filter(r => r.success).length,
        failed: reconnectHistory.filter(r => !r.success).length,
        lastAttempt: reconnectHistory.length > 0 ? reconnectHistory[reconnectHistory.length - 1] : null,
        recentHistory: reconnectHistory.slice(-10) // Last 10 attempts
      }
    };
  }

  /**
   * v9.1.0: Get overall health summary
   */
  getHealthSummary() {
    const summary = {
      timestamp: Date.now(),
      totalDevices: this.lastSeen.size,
      statuses: {},
      devicesNeedingAttention: []
    };

    // Count devices by status
    for (const status of Object.values(HealthMonitor.STATUS)) {
      summary.statuses[status] = this.getDevicesByStatus(status).length;
    }

    // Find devices needing attention (stale, silent, or dead)
    for (const [deviceId] of this.lastSeen.entries()) {
      const status = this.getDeviceStatus(deviceId);
      if (status !== HealthMonitor.STATUS.HEALTHY) {
        const metadata = this.deviceMetadata.get(deviceId);
        summary.devicesNeedingAttention.push({
          deviceId,
          status,
          modelId: metadata?.modelId,
          lastSeen: this.lastSeen.get(deviceId),
          consecutiveFailures: metadata?.consecutiveFailures || 0
        });
      }
    }

    return summary;
  }

  /**
   * v9.1.0: Get top talkers (most active devices)
   */
  getTopTalkers(limit = 10) {
    const devices = [];
    const now = Date.now();

    for (const [deviceId, lastSeen] of this.lastSeen.entries()) {
      const metadata = this.deviceMetadata.get(deviceId);
      devices.push({
        deviceId,
        modelId: metadata?.modelId,
        lastSeen,
        timeSinceLastSeen: now - lastSeen,
        status: this.getDeviceStatus(deviceId)
      });
    }

    // Sort by last seen (most recent first)
    devices.sort((a, b) => b.lastSeen - a.lastSeen);

    return devices.slice(0, limit);
  }

  /**
   * v9.1.0: Get stale devices (potential connectivity issues)
   */
  getStaleDevices() {
    const stale = [];
    const now = Date.now();

    for (const [deviceId, lastSeen] of this.lastSeen.entries()) {
      const status = this.getDeviceStatus(deviceId);
      if (status === HealthMonitor.STATUS.STALE || status === HealthMonitor.STATUS.SILENT) {
        const metadata = this.deviceMetadata.get(deviceId);
        stale.push({
          deviceId,
          modelId: metadata?.modelId,
          manufacturerName: metadata?.manufacturerName,
          lastSeen,
          timeSinceLastSeen: now - lastSeen,
          status,
          consecutiveFailures: metadata?.consecutiveFailures || 0
        });
      }
    }

    // Sort by time since last seen (longest first)
    stale.sort((a, b) => b.timeSinceLastSeen - a.timeSinceLastSeen);

    return stale;
  }
}

module.exports = HealthMonitor;