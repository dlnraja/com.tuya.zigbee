'use strict';

/**
 * RateLimiter v1.0.0
 * 
 * Prevents network flooding by debouncing high-frequency updates 
 * (e.g. illuminance, power) and only reporting significant changes.
 */

class RateLimiter {
  constructor(device, options = {}) {
    this.device = device;
    this.minIntervalMs = options.minIntervalMs || 30000; // 30s default
    this.thresholds = options.thresholds || {
      'measure_power': 5,      // 5W change
      'measure_luminance': 10,  // 10Lx change
      'measure_current': 50,   // 50mA
      'measure_voltage': 2,    // 2V
    };
    this._lastUpdateValues = {};
    this._lastUpdateTime = {};
  }

  /**
   * Checks if the value should be reported based on time or threshold.
   */
  shouldReport(capability, value) {
    const now = Date.now();
    const lastTime = this._lastUpdateTime[capability] || 0;
    const lastVal = this._lastUpdateValues[capability];

    // Always report if we've never seen it
    if (lastVal === undefined) {
      this._update(capability, value, now);
      return true;
    }

    // Report if enough time has passed
    if (now - lastTime > this.minIntervalMs) {
      this._update(capability, value, now);
      return true;
    }

    // Report if threshold exceeded
    const threshold = this.thresholds[capability];
    if (threshold !== undefined) {
      if (Math.abs(value - lastVal) >= threshold) {
        this._update(capability, value, now);
        return true;
      }
    }

    return false;
  }

  _update(capability, value, now) {
    this._lastUpdateValues[capability] = value;
    this._lastUpdateTime[capability] = now;
  }
}

module.exports = RateLimiter;
