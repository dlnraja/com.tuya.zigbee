'use strict';
// v9.0.40: Batch Capability Updater
// Collects multiple capability changes and applies them in a single batch
// to reduce UI update overhead and prevent rapid-fire SDK calls

/**
 * BatchCapabilityUpdater - Batches capability value updates
 *
 * Instead of calling safeSetCapabilityValue() for each DP individually,
 * this collects changes over a short window and applies them together.
 *
 * Usage:
 *   const batcher = new BatchCapabilityUpdater(device, { windowMs: 50 });
 *   batcher.queue('measure_temperature', 22.5);
 *   batcher.queue('measure_humidity', 65);
 *   // Both applied together after 50ms
 */
class BatchCapabilityUpdater {
  /**
   * @param {object} device - Homey device instance with safeSetCapabilityValue
   * @param {object} [options]
   * @param {number} [options.windowMs=50] - Batching window in milliseconds
   * @param {number} [options.maxBatchSize=20] - Max changes per batch
   */
  constructor(device, options = {}) {
    this._device = device;
    this._windowMs = options.windowMs || 50;
    this._maxBatchSize = options.maxBatchSize || 20;
    this._pending = new Map(); // capability -> value (latest wins)
    this._timer = null;
    this._destroyed = false;
    this._stats = { batches: 0, updates: 0, deduplicated: 0 };
  }

  /**
   * Queue a capability update for batching
   * @param {string} capability - Capability ID
   * @param {*} value - New value
   */
  queue(capability, value) {
    if (this._destroyed) return;

    // Deduplicate: if same capability is already pending with same value, skip
    if (this._pending.has(capability) && this._pending.get(capability) === value) {
      this._stats.deduplicated++;
      return;
    }

    this._pending.set(capability, value);
    this._stats.updates++;

    // Start batch window if not already running
    if (!this._timer) {
      this._timer = this.homey.setTimeout(() => { if (this._destroyed) return; this._flush(); }, this._windowMs);
    }

    // Force flush if batch is too large
    if (this._pending.size >= this._maxBatchSize) {
      this._flush();
    }
  }

  /**
   * Flush all pending updates immediately
   */
  _flush() {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }

    if (this._pending.size === 0) return;

    const changes = new Map(this._pending);
    this._pending.clear();
    this._stats.batches++;

    // Apply all changes
    for (const [capability, value] of changes) {
      if (this._device && typeof this._device.safeSetCapabilityValue === 'function') {
        this._device.safeSetCapabilityValue(capability, value).catch(() => {});
      }
    }
  }

  /**
   * Get batching statistics
   * @returns {{ batches: number, updates: number, deduplicated: number }}
   */
  getStats() {
    return { ...this._stats };
  }

  /**
   * Destroy the batcher and flush remaining updates
   */
  destroy() {
    this._destroyed = true;
    this._flush();
    this._pending.clear();
  }
}

module.exports = BatchCapabilityUpdater;
