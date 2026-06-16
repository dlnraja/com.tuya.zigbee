'use strict';

/**
 * Fragment Buffer Memory Limit - PERFORMANCE #64
 *
 * Monitors and limits memory usage of fragment reassembly buffers:
 * - Per-device buffer size tracking
 * - Global memory budget enforcement
 * - LRU eviction when limits exceeded
 * - Memory pressure callbacks
 *
 * @version 9.1.0
 */

const EventEmitter = require('events');

class FragmentBufferMemoryLimiter extends EventEmitter {
  constructor(options = {}) {
    super();

    // Memory limits
    this.maxGlobalBytes = options.maxGlobalBytes || 2 * 1024 * 1024; // 2MB global limit
    this.maxPerDeviceBytes = options.maxPerDeviceBytes || 256 * 1024; // 256KB per device
    this.maxBufferEntries = options.maxBufferEntries || 1000;
    this.warningThresholdPercent = options.warningThresholdPercent || 80;

    // Tracking
    this._deviceBuffers = new Map(); // deviceId -> { bytes, entries, lastAccess }
    this._totalBytes = 0;
    this._totalEntries = 0;

    // Stats
    this.stats = {
      totalAllocated: 0,
      totalEvictions: 0,
      peakUsage: 0,
      evictionsByDevice: new Map()
    };
  }

  /**
   * Register a buffer allocation
   * @param {string} deviceId
   * @param {string} bufferId - Unique buffer identifier
   * @param {number} bytes - Size in bytes
   * @returns {boolean} Whether allocation was accepted
   */
  allocate(deviceId, bufferId, bytes) {
    // Check per-device limit
    const deviceBuffer = this._getOrCreateDeviceBuffer(deviceId);
    if (deviceBuffer.bytes + bytes > this.maxPerDeviceBytes) {
      this.emit('perDeviceLimitExceeded', { deviceId, current: deviceBuffer.bytes, requested: bytes });
      this._evictDeviceBuffers(deviceId, bytes);
      // Recheck after eviction
      if (deviceBuffer.bytes + bytes > this.maxPerDeviceBytes) {
        return false;
      }
    }

    // Check global limit
    if (this._totalBytes + bytes > this.maxGlobalBytes) {
      this.emit('globalLimitExceeded', { current: this._totalBytes, requested: bytes });
      this._evictLRU(bytes);
      if (this._totalBytes + bytes > this.maxGlobalBytes) {
        return false;
      }
    }

    // Allocate
    deviceBuffer.bytes += bytes;
    deviceBuffer.entries++;
    deviceBuffer.lastAccess = Date.now();
    this._totalBytes += bytes;
    this._totalEntries++;

    // Track peak
    if (this._totalBytes > this.stats.peakUsage) {
      this.stats.peakUsage = this._totalBytes;
    }
    this.stats.totalAllocated += bytes;

    // Check warning threshold
    const usagePercent = (this._totalBytes / this.maxGlobalBytes) * 100;
    if (usagePercent >= this.warningThresholdPercent) {
      this.emit('memoryWarning', {
        usagePercent: Math.round(usagePercent),
        totalBytes: this._totalBytes,
        maxBytes: this.maxGlobalBytes
      });
    }

    return true;
  }

  /**
   * Release a buffer
   * @param {string} deviceId
   * @param {string} bufferId
   * @param {number} bytes
   */
  release(deviceId, bufferId, bytes) {
    const deviceBuffer = this._deviceBuffers.get(deviceId);
    if (deviceBuffer) {
      deviceBuffer.bytes = Math.max(0, deviceBuffer.bytes - bytes);
      deviceBuffer.entries = Math.max(0, deviceBuffer.entries - 1);
    }

    this._totalBytes = Math.max(0, this._totalBytes - bytes);
    this._totalEntries = Math.max(0, this._totalEntries - 1);
  }

  /**
   * Check if allocation would succeed
   * @param {number} bytes
   * @returns {boolean}
   */
  canAllocate(bytes) {
    return (this._totalBytes + bytes <= this.maxGlobalBytes);
  }

  /**
   * Get memory usage stats
   */
  getStats() {
    const deviceStats = {};
    for (const [deviceId, buf] of this._deviceBuffers.entries()) {
      deviceStats[deviceId] = {
        bytes: buf.bytes,
        entries: buf.entries,
        percentOfGlobal: Math.round((buf.bytes / this.maxGlobalBytes) * 100)
      };
    }

    return {
      totalBytes: this._totalBytes,
      maxGlobalBytes: this.maxGlobalBytes,
      usagePercent: Math.round((this._totalBytes / this.maxGlobalBytes) * 100),
      totalEntries: this._totalEntries,
      peakUsage: this.stats.peakUsage,
      totalAllocated: this.stats.totalAllocated,
      totalEvictions: this.stats.totalEvictions,
      deviceCount: this._deviceBuffers.size,
      devices: deviceStats
    };
  }

  /**
   * Force clear all buffers for a device
   */
  clearDevice(deviceId) {
    const buf = this._deviceBuffers.get(deviceId);
    if (buf) {
      this._totalBytes -= buf.bytes;
      this._totalEntries -= buf.entries;
      this._deviceBuffers.delete(deviceId);
    }
  }

  /**
   * Clear all buffers
   */
  clearAll() {
    this._deviceBuffers.clear();
    this._totalBytes = 0;
    this._totalEntries = 0;
  }

  _getOrCreateDeviceBuffer(deviceId) {
    if (!this._deviceBuffers.has(deviceId)) {
      this._deviceBuffers.set(deviceId, { bytes: 0, entries: 0, lastAccess: Date.now() });
    }
    return this._deviceBuffers.get(deviceId);
  }

  _evictDeviceBuffers(deviceId, neededBytes) {
    // Can't evict specific buffers without tracking them individually
    // Emit event for higher-level management
    this.emit('evictionNeeded', { deviceId, neededBytes });
    this.stats.totalEvictions++;
    const count = (this.stats.evictionsByDevice.get(deviceId) || 0) + 1;
    this.stats.evictionsByDevice.set(deviceId, count);
  }

  _evictLRU(neededBytes) {
    // Find LRU device
    let oldestDevice = null;
    let oldestTime = Infinity;

    for (const [deviceId, buf] of this._deviceBuffers.entries()) {
      if (buf.lastAccess < oldestTime) {
        oldestTime = buf.lastAccess;
        oldestDevice = deviceId;
      }
    }

    if (oldestDevice) {
      const freed = this._deviceBuffers.get(oldestDevice).bytes;
      this.clearDevice(oldestDevice);
      this.stats.totalEvictions++;
      this.emit('deviceEvicted', { deviceId: oldestDevice, freedBytes: freed });
    }
  }
}

module.exports = FragmentBufferMemoryLimiter;
