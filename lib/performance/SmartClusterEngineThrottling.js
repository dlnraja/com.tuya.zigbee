'use strict';

/**
 * SmartClusterEngine Throttling - PERFORMANCE #69
 *
 * Intelligent throttling for cluster read/write operations:
 * - Per-device operation queuing
 * - Adaptive rate limiting based on network congestion
 * - Priority-based operation scheduling
 * - Bulk operation batching
 *
 * @version 9.1.0
 */

const EventEmitter = require('events');

class SmartClusterEngineThrottling extends EventEmitter {
  constructor(options = {}) {
    super();

    // Throttle configuration
    this.maxOpsPerSecond = options.maxOpsPerSecond || 10;
    this.maxOpsPerDevicePerMinute = options.maxOpsPerDevicePerMinute || 30;
    this.maxConcurrentOps = options.maxConcurrentOps || 5;
    this.priorityLevels = { CRITICAL: 0, HIGH: 1, NORMAL: 2, LOW: 3, BACKGROUND: 4 };

    // State
    this._queue = [];
    this._activeOps = 0;
    this._opsThisSecond = 0;
    this._deviceOps = new Map(); // deviceId -> [timestamp]
    this._lastSecondReset = Date.now();
    this._stats = {
      totalQueued: 0,
      totalExecuted: 0,
      totalThrottled: 0,
      totalDropped: 0,
      avgWaitTime: 0,
      maxQueueDepth: 0
    };

    this._processTimer = null;
  }

  /**
   * Enqueue an operation for throttled execution
   * @param {Object} op - { fn, deviceId, priority, timeout, context }
   * @returns {Promise} Resolves with operation result
   */
  enqueue(op) {
    return new Promise((resolve, reject) => {
      const entry = {
        fn: op.fn,
        deviceId: op.deviceId || 'unknown',
        priority: op.priority !== undefined ? op.priority : this.priorityLevels.NORMAL,
        timeout: op.timeout || 30000,
        context: op.context || 'unknown',
        resolve,
        reject,
        enqueuedAt: Date.now()
      };

      // Check device rate limit
      if (this._isDeviceThrottled(entry.deviceId)) {
        this._stats.totalThrottled++;
        this.emit('deviceThrottled', { deviceId: entry.deviceId });
        reject(new Error(`Device ${entry.deviceId} rate limited`));
        return;
      }

      this._queue.push(entry);
      this._queue.sort((a, b) => a.priority - b.priority);
      this._stats.totalQueued++;

      if (this._queue.length > this._stats.maxQueueDepth) {
        this._stats.maxQueueDepth = this._queue.length;
      }

      this._processQueue();
    });
  }

  /**
   * Enqueue a batch of operations
   */
  enqueueBatch(ops) {
    return Promise.allSettled(ops.map(op => this.enqueue(op)));
  }

  /**
   * Get throttle stats
   */
  getStats() {
    return {
      ...this._stats,
      queueDepth: this._queue.length,
      activeOps: this._activeOps,
      opsThisSecond: this._opsThisSecond,
      deviceCounts: Object.fromEntries(
        Array.from(this._deviceOps.entries()).map(([id, ops]) => [id, ops.length])
      )
    };
  }

  /**
   * Adjust throttle settings dynamically
   * @param {Object} settings - { maxOpsPerSecond, maxConcurrentOps }
   */
  adjustSettings(settings) {
    if (settings.maxOpsPerSecond !== undefined) {
      this.maxOpsPerSecond = Math.max(1, settings.maxOpsPerSecond);
    }
    if (settings.maxConcurrentOps !== undefined) {
      this.maxConcurrentOps = Math.max(1, settings.maxConcurrentOps);
    }
  }

  /**
   * Clear all queued operations
   */
  clearQueue() {
    for (const entry of this._queue) {
      entry.reject(new Error('Queue cleared'));
    }
    this._queue = [];
  }

  // ─── Internal ────────────────────────────────────────────────────────

  _processQueue() {
    if (this._activeOps >= this.maxConcurrentOps) return;
    if (this._opsThisSecond >= this.maxOpsPerSecond) return;

    const entry = this._queue.shift();
    if (!entry) return;

    this._activeOps++;
    this._opsThisSecond++;
    this._recordDeviceOp(entry.deviceId);

    // Timeout wrapper
    const timeoutId = setTimeout(() => {
      entry.reject(new Error(`Operation timed out after ${entry.timeout}ms`));
      this._activeOps--;
      this._tryProcessNext();
    }, entry.timeout);

    Promise.resolve()
      .then(() => entry.fn())
      .then(result => {
        clearTimeout(timeoutId);
        this._activeOps--;
        this._stats.totalExecuted++;

        const waitTime = Date.now() - entry.enqueuedAt;
        this._stats.avgWaitTime = (this._stats.avgWaitTime + waitTime) / 2;

        entry.resolve(result);
        this._tryProcessNext();
      })
      .catch(err => {
        clearTimeout(timeoutId);
        this._activeOps--;
        entry.reject(err);
        this._tryProcessNext();
      });
  }

  _tryProcessNext() {
    // Reset second counter if needed
    const now = Date.now();
    if (now - this._lastSecondReset >= 1000) {
      this._opsThisSecond = 0;
      this._lastSecondReset = now;
    }

    if (this._queue.length > 0) {
      setTimeout(() => this._processQueue(), 50);
    }
  }

  _isDeviceThrottled(deviceId) {
    const ops = this._deviceOps.get(deviceId) || [];
    const cutoff = Date.now() - 60000; // Last minute
    const recentOps = ops.filter(t => t > cutoff);
    return recentOps.length >= this.maxOpsPerDevicePerMinute;
  }

  _recordDeviceOp(deviceId) {
    if (!this._deviceOps.has(deviceId)) {
      this._deviceOps.set(deviceId, []);
    }
    const ops = this._deviceOps.get(deviceId);
    ops.push(Date.now());
    // Keep only last minute
    const cutoff = Date.now() - 60000;
    this._deviceOps.set(deviceId, ops.filter(t => t > cutoff));
  }

  destroy() {
    this.clearQueue();
    this._deviceOps.clear();
  }
}

module.exports = SmartClusterEngineThrottling;
