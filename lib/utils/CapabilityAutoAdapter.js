'use strict';

/**
 * CapabilityAutoAdapter - Auto-adapt capabilities per device variant
 * Detects manufacturer capability gaps, auto-removes unused capabilities,
 * and adapts ranges per manufacturer
 */

class CapabilityAutoAdapter {
  constructor() {
    // Track capability usage per device
    this.capabilityUsage = new Map();
    this.UNUSED_THRESHOLD_HOURS = 24;
    this.MONITOR_INTERVAL = 3600000; // 1 hour
  }

  /**
   * Register that a capability received data
   */
  trackUsage(deviceId, capabilityId) {
    const key = `${deviceId}:${capabilityId}`;
    if (!this.capabilityUsage.has(key)) {
      this.capabilityUsage.set(key, { count: 0, lastSeen: Date.now(), firstSeen: Date.now() });
    }
    const usage = this.capabilityUsage.get(key);
    usage.count++;
    usage.lastSeen = Date.now();
  }

  /**
   * Get capabilities that have never received data
   */
  getUnusedCapabilities(deviceId, allCapabilities) {
    const unused = [];
    for (const cap of allCapabilities) {
      const key = `${deviceId}:${cap}`;
      const usage = this.capabilityUsage.get(key);
      if (!usage || usage.count === 0) {
        unused.push(cap);
      }
    }
    return unused;
  }

  /**
   * Get capabilities that haven't received data in a long time
   */
  getStaleCapabilities(deviceId, allCapabilities) {
    const stale = [];
    const now = Date.now();
    for (const cap of allCapabilities) {
      const key = `${deviceId}:${cap}`;
      const usage = this.capabilityUsage.get(key);
      if (usage && (now - usage.lastSeen) > (this.UNUSED_THRESHOLD_HOURS * 3600000)) {
        stale.push(cap);
      }
    }
    return stale;
  }

  /**
   * Auto-adapt capability ranges based on received values
   */
  adaptRange(deviceId, capabilityId, value, currentRange) {
    if (typeof value !== 'number' || isNaN(value)) return currentRange;

    const key = `${deviceId}:${capabilityId}`;
    if (!this.capabilityUsage.has(key)) {
      this.capabilityUsage.set(key, { count: 0, lastSeen: Date.now(), firstSeen: Date.now(), min: value, max: value });
    }

    const usage = this.capabilityUsage.get(key);
    if (usage.min === undefined || value < usage.min) usage.min = value;
    if (usage.max === undefined || value > usage.max) usage.max = value;

    // Suggest range if current range is too narrow
    if (currentRange && (usage.min < currentRange.min || usage.max > currentRange.max)) {
      return {
        min: Math.min(currentRange.min, usage.min),
        max: Math.max(currentRange.max, usage.max)
      };
    }

    return currentRange;
  }

  /**
   * Detect if a manufacturer implements a capability but never sends data
   * (phantom capability)
   */
  detectPhantomCapabilities(deviceId, allCapabilities, hoursThreshold = 48) {
    const phantoms = [];
    const now = Date.now();
    for (const cap of allCapabilities) {
      const key = `${deviceId}:${cap}`;
      const usage = this.capabilityUsage.get(key);
      if (usage && usage.count > 0) {
        // Has received data at least once, not a phantom
        continue;
      }
      if (usage && (now - usage.firstSeen) > (hoursThreshold * 3600000)) {
        // Been monitoring for over threshold with no data
        phantoms.push(cap);
      }
    }
    return phantoms;
  }

  /**
   * Get usage statistics for a device
   */
  getDeviceStats(deviceId, allCapabilities) {
    const stats = { active: 0, unused: 0, stale: 0, total: allCapabilities.length };
    const now = Date.now();

    for (const cap of allCapabilities) {
      const key = `${deviceId}:${cap}`;
      const usage = this.capabilityUsage.get(key);
      if (!usage || usage.count === 0) {
        stats.unused++;
      } else if ((now - usage.lastSeen) > (this.UNUSED_THRESHOLD_HOURS * 3600000)) {
        stats.stale++;
      } else {
        stats.active++;
      }
    }

    return stats;
  }

  /**
   * Clean up old entries to prevent memory leaks
   */
  cleanup(maxAgeMs = 86400000) {
    const now = Date.now();
    for (const [key, usage] of this.capabilityUsage.entries()) {
      if ((now - usage.lastSeen) > maxAgeMs) {
        this.capabilityUsage.delete(key);
      }
    }
  }
}

module.exports = CapabilityAutoAdapter;