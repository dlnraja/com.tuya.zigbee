const EventEmitter = require('events');

/**
 * L14: SanityFilter (Hardened)
 * Filters out ghost spikes and erroneous sensor readings using multi-layer validation.
 * v8.1.0: Added ROC filtering, EMA support, and unit-aware validation rules.
 */
class SanityFilter extends EventEmitter {
  constructor(options = {}) {
    super();
    this.maxDeviation = options.maxDeviation !== undefined ? options.maxDeviation : 0.50; // 50% deviation limit
    this.historyLimit = options.historyLimit || 15; // v9.1.0: Increased from 5 to 15 for reliable median-based filtering
    this.emaAlpha = options.emaAlpha || 0.3; // Smoothing factor for EMA
    this.deviceHistory = new Map(); // key: deviceId + "_" + capability, value: { history: [], ema: number, lastValue: number, lastTime: number }

    // v9.1.0: Per-device filter overrides (user-configurable)
    // Key: deviceId (or deviceId_capability for per-capability), Value: { maxDeviation, emaAlpha, rocLimits }
    this._deviceOverrides = new Map();
  }

  /**
   * v9.1.0: Set per-device filter configuration.
   * @param {string} deviceId - Device ID (or deviceId_capability for per-capability override)
   * @param {Object} config - Override configuration
   * @param {number} [config.maxDeviation] - Override max deviation ratio (0-1)
   * @param {number} [config.emaAlpha] - Override EMA smoothing factor (0-1)
   * @param {Object} [config.rocLimits] - Override ROC limits per capability prefix { temperature: 0.5, power: 500 }
   */
  setDeviceFilterConfig(deviceId, config = {}) {
    if (!deviceId || typeof deviceId !== 'string') return;
    const safe = {};
    if (typeof config.maxDeviation === 'number' && config.maxDeviation > 0 && config.maxDeviation <= 1) {
      safe.maxDeviation = config.maxDeviation;
    }
    if (typeof config.emaAlpha === 'number' && config.emaAlpha > 0 && config.emaAlpha <= 1) {
      safe.emaAlpha = config.emaAlpha;
    }
    if (config.rocLimits && typeof config.rocLimits === 'object') {
      safe.rocLimits = { ...config.rocLimits };
    }
    this._deviceOverrides.set(deviceId, safe);
  }

  /**
   * v9.1.0: Remove per-device filter configuration.
   * @param {string} deviceId
   */
  clearDeviceFilterConfig(deviceId) {
    this._deviceOverrides.delete(deviceId);
  }

  /**
   * v9.1.0: Get effective filter parameters for a device+capability, considering overrides.
   * @param {string} deviceId
   * @param {string} capability
   * @returns {{ maxDeviation: number, emaAlpha: number, rocLimit: number }}
   */
  _getEffectiveParams(deviceId, capability) {
    let maxDeviation = this.maxDeviation;
    let emaAlpha = this.emaAlpha;
    let rocLimit = this._getROCLimit(capability);

    // Check for per-capability override first (deviceId_capability)
    const capKey = `${deviceId}_${capability}`;
    const capOverride = this._deviceOverrides.get(capKey);
    if (capOverride) {
      if (capOverride.maxDeviation !== undefined) maxDeviation = capOverride.maxDeviation;
      if (capOverride.emaAlpha !== undefined) emaAlpha = capOverride.emaAlpha;
      if (capOverride.rocLimits) {
        for (const [prefix, limit] of Object.entries(capOverride.rocLimits)) {
          if (capability.includes(prefix)) { rocLimit = limit; break; }
        }
      }
    }

    // Check for device-wide override
    const devOverride = this._deviceOverrides.get(deviceId);
    if (devOverride) {
      if (devOverride.maxDeviation !== undefined) maxDeviation = devOverride.maxDeviation;
      if (devOverride.emaAlpha !== undefined) emaAlpha = devOverride.emaAlpha;
      if (devOverride.rocLimits) {
        for (const [prefix, limit] of Object.entries(devOverride.rocLimits)) {
          if (capability.includes(prefix)) { rocLimit = limit; break; }
        }
      }
    }

    return { maxDeviation, emaAlpha, rocLimit };
  }

