const EventEmitter = require('events');
const { normalize: normalizeCI } = require('../utils/CaseInsensitiveMatcher');

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

    // v9.1.0: Active/passive device classification
    // "active" = mains-powered devices (switches, plugs, lights) - report frequently
    // "passive" = battery-powered devices (sensors, door contacts) - sleep most of the time
    this.DEVICE_POWER_TYPES = {
      ACTIVE: 'active',   // Mains-powered: expect check-ins every ~2 hours
      PASSIVE: 'passive', // Battery-powered: expect check-ins every ~24 hours
    };
    // Default timeouts by power classification (used when no modelOverride exists)
    this.ACTIVE_TIMEOUT_MS = 6 * 60 * 60 * 1000;    // 6 hours for mains-powered
    this.PASSIVE_TIMEOUT_MS = 48 * 60 * 60 * 1000;   // 48 hours for battery-powered
    this.ACTIVE_STALE_MS = 2 * 60 * 60 * 1000;       // 2 hours = stale for active
    this.PASSIVE_STALE_MS = 24 * 60 * 60 * 1000;     // 24 hours = stale for passive

    // v9.1.0: Graduated reconnection state (exponential backoff)
    // Key: deviceId, Value: { attempts, nextBackoffMs, timerRef }
    this._reconnectState = new Map();
    this.RECONNECT_BASE_MS = 10 * 60 * 1000;   // 10 minutes initial backoff
    this.RECONNECT_MAX_MS = 60 * 60 * 1000;     // 60 minutes maximum backoff
    this.RECONNECT_BACKOFF_MULTIPLIER = 2;       // Double each attempt
    this.RECONNECT_MAX_ATTEMPTS = 10;            // Give up after 10 attempts
  }

  /**
   * Set a custom timeout for a specific model
   */
  setModelTimeout(modelId, timeoutMs) {
    this.modelOverrides.set(modelId, timeoutMs);
  }

  /**
   * v9.1.0: Register device metadata for better tracking
   * @param {string} deviceId
   * @param {Object} metadata
   * @param {string} [metadata.modelId]
   * @param {string} [metadata.manufacturerName]
   * @param {string} [metadata.powerType] - 'active' (mains) or 'passive' (battery). Auto-detected if not provided.
   */
  registerDevice(deviceId, metadata = {}) {
    if (!this.deviceMetadata.has(deviceId)) {
      // v9.1.0: Auto-detect power type if not explicitly provided
      let powerType = metadata.powerType;
      if (!powerType) {
        powerType = this._detectPowerType(metadata);
      }

      this.deviceMetadata.set(deviceId, {
        modelId: metadata.modelId || null,
        manufacturerName: metadata.manufacturerName || null,
        powerType,
        firstSeen: Date.now(),
        lastReconnectAttempt: null,
        reconnectAttempts: 0,
        totalReconnects: 0,
        consecutiveFailures: 0,
        ...metadata,
        powerType, // ensure override
      });
      this.reconnectHistory.set(deviceId, []);
    }
  }

  /**
   * v9.1.0: Auto-detect device power type from model metadata.
   * Battery devices typically report battery level capabilities.
   * Active (mains) devices are switches, plugs, lights, covers, etc.
   */
  _detectPowerType(metadata) {
    const modelId = normalizeCI(metadata.modelId);
    const name = normalizeCI(metadata.manufacturerName);

    // Known battery patterns: sensors, contacts, locks, remotes, buttons
    const passivePatterns = /sensor|contact|motion|lock|remote|button|smoke|water_leak|radar|curtain_battery|door|window.*sensor|humidity|temperature|thermostat|air_quality|air_quality/i;

    if (passivePatterns.test(modelId) || passivePatterns.test(name)) {
      return this.DEVICE_POWER_TYPES.PASSIVE;
    }
    // Default to active (mains-powered) for switches, plugs, lights, covers
    return this.DEVICE_POWER_TYPES.ACTIVE;
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
   * v9.1.0: Record reconnection attempt and advance exponential backoff
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
        // v9.1.0: On success, clear backoff state entirely
        this._clearBackoff(deviceId);
      } else {
        metadata.consecutiveFailures++;
        // v9.1.0: On failure, advance exponential backoff
        this._advanceBackoff(deviceId);
      }
    }

    this.emit('reconnectAttempt', { deviceId, success, method, timestamp: now });
  }

  /**
   * v9.1.0: Advance exponential backoff for a device after failed reconnection.
   * Sequence: 10min -> 20min -> 40min -> 60min (capped)
   */
  _advanceBackoff(deviceId) {
    const now = Date.now();
    let state = this._reconnectState.get(deviceId);

    if (!state) {
      state = { attempts: 0, nextBackoffMs: this.RECONNECT_BASE_MS, lastAttemptTime: now, timerRef: null };
      this._reconnectState.set(deviceId, state);
    }

    state.attempts++;
    state.lastAttemptTime = now;
    // Double the backoff, capped at max
    state.nextBackoffMs = Math.min(
      state.nextBackoffMs * this.RECONNECT_BACKOFF_MULTIPLIER,
      this.RECONNECT_MAX_MS
    );

    this.log(`Backoff advanced for ${deviceId}: attempt ${state.attempts}, next wait ${Math.round(state.nextBackoffMs / 60000)}min`);
  }

  /**
   * v9.1.0: Clear backoff state for a device (on successful reconnect or manual reset)
   */
  _clearBackoff(deviceId) {
    const state = this._reconnectState.get(deviceId);
    if (state) {
      if (state.timerRef) clearTimeout(state.timerRef);
      this._reconnectState.delete(deviceId);
    }
  }

  /**
   * Get calculated status for a device
   * v9.1.0: Uses power-type-aware thresholds for active vs passive devices.
   */
  getDeviceStatus(deviceId, modelId = null) {
    if (!this.lastSeen.has(deviceId)) {return HealthMonitor.STATUS.DEAD;}

    const now = Date.now();
    const lastSeen = this.lastSeen.get(deviceId);
    const elapsed = now - lastSeen;

    // v9.1.0: Determine thresholds based on device power classification
    const metadata = this.deviceMetadata.get(deviceId);
    const powerType = metadata?.powerType || this.DEVICE_POWER_TYPES.ACTIVE;

    let staleThreshold = this.staleThreshold;
    let timeout = this.defaultTimeoutMs;
    let deadThreshold = this.deadThreshold;

    // Use power-type defaults if no model-specific override
    const modelTimeout = this.modelOverrides.get(modelId);
    if (!modelTimeout) {
      if (powerType === this.DEVICE_POWER_TYPES.PASSIVE) {
        staleThreshold = this.PASSIVE_STALE_MS;
        timeout = this.PASSIVE_TIMEOUT_MS;
      } else {
        staleThreshold = this.ACTIVE_STALE_MS;
        timeout = this.ACTIVE_TIMEOUT_MS;
      }
    } else {
      timeout = modelTimeout;
    }

    if (elapsed < staleThreshold) {return HealthMonitor.STATUS.HEALTHY;}
    if (elapsed < timeout) {return HealthMonitor.STATUS.STALE;}
    if (elapsed < deadThreshold) {return HealthMonitor.STATUS.SILENT;}
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
    // v9.1.0: Clean up backoff state
    this._clearBackoff(deviceId);
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
      if (this._destroyed) return;
      this._performHealthCheck();
    }, intervalMs);

    this.emit('healthCheckStarted', { intervalMs });
  }

  /**
   * Stop health checking
   */
  stopHealthChecking() {
    this._destroyed = true;
    if (this._healthCheckInterval) {
      clearInterval(this._healthCheckInterval);
      this._healthCheckInterval = null;
    }
  }

  /**
   * Perform a health check on all tracked devices
   * v9.1.0: Uses graduated reconnection with exponential backoff.
   */
  _performHealthCheck() {
    const now = Date.now();
    const devicesToReconnect = [];

    for (const [deviceId, lastSeen] of this.lastSeen.entries()) {
      const status = this.getDeviceStatus(deviceId);
      const metadata = this.deviceMetadata.get(deviceId);

      if (status === HealthMonitor.STATUS.SILENT || status === HealthMonitor.STATUS.DEAD) {
        // v9.1.0: Graduated reconnection with exponential backoff
        const backoffState = this._reconnectState.get(deviceId);

        // If we've exceeded max attempts, skip
        if (backoffState && backoffState.attempts >= this.RECONNECT_MAX_ATTEMPTS) {
          continue;
        }

        // Calculate when next reconnection is allowed
        const nextAllowedTime = backoffState
          ? (backoffState.lastAttemptTime + backoffState.nextBackoffMs)
          : 0;

        if (now >= nextAllowedTime) {
          devicesToReconnect.push({
            deviceId,
            status,
            metadata,
            attemptNumber: backoffState ? backoffState.attempts + 1 : 1,
            backoffMs: backoffState ? backoffState.nextBackoffMs : this.RECONNECT_BASE_MS,
          });
        }
      } else {
        // Device is healthy - reset backoff state
        if (this._reconnectState.has(deviceId)) {
          const bs = this._reconnectState.get(deviceId);
          if (bs.timerRef) clearTimeout(bs.timerRef);
          this._reconnectState.delete(deviceId);
          this.log(`Backoff reset for ${deviceId} (device recovered)`);
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