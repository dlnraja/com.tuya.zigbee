'use strict';

/**
 * State History Trigger - FEATURE #46
 *
 * Triggers flow cards based on state history patterns:
 * - Value changed from/to specific states
 * - Value exceeded threshold for N minutes
 * - Periodic state summaries
 * - Anomaly detection (unusual patterns)
 *
 * @version 9.1.0
 */

const EventEmitter = require('events');

class StateHistoryTrigger extends EventEmitter {
  constructor(homey, options = {}) {
    super();
    this.homey = homey;

    this.maxHistoryPerCapability = options.maxHistoryPerCapability || 200;
    this.maxDevices = options.maxDevices || 200;

    // History store: key: "deviceId_capability", value: [{ timestamp, value }]
    this._history = new Map();
  }

  /**
   * Register state history flow cards
   */
  async registerFlowCards() {
    // Value changed from X to Y
    const changedCard = this.homey.flow.getTriggerCard('state_value_changed_from_to');
    if (changedCard) {
      changedCard.registerRunListener(async (args, state) => {
        const { device, capability, fromValue, toValue } = args;
        if (!device || !capability) return false;

        const history = this.getHistory(device.id, capability);
        if (history.length < 2) return false;

        const latest = history[history.length - 1];
        const previous = history[history.length - 2];

        if (fromValue !== undefined && previous.value !== fromValue) return false;
        if (toValue !== undefined && latest.value !== toValue) return false;

        return {
          from: previous.value,
          to: latest.value,
          changeTime: latest.timestamp
        };
      });
    }

    // Value exceeded threshold for duration
    const exceededCard = this.homey.flow.getTriggerCard('state_value_exceeded_duration');
    if (exceededCard) {
      exceededCard.registerRunListener(async (args) => {
        const { device, capability, operator, threshold, durationMinutes } = args;
        if (!device || !capability) return false;

        const history = this.getHistory(device.id, capability);
        if (history.length === 0) return false;

        const now = Date.now();
        const windowMs = (durationMinutes || 1) * 60 * 1000;

        // Check if all values in the window meet the condition
        const windowEntries = history.filter(h => h.timestamp >= (now - windowMs));
        if (windowEntries.length === 0) return false;

        return windowEntries.every(entry => {
          switch (operator) {
          case 'gt': return entry.value > threshold;
          case 'gte': return entry.value >= threshold;
          case 'lt': return entry.value < threshold;
          case 'lte': return entry.value <= threshold;
          default: return entry.value == threshold;
          }
        });
      });
    }

    // Value count in window
    const countCard = this.homey.flow.getTriggerCard('state_value_count_in_window');
    if (countCard) {
      countCard.registerRunListener(async (args) => {
        const { device, capability, targetValue, windowMinutes, minCount } = args;
        if (!device || !capability) return false;

        const history = this.getHistory(device.id, capability);
        const now = Date.now();
        const windowMs = (windowMinutes || 5) * 60 * 1000;

        const count = history.filter(h =>
          h.timestamp >= (now - windowMs) && h.value === targetValue
        ).length;

        return count >= (minCount || 1);
      });
    }

    this.homey.log('[StateHistory] Flow cards registered');
  }

  /**
   * Record a state change
   * @param {string} deviceId
   * @param {string} capability
   * @param {*} value
   * @param {number} [timestamp]
   */
  recordState(deviceId, capability, value, timestamp = Date.now()) {
    const key = `${deviceId}_${capability}`;

    if (!this._history.has(key)) {
      this._history.set(key, []);
    }

    const history = this._history.get(key);
    history.push({ timestamp, value });

    // Trim
    if (history.length > this.maxHistoryPerCapability) {
      history.splice(0, history.length - this.maxHistoryPerCapability);
    }

    // Check for patterns
    this._checkPatterns(key, deviceId, capability, history);
  }

  /**
   * Get history for a device capability
   * @param {string} deviceId
   * @param {string} capability
   * @param {number} [limit]
   * @returns {Array}
   */
  getHistory(deviceId, capability, limit) {
    const key = `${deviceId}_${capability}`;
    const history = this._history.get(key) || [];
    return limit ? history.slice(-limit) : [...history];
  }

  /**
   * Get aggregated stats for a capability
   * @param {string} deviceId
   * @param {string} capability
   * @param {number} windowMinutes
   */
  getStats(deviceId, capability, windowMinutes = 60) {
    const history = this.getHistory(deviceId, capability);
    const now = Date.now();
    const windowMs = windowMinutes * 60 * 1000;
    const windowData = history.filter(h => h.timestamp >= (now - windowMs));

    if (windowData.length === 0) {
      return { count: 0, min: null, max: null, avg: null, latest: null };
    }

    const values = windowData.map(h => h.value).filter(v => typeof v === 'number');

    return {
      count: windowData.length,
      min: values.length > 0 ? Math.min(...values) : null,
      max: values.length > 0 ? Math.max(...values) : null,
      avg: values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length * 100) / 100 : null,
      latest: windowData[windowData.length - 1].value,
      firstTimestamp: windowData[0].timestamp,
      lastTimestamp: windowData[windowData.length - 1].timestamp
    };
  }

  /**
   * Check for interesting patterns and emit events
   */
  _checkPatterns(key, deviceId, capability, history) {
    if (history.length < 2) return;

    const latest = history[history.length - 1];
    const previous = history[history.length - 2];

    // Value changed
    if (latest.value !== previous.value) {
      this.emit('valueChanged', {
        deviceId,
        capability,
        from: previous.value,
        to: latest.value,
        timestamp: latest.timestamp
      });
    }

    // Rapid oscillation detection (3+ changes in 30 seconds)
    const now = Date.now();
    const recentChanges = history.filter(h => h.timestamp >= (now - 30000));
    if (recentChanges.length >= 4) {
      this.emit('rapidOscillation', {
        deviceId,
        capability,
        changeCount: recentChanges.length,
        timestamp: now
      });
    }
  }

  /**
   * Clear history for a device
   */
  clearDeviceHistory(deviceId) {
    for (const [key] of this._history.entries()) {
      if (key.startsWith(`${deviceId}_`)) {
        this._history.delete(key);
      }
    }
  }

  /**
   * Get overall stats
   */
  getOverallStats() {
    return {
      trackedCapabilities: this._history.size,
      totalEntries: Array.from(this._history.values()).reduce((sum, h) => sum + h.length, 0)
    };
  }

  destroy() {
    this._history.clear();
  }
}

module.exports = StateHistoryTrigger;