  /**
   * Filters an incoming telemetry value
   * @param {string} deviceId - Unique device ID
   * @param {string} capability - Capability name
   * @param {number} rawValue - Newly received value
   * @returns {number} - The filtered stable value
   */
  filter(deviceId, capability, rawValue) {
    if (typeof rawValue !== 'number' || isNaN(rawValue)) {return rawValue;}

    const key = `${deviceId}_${capability}`;
    const now = Date.now();

    if (!this.deviceHistory.has(key)) {
      this.deviceHistory.set(key, {
        history: [rawValue],
        ema: rawValue,
        lastValue: rawValue,
        lastTime: now
      });
      return rawValue;
    }

    const state = this.deviceHistory.get(key);
    const { history, ema, lastValue, lastTime } = state;
    const elapsedSec = (now - lastTime) / 1000;

    // v9.1.0: Resolve effective per-device filter parameters
    const params = this._getEffectiveParams(deviceId, capability);

    // 1. Physically impossible ROC (Rate of Change) check
    if (elapsedSec > 0 && elapsedSec < 3600) { // Only check if last update was within 1 hour
      const roc = Math.abs(rawValue - lastValue) / elapsedSec;

      // Temperature cannot change faster than 0.5°C per second indoors
      if (capability.includes('temperature') && roc > params.rocLimit) {
        this._reportDiscard(deviceId, capability, rawValue, lastValue, 'ROC_LIMIT_TEMP');
        return lastValue;
      }
      
      // Power cannot jump from 0 to >1000W in <100ms (often a Tuya noise issue)
      if (capability === 'measure_power' && lastValue === 0 && rawValue > 1000 && elapsedSec < 1) {
        this._reportDiscard(deviceId, capability, rawValue, lastValue, 'ROC_LIMIT_POWER_SPIKE');
        return 0;
      }

      // Radar distance cannot jump more than 5m per second (human movement limit)
      if (capability.includes('distance') && roc > 5) {
        this._reportDiscard(deviceId, capability, rawValue, lastValue, 'ROC_LIMIT_DISTANCE');
        return lastValue;
      }

      // Luminance spikes > 2000 lux per second are usually artificial or sensor glitch
      if (capability === 'measure_luminance' && roc > 2000) {
        this._reportDiscard(deviceId, capability, rawValue, lastValue, 'ROC_LIMIT_LUX');
        return lastValue;
      }
    }

    // 2. Unit-aware boundary check
    if (capability.includes('humidity') && (rawValue < 0 || rawValue > 100)) {
      this._reportDiscard(deviceId, capability, rawValue, lastValue, 'BOUNDARY_HUMIDITY');
      return lastValue;
    }

    if (capability === 'measure_battery' && (rawValue < 0 || rawValue > 100)) {
      this._reportDiscard(deviceId, capability, rawValue, lastValue, 'BOUNDARY_BATTERY');
      return lastValue;
    }

    // Radar distance boundary (0 - 15m)
    if (capability.includes('distance') && (rawValue < 0 || rawValue > 15)) {
      this._reportDiscard(deviceId, capability, rawValue, lastValue, 'BOUNDARY_DISTANCE');
      return Math.min(15, Math.max(0, rawValue));
    }

    // 3. Outlier detection using Median & EMA
    if (history.length >= 3) {
      const sorted = [...history].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      const diffFromMedian = Math.abs(rawValue - median);

      // Dynamic deviation threshold (uses per-device override if set)
      const threshold = Math.max(Math.abs(median * params.maxDeviation), 1.0);
      
      if (diffFromMedian > threshold) {
        // Double check with EMA to allow gradual trends but block spikes
        const diffFromEma = Math.abs(rawValue - ema);
        if (diffFromEma > threshold * 1.5) {
          this._reportDiscard(deviceId, capability, rawValue, median, 'OUTLIER_DEVIATION');
          return median;
        }
      }
    }

    // Value is sane: Update state (uses per-device EMA alpha if configured)
    state.ema = (rawValue * params.emaAlpha) + (ema * (1 - params.emaAlpha));
    state.lastValue = rawValue;
    state.lastTime = now;
    state.history.push(rawValue);
    if (state.history.length > this.historyLimit) {state.history.shift();}

    return rawValue;
  }

  _reportDiscard(deviceId, capability, value, fallback, reason) {
    this.emit('discard', { deviceId, capability, value, fallback, reason });
    // console.warn(`[SanityFilter] ⚠️ Discarded ${capability} spike: ${value} (Reason: ${reason}) for device ${deviceId}`);
  }

  /**
   * Clear history
   */
  clearDevice(deviceId) {
    for (const key of this.deviceHistory.keys()) {
      if (key.startsWith(`${deviceId}_`)) {
        this.deviceHistory.delete(key);
      }
    }
    // v9.1.0: Also remove filter overrides for this device
    for (const overrideKey of this._deviceOverrides.keys()) {
      if (overrideKey === deviceId || overrideKey.startsWith(`${deviceId}_`)) {
        this._deviceOverrides.delete(overrideKey);
      }
    }
  }

  /**
   * v9.1.0: Get all active device filter overrides (for diagnostics)
   * @returns {Object} Map-like object of deviceId -> override config
   */
  getDeviceFilterConfigs() {
    const configs = {};
    for (const [key, value] of this._deviceOverrides) {
      configs[key] = { ...value };
    }
    return configs;
  }
}

module.exports = SanityFilter;