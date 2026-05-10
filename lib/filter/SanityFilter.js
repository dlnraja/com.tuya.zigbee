'use strict';

/**
 * L11: SanityFilter
 * Filters out ghost spikes and erroneous sensor readings (e.g., sudden jumps to 120°C or -100°C)
 * common in budget Tuya environmental sensors.
 */
class SanityFilter {
  constructor(options = {}) {
    this.maxDeviation = options.maxDeviation !== undefined ? options.maxDeviation : 0.50; // 50% deviation limit
    this.historyLimit = options.historyLimit || 3;
    this.deviceHistory = new Map(); // key: deviceId + "_" + capability, value: Array of numbers
  }

  /**
   * Filters an incoming telemetry value
   * @param {string} deviceId - Unique device ID
   * @param {string} capability - Capability name (e.g. "measure_temperature")
   * @param {number} rawValue - Newly received telemetry value
   * @returns {number} - The filtered stable value
   */
  filter(deviceId, capability, rawValue) {
    if (typeof rawValue !== 'number' || isNaN(rawValue)) return rawValue;

    const key = `${deviceId}_${capability}`;
    if (!this.deviceHistory.has(key)) {
      this.deviceHistory.set(key, [rawValue]);
      return rawValue;
    }

    const history = this.deviceHistory.get(key);
    
    // If we don't have enough history points yet, just capture and return
    if (history.length < this.historyLimit) {
      history.push(rawValue);
      return rawValue;
    }

    // Calculate median of history to avoid skewing by outliers
    const sorted = [...history].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];

    const absDiff = Math.abs(rawValue - median);

    // Capability-specific rules
    const isTemp = capability.includes('temperature');
    const isHumid = capability.includes('humidity');

    if (isTemp && absDiff > 15) {
      // 15°C temperature change in a single message is physically impossible indoors
      console.warn(`[SanityFilter] ⚠️ Discarded temperature spike: ${rawValue}°C (Stable median: ${median}°C) for device ${deviceId}`);
      return median; // Return last known stable median value
    }

    if (isHumid && (rawValue < 0 || rawValue > 100)) {
      // Humidity must fall in 0-100% boundary limits
      console.warn(`[SanityFilter] ⚠️ Discarded invalid humidity reading: ${rawValue}% for device ${deviceId}`);
      return median;
    }

    // Standard deviation check for general capabilities (power, voltage, etc.)
    const deviationThreshold = Math.abs(median * this.maxDeviation);
    if (!isTemp && !isHumid && absDiff > deviationThreshold && median !== 0) {
      console.warn(`[SanityFilter] ⚠️ Discarded spike for ${capability}: ${rawValue} (Stable median: ${median}) for device ${deviceId}`);
      return median;
    }

    // Value is sane: record in rolling window
    history.push(rawValue);
    if (history.length > this.historyLimit) {
      history.shift(); // Evict oldest
    }
    return rawValue;
  }

  /**
   * Clear tracked history for a device
   */
  clearDevice(deviceId) {
    for (const key of this.deviceHistory.keys()) {
      if (key.startsWith(`${deviceId}_`)) {
        this.deviceHistory.delete(key);
      }
    }
  }
}

module.exports = SanityFilter;