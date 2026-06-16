'use strict';

/**
 * Auto-Discovery Polling Optimization - PERFORMANCE #63
 *
 * Optimizes device discovery polling with:
 * - Adaptive polling intervals based on network activity
 * - Priority-based device scanning
 * - Batch discovery requests
 * - Smart cooldown between polls
 *
 * @version 9.1.0
 */

const EventEmitter = require('events');

class AutoDiscoveryPollingOptimizer extends EventEmitter {
  constructor(homey, options = {}) {
    super();
    this.homey = homey;

    // Polling configuration
    this.basePollingIntervalMs = options.baseIntervalMs || 60000; // 1 minute
    this.minPollingIntervalMs = options.minIntervalMs || 30000;   // 30 seconds
    this.maxPollingIntervalMs = options.maxIntervalMs || 600000;  // 10 minutes
    this.currentIntervalMs = this.basePollingIntervalMs;

    // Adaptive parameters
    this.activityThreshold = options.activityThreshold || 5; // events/min to trigger fast polling
    this.cooldownAfterDiscoveryMs = options.cooldownMs || 120000; // 2 minutes after new device
    this.batchSize = options.batchSize || 8;

    // State
    this._pollTimer = null;
    this._isPolling = false;
    this._lastPollTime = 0;
    this._activityCount = 0;
    this._activityWindow = [];
    this._discoveredDevices = new Set();
    this._pollHistory = [];
    this._consecutiveEmptyPolls = 0;

    // Priority queue for device scanning
    this._scanQueue = [];
    this._maxQueueSize = options.maxQueueSize || 50;
  }

  /**
   * Start optimized polling
   */
  start() {
    if (this._pollTimer) return;

    this._scheduleNextPoll();
    this.homey.log('[DiscoveryOptimizer] Polling started, interval:', this.currentIntervalMs, 'ms');
  }

  /**
   * Stop polling
   */
  stop() {
    if (this._pollTimer) {
      clearTimeout(this._pollTimer);
      this._pollTimer = null;
    }
    this._isPolling = false;
    this.homey.log('[DiscoveryOptimizer] Polling stopped');
  }

  /**
   * Record a discovery activity event
   */
  recordActivity(type = 'event') {
    const now = Date.now();
    this._activityWindow.push({ timestamp: now, type });

    // Keep only last 60 seconds of activity
    const cutoff = now - 60000;
    this._activityWindow = this._activityWindow.filter(a => a.timestamp > cutoff);
    this._activityCount = this._activityWindow.length;

    // Adapt polling speed
    this._adaptInterval();
  }

  /**
   * Record that a new device was discovered
   */
  recordDiscovery(deviceId) {
    this._discoveredDevices.add(deviceId);
    this._lastPollTime = Date.now();
    this._consecutiveEmptyPolls = 0;
    this.recordActivity('discovery');
    this.emit('deviceDiscovered', { deviceId });
  }

  /**
   * Add device to scan priority queue
   * @param {string} deviceId
   * @param {number} priority - 0 (highest) to 9 (lowest)
   * @param {string} reason
   */
  addToScanQueue(deviceId, priority = 5, reason = 'unknown') {
    // Avoid duplicates
    const existing = this._scanQueue.find(e => e.deviceId === deviceId);
    if (existing) {
      existing.priority = Math.min(existing.priority, priority);
      existing.reason = reason;
      return;
    }

    if (this._scanQueue.length >= this._maxQueueSize) {
      // Remove lowest priority entry
      this._scanQueue.sort((a, b) => a.priority - b.priority);
      this._scanQueue.pop();
    }

    this._scanQueue.push({ deviceId, priority, reason, addedAt: Date.now() });
    this._scanQueue.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get next batch of devices to scan
   */
  getNextScanBatch() {
    return this._scanQueue.splice(0, this.batchSize);
  }

  /**
   * Record poll completion
   * @param {number} deviceCount - Number of devices found
   */
  recordPollComplete(deviceCount = 0) {
    this._isPolling = false;
    this._lastPollTime = Date.now();

    this._pollHistory.push({
      timestamp: Date.now(),
      deviceCount,
      interval: this.currentIntervalMs,
      activityLevel: this._activityCount
    });

    // Keep last 100 polls
    if (this._pollHistory.length > 100) {
      this._pollHistory = this._pollHistory.slice(-100);
    }

    if (deviceCount === 0) {
      this._consecutiveEmptyPolls++;
    } else {
      this._consecutiveEmptyPolls = 0;
    }

    this._adaptInterval();
    this._scheduleNextPoll();
  }

  /**
   * Adapt polling interval based on activity
   */
  _adaptInterval() {
    if (this._activityCount >= this.activityThreshold) {
      // High activity - poll faster
      this.currentIntervalMs = Math.max(this.minPollingIntervalMs, this.currentIntervalMs * 0.8);
    } else if (this._consecutiveEmptyPolls > 3) {
      // No activity - slow down
      this.currentIntervalMs = Math.min(this.maxPollingIntervalMs, this.currentIntervalMs * 1.5);
    } else {
      // Gradually return to base
      const diff = this.basePollingIntervalMs - this.currentIntervalMs;
      this.currentIntervalMs += diff * 0.1;
    }

    this.currentIntervalMs = Math.round(
      Math.max(this.minPollingIntervalMs, Math.min(this.maxPollingIntervalMs, this.currentIntervalMs))
    );
  }

  _scheduleNextPoll() {
    if (this._pollTimer) clearTimeout(this._pollTimer);

    // Respect cooldown after discovery
    const timeSinceLastDiscovery = Date.now() - this._lastPollTime;
    let delay = this.currentIntervalMs;

    if (timeSinceLastDiscovery < this.cooldownAfterDiscoveryMs) {
      delay = Math.max(delay, this.cooldownAfterDiscoveryMs - timeSinceLastDiscovery);
    }

    this._pollTimer = setTimeout(() => {
      if (!this._isPolling) {
        this._isPolling = true;
        this.emit('pollDue', {
          interval: this.currentIntervalMs,
          queueSize: this._scanQueue.length,
          batch: this.getNextScanBatch()
        });
      }
    }, delay);
  }

  /**
   * Get polling stats
   */
  getStats() {
    return {
      currentInterval: this.currentIntervalMs,
      baseInterval: this.basePollingIntervalMs,
      isPolling: this._isPolling,
      consecutiveEmptyPolls: this._consecutiveEmptyPolls,
      activityCount: this._activityCount,
      discoveredDevices: this._discoveredDevices.size,
      queueSize: this._scanQueue.length,
      recentPolls: this._pollHistory.slice(-10)
    };
  }

  destroy() {
    this.stop();
    this._scanQueue = [];
    this._activityWindow = [];
    this._pollHistory = [];
    this._discoveredDevices.clear();
  }
}

module.exports = AutoDiscoveryPollingOptimizer;
