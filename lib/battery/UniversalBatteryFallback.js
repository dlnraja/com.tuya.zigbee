'use strict';
/**
 * @deprecated P54 — This file has 0 importers and is scheduled for removal.
 * Its functionality has been consolidated into UnifiedBatteryHandler.js.
 * See docs/BATTERY_AUDIT.md for the full P54 plan.
 * Removal is safe: search the codebase for any imports of this file first.
 */

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║         UniversalBatteryFallback v1.0.0 — P28 MULTI-SOURCE PHOENIX          ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                              ║
 * ║  Born from P28 battery cartography:                                           ║
 * ║  - 13 battery modules, 255KB code, 243 drivers, 18 chem profiles             ║
 * ║  - BUT 136 drivers still have measure_battery WITHOUT UnifiedBatteryHandler  ║
 * ║  - 162 drivers without a read battery method                                  ║
 * ║  - 123 drivers without onEndDeviceAnnounce (sleepy issue)                    ║
 * ║                                                                              ║
 * ║  This module is the LAST-LINE fallback that ANY driver can use:              ║
 * ║  - Normalizes ANY value to percentage (Tuya DP, ZCL, voltage, state)         ║
 * ║  - Handles 0-50, 0-100, 0-200, 0-255 scales                                  ║
 * ║  - Auto-detects voltage (mV, cV, dV, V) and converts to %                    ║
 * ║  - Applies non-linear curve for 15+ chemistries                              ║
 * ║  - Anti-flood (rate limit updates)                                            ║
 * ║  - Anti-fluctuation (rejects >50% jumps)                                     ║
 * ║  - Stores last value to setStoreValue for cold-boot restore                    ║
 * ║  - Returns 5-level status (good/medium/low/critical/dead)                    ║
 * ║                                                                              ║
 * ║  Usage in a device:                                                           ║
 * ║  ```                                                                          ║
 * ║    const UniversalBatteryFallback = require('../../lib/battery/UniversalBatteryFallback'); ║
 * ║    this.battery = new UniversalBatteryFallback(this, { type: 'CR2032' });      ║
 * ║                                                                                ║
 * ║    // On any report:                                                           ║
 * ║    await this.battery.handleZclReport(rawValue);                                ║
 * ║    // or                                                                      ║
 * ║    await this.battery.handleTuyaDP(dp, value);                                 ║
 * ║    // or                                                                      ║
 * ║    await this.battery.handleVoltage(volts);                                    ║
 * ║    // or                                                                      ║
 * ║    await this.battery.handleState(0|1|2);                                      ║
 * ║  ```                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════════════════
// BATTERY CHEMISTRY SPECS — Non-linear discharge curves
// Based on datasheets and Z2M/ZHA empirical data
// ═══════════════════════════════════════════════════════════════════════════════
const BATTERY_SPECS = {
  'CR2032': {
    type: 'Lithium Coin Cell',
    nominal: 3.0,
    fresh: 3.30, full: 3.00, low: 2.50, dead: 2.00,
    capacity: 220,
    curve: [
      [3.30, 100], [3.10, 98], [3.00, 95], [2.95, 90], [2.90, 85],
      [2.85, 75], [2.80, 65], [2.75, 50], [2.70, 40], [2.60, 25],
      [2.50, 15], [2.40, 8], [2.30, 4], [2.20, 2], [2.00, 0],
    ],
  },
  'CR2450': {
    type: 'Lithium Coin Cell',
    nominal: 3.0,
    fresh: 3.30, full: 3.00, low: 2.50, dead: 2.00,
    capacity: 620,
    curve: [
      [3.30, 100], [3.00, 95], [2.90, 85], [2.80, 70], [2.70, 50],
      [2.60, 30], [2.50, 15], [2.40, 8], [2.00, 0],
    ],
  },
  'CR2477': {
    type: 'Lithium Coin Cell',
    nominal: 3.0,
    fresh: 3.30, full: 3.00, low: 2.50, dead: 2.00,
    capacity: 1000,
    curve: [
      [3.30, 100], [3.00, 95], [2.90, 85], [2.80, 70], [2.70, 50],
      [2.60, 30], [2.50, 15], [2.00, 0],
    ],
  },
  'CR123A': {
    type: 'Lithium Photo',
    nominal: 3.0,
    fresh: 3.30, full: 3.00, low: 2.50, dead: 2.00,
    capacity: 1500,
    curve: [
      [3.30, 100], [3.15, 95], [3.00, 90], [2.90, 80], [2.80, 65],
      [2.70, 45], [2.60, 25], [2.50, 12], [2.40, 5], [2.00, 0],
    ],
  },
  'CR1632': {
    type: 'Lithium Coin Cell',
    nominal: 3.0,
    fresh: 3.30, full: 3.00, low: 2.50, dead: 2.00,
    capacity: 140,
    curve: [
      [3.30, 100], [3.00, 95], [2.90, 85], [2.80, 70], [2.70, 50],
      [2.60, 30], [2.50, 15], [2.00, 0],
    ],
  },
  'AAA': {
    type: 'Alkaline',
    nominal: 1.5,
    fresh: 1.65, full: 1.55, low: 1.10, dead: 0.90,
    capacity: 1200,
    curve: [
      [1.65, 100], [1.55, 95], [1.50, 90], [1.45, 80], [1.40, 70],
      [1.35, 60], [1.30, 50], [1.25, 40], [1.20, 30], [1.15, 20],
      [1.10, 12], [1.05, 6], [1.00, 3], [0.90, 0],
    ],
  },
  'AA': {
    type: 'Alkaline',
    nominal: 1.5,
    fresh: 1.65, full: 1.55, low: 1.10, dead: 0.90,
    capacity: 2850,
    curve: [
      [1.65, 100], [1.55, 95], [1.50, 90], [1.45, 80], [1.40, 70],
      [1.35, 60], [1.30, 50], [1.25, 40], [1.20, 30], [1.15, 20],
      [1.10, 12], [1.05, 6], [1.00, 3], [0.90, 0],
    ],
  },
  '2xAAA': {
    type: 'Alkaline Multi-Cell',
    nominal: 3.0,
    fresh: 3.30, full: 3.10, low: 2.20, dead: 1.80,
    capacity: 1200,
    curve: [
      [3.30, 100], [3.10, 95], [3.00, 90], [2.90, 80], [2.80, 70],
      [2.70, 60], [2.60, 50], [2.50, 40], [2.40, 30], [2.30, 20],
      [2.20, 12], [2.00, 5], [1.80, 0],
    ],
  },
  '2xAA': {
    type: 'Alkaline Multi-Cell',
    nominal: 3.0,
    fresh: 3.30, full: 3.10, low: 2.20, dead: 1.80,
    capacity: 2850,
    curve: [
      [3.30, 100], [3.10, 95], [3.00, 90], [2.90, 80], [2.80, 70],
      [2.70, 60], [2.60, 50], [2.50, 40], [2.40, 30], [2.30, 20],
      [2.20, 12], [2.00, 5], [1.80, 0],
    ],
  },
  '4xAAA': {
    type: 'Alkaline Multi-Cell',
    nominal: 6.0,
    fresh: 6.60, full: 6.20, low: 4.40, dead: 3.60,
    capacity: 1200,
    curve: [
      [6.60, 100], [6.20, 95], [6.00, 90], [5.80, 80], [5.60, 70],
      [5.40, 60], [5.20, 50], [5.00, 40], [4.80, 30], [4.60, 20],
      [4.40, 12], [4.00, 5], [3.60, 0],
    ],
  },
  'Li-ion': {
    type: 'Lithium-ion Rechargeable',
    nominal: 3.7,
    fresh: 4.20, full: 4.10, low: 3.30, dead: 2.80,
    capacity: 2600,
    curve: [
      [4.20, 100], [4.15, 98], [4.10, 95], [4.00, 88], [3.90, 78],
      [3.80, 65], [3.70, 50], [3.60, 35], [3.50, 22], [3.40, 12],
      [3.30, 5], [3.00, 2], [2.80, 0],
    ],
  },
  '18650': {
    type: 'Lithium-ion 18650',
    nominal: 3.7,
    fresh: 4.20, full: 4.10, low: 3.30, dead: 2.50,
    capacity: 3400,
    curve: [
      [4.20, 100], [4.10, 95], [4.00, 88], [3.90, 78], [3.80, 65],
      [3.70, 50], [3.60, 35], [3.50, 22], [3.40, 12], [3.30, 5],
      [3.00, 2], [2.50, 0],
    ],
  },
};

// Default fallback
const DEFAULT_BATTERY = 'CR2032';

// ═══════════════════════════════════════════════════════════════════════════════
// TUYA BATTERY DP SET
// ═══════════════════════════════════════════════════════════════════════════════
const TUYA_PERCENT_DPS = new Set([4, 15, 101, 10, 21, 100, 102, 104, 105, 121]);
const TUYA_STATE_DPS = new Set([3, 14]);
const TUYA_VOLTAGE_DPS = new Set([33, 35, 247]);

// ═══════════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Coerce a value to a finite number. Returns null on failure.
 */
function coerceNumeric(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  if (Buffer.isBuffer(value)) {
    if (value.length === 0) return null;
    if (value.length <= 4) return value.readUIntBE(0, value.length);
    return value[value.length - 1];
  }
  if (Array.isArray(value)) return coerceNumeric(Buffer.from(value));
  if (typeof value === 'object') {
    return coerceNumeric(value.value ?? value.dpValue ?? value.data ?? value.raw);
  }
  return null;
}

/**
 * Normalize voltage to volts. Returns null on invalid.
 * Handles mV (800-6000), cV (100-600), dV (20-60), V (0.8-15).
 */
function normalizeVoltage(raw) {
  const v = coerceNumeric(raw);
  if (!Number.isFinite(v) || v <= 0) return null;
  if (v >= 800 && v <= 6000) return v / 1000;  // mV
  if (v > 100 && v <= 600) return v / 100;      // cV
  if (v >= 20 && v <= 60) return v / 10;        // dV
  if (v >= 0.8 && v <= 15) return v;            // V
  return null;
}

/**
 * Calculate percentage from voltage using non-linear curve.
 */
function voltageToPercent(voltage, batteryType = DEFAULT_BATTERY) {
  const spec = BATTERY_SPECS[batteryType] || BATTERY_SPECS[DEFAULT_BATTERY];
  if (!Number.isFinite(voltage) || voltage <= 0) return null;

  // Clamp to bounds
  if (voltage >= spec.fresh) return 100;
  if (voltage <= spec.dead) return 0;

  // Linear interpolation on curve
  for (let i = 0; i < spec.curve.length - 1; i++) {
    const [vH, pH] = spec.curve[i];
    const [vL, pL] = spec.curve[i + 1];
    if (voltage >= vL && voltage <= vH) {
      const t = (voltage - vL) / (vH - vL);
      return Math.round(pL + t * (pH - pL));
    }
  }
  return voltage > spec.curve[0][0] ? 100 : 0;
}

/**
 * Normalize any raw value to percentage 0-100.
 * Auto-detects scale and battery type.
 *
 * Handles:
 * - 255 / 0xFFFF: unknown/invalid → null
 * - 0-100: direct percent (Tuya DP)
 * - 101-200: ZCL 0-200 scale → divide by 2
 * - 201-1000: 0-1000 scale (rare) → divide by 10
 * - 1000-4000: millivolts (mV) → voltage curve
 * - 25-50: 0-50 scale (Tuya anomaly) → multiply by 2
 * - 50-100 with state semantics: enum3 (low/med/high → 10/50/100)
 */
function normalizeValue(rawValue, options = {}) {
  const value = coerceNumeric(rawValue);
  if (!Number.isFinite(value)) return null;

  const treat200AsSentinel = options.treat200AsSentinel !== false;
  const lastValue = options.lastValue;
  const hasLastValue = Number.isFinite(lastValue);

  // Sentinels
  if (value === 255 || value === 0xFFFF || value < 0) return null;

  // 0-50 scale anomaly (TZE200_vvmbj46n and similar) — only if last value also in this range
  if (value > 0 && value <= 50 && hasLastValue && lastValue > 0 && lastValue <= 50) {
    return Math.min(100, Math.round(value * 2));
  }

  // 200 sentinel
  if (value === 200) {
    if (treat200AsSentinel) return null;
    return 100;  // ZCL standard 200 = 100%
  }

  // 101-200 = ZCL 0-200 scale (e.g., 160 = 80%)
  if (value > 100 && value <= 200) {
    return Math.round(value / 2);
  }

  // 201-1000 = 0-1000 scale (rare) or 0-255 (some sensors)
  if (value > 200 && value < 1000) {
    return Math.round((value / 255) * 100);
  }

  // 1000-4000 = millivolts (e.g., 3000 = 3.0V)
  if (value >= 1000 && value <= 4000) {
    const voltage = value / 1000;
    return voltageToPercent(voltage, options.batteryType || DEFAULT_BATTERY);
  }

  // 25-50 with last value > 40: voltage as percent (2.5-3.6V → 0-100%)
  if (value >= 25 && value <= 50 && hasLastValue && lastValue > 40) {
    return Math.round(((value - 25) / 11) * 100);
  }

  // 0-100 = direct percent
  if (value >= 0 && value <= 100) {
    return Math.round(value);
  }

  // Out of range — clamp
  return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * Convert Tuya DP value to percentage.
 * Special handling for known DPs and algorithms.
 */
function tuyaDpToPercent(dp, value, options = {}) {
  const dpId = Number(dp);
  const raw = coerceNumeric(value);
  if (!Number.isFinite(dpId) || !Number.isFinite(raw)) return null;

  // Sentinels
  if (raw === 255 || raw === 0xFFFF || raw < 0) return null;

  // Voltage DPs
  if (TUYA_VOLTAGE_DPS.has(dpId)) {
    const voltage = normalizeVoltage(raw);
    if (voltage === null) return null;
    return voltageToPercent(voltage, options.batteryType || DEFAULT_BATTERY);
  }

  // State DPs
  if (TUYA_STATE_DPS.has(dpId)) {
    if (raw === 0) return 10;
    if (raw === 1) return 50;
    if (raw === 2) return 100;
    // Out-of-range state values
    if (raw >= 3 && raw <= 100) return Math.round(raw);
    return null;
  }

  // Battery percent DPs
  if (TUYA_PERCENT_DPS.has(dpId)) {
    // Reject suspicious low values from extended DPs (often state, not percent)
    if (raw <= 2 && dpId !== 4 && dpId !== 15 && dpId !== 101) return null;
    return normalizeValue(raw, options);
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// UniversalBatteryFallback CLASS
// ═══════════════════════════════════════════════════════════════════════════════
class UniversalBatteryFallback {
  /**
   * @param {Object} device - Homey device instance
   * @param {Object} options - { type: 'CR2032', antiFlood: true, smoothing: true }
   */
  constructor(device, options = {}) {
    this.device = device;
    this.options = {
      type: options.type || DEFAULT_BATTERY,
      antiFlood: options.antiFlood !== false,
      smoothing: options.smoothing !== false,
      minInterval: options.minInterval || 60000,  // 1 minute between updates
      maxChange: options.maxChange || 50,         // reject >50% jumps
      ...options,
    };
    this.lastValue = null;
    this.lastVoltage = null;
    this.lastUpdate = 0;
    this.lastSource = null;
    this._smoothingFactor = 0.3;
    this._smoothedValue = null;
  }

  /**
   * Set battery type at runtime (e.g., from a user setting).
   */
  setBatteryType(type) {
    if (BATTERY_SPECS[type]) this.options.type = type;
  }

  /**
   * Restore last known value from store on init.
   */
  async restoreFromStore() {
    if (!this.device.getStoreValue) return null;
    try {
      const stored = await Promise.resolve(this.device.getStoreValue('last_battery_percentage')).catch(() => null);
      if (Number.isFinite(Number(stored))) {
        this.lastValue = Number(stored);
        this._smoothedValue = Number(stored);
        return this.lastValue;
      }
    } catch { /* ignore */ }
    return null;
  }

  /**
   * Get last known value.
   */
  getValue() {
    return this.lastValue;
  }

  /**
   * Get last known voltage.
   */
  getVoltage() {
    return this.lastVoltage;
  }

  /**
   * Get current source ('zcl' | 'tuya' | 'voltage' | 'state' | 'stored' | 'restored').
   */
  getSource() {
    return this.lastSource;
  }

  /**
   * Get status: 'good' (>80), 'medium' (50-80), 'low' (20-50), 'critical' (10-20), 'dead' (<10), 'unknown'.
   */
  getStatus() {
    if (this.lastValue === null) return 'unknown';
    if (this.lastValue > 80) return 'good';
    if (this.lastValue > 50) return 'medium';
    if (this.lastValue > 20) return 'low';
    if (this.lastValue > 10) return 'critical';
    return 'dead';
  }

  /**
   * Handle a Zigbee powerConfiguration cluster report.
   * @param {number} rawValue - raw batteryPercentageRemaining (0-200, 0-100, or sentinel)
   */
  async handleZclReport(rawValue) {
    const percent = normalizeValue(rawValue, {
      treat200AsSentinel: this.options.treat200AsSentinel !== false,
      lastValue: this.lastValue,
      batteryType: this.options.type,
    });
    if (percent === null) return null;
    return this._update(percent, 'zcl');
  }

  /**
   * Handle a ZCL voltage report.
   * @param {number} rawVoltage - raw batteryVoltage (0.1V units = divide by 10, or mV)
   */
  async handleZclVoltage(rawVoltage) {
    const voltage = normalizeVoltage(rawVoltage);
    if (voltage === null) return null;
    this.lastVoltage = voltage;

    // If no percentage yet, derive from voltage
    if (this.lastValue === null) {
      const percent = voltageToPercent(voltage, this.options.type);
      if (percent !== null) return this._update(percent, 'voltage');
    }
    return voltage;
  }

  /**
   * Handle a Tuya DP report.
   * @param {number} dp - DP ID
   * @param {*} value - DP value
   */
  async handleTuyaDP(dp, value) {
    const percent = tuyaDpToPercent(dp, value, {
      lastValue: this.lastValue,
      batteryType: this.options.type,
    });
    if (percent === null) return null;
    return this._update(percent, `tuya-dp-${dp}`);
  }

  /**
   * Handle a Tuya battery state enum (0=low, 1=medium, 2=high).
   * @param {number} state - 0, 1, or 2
   */
  async handleState(state) {
    const n = coerceNumeric(state);
    if (!Number.isFinite(n)) return null;
    let percent;
    if (n === 0) percent = 10;
    else if (n === 1) percent = 50;
    else if (n === 2) percent = 100;
    else return null;
    return this._update(percent, 'state');
  }

  /**
   * Handle a direct voltage reading (in volts).
   * @param {number} voltage - voltage in volts
   */
  async handleVoltage(voltage) {
    const percent = voltageToPercent(voltage, this.options.type);
    if (percent === null) return null;
    this.lastVoltage = voltage;
    return this._update(percent, 'voltage-direct');
  }

  /**
   * Internal update method with anti-flood, smoothing, and capability update.
   */
  async _update(percent, source = 'unknown') {
    if (!Number.isFinite(percent)) return null;
    const value = Math.max(0, Math.min(100, Math.round(percent)));

    // Anti-flood
    if (this.options.antiFlood && this.lastValue !== null) {
      const now = Date.now();
      const elapsed = now - this.lastUpdate;
      const change = Math.abs(value - this.lastValue);

      if (value === this.lastValue) return this.lastValue;
      if (elapsed < this.options.minInterval && change < 2) return this.lastValue;
      if (elapsed < 86400000 && change > this.options.maxChange) {
        // Reject suspicious jump (could be bad reading)
        if (this.device && this.device.log) {
          this.device.log(`[BATTERY-FB] Rejected abnormal ${this.lastValue}→${value} from ${source}`);
        }
        return this.lastValue;
      }
      this.lastUpdate = now;
    } else {
      this.lastUpdate = Date.now();
    }

    // Smoothing (EMA, but allow battery replacement >20% jump)
    if (this.options.smoothing && this._smoothedValue !== null) {
      if (value > this._smoothedValue + 20) {
        // Battery replacement - accept immediately
        this._smoothedValue = value;
      } else {
        const smoothed = this._smoothedValue + this._smoothingFactor * (value - this._smoothedValue);
        const rounded = Math.round(smoothed);
        const maxJump = 5;
        if (Math.abs(rounded - this._smoothedValue) > maxJump) {
          this._smoothedValue = this._smoothedValue + Math.sign(rounded - this._smoothedValue) * maxJump;
        } else {
          this._smoothedValue = rounded;
        }
      }
    } else {
      this._smoothedValue = value;
    }

    this.lastValue = this._smoothedValue;
    this.lastSource = source;

    // Update capability
    if (this.device && this.device.hasCapability && this.device.hasCapability('measure_battery')) {
      try {
        await this.device.setCapabilityValue('measure_battery', parseFloat(this._smoothedValue));
      } catch (err) {
        if (this.device.log) this.device.log(`[BATTERY-FB] setCapabilityValue failed: ${err.message}`);
      }
    }

    // Update voltage capability if present
    if (this.lastVoltage !== null && this.device && this.device.hasCapability && this.device.hasCapability('measure_voltage')) {
      try {
        await this.device.setCapabilityValue('measure_voltage', parseFloat(this.lastVoltage));
      } catch { /* ignore */ }
    }

    // Store for cold-boot restore
    if (this.device && this.device.setStoreValue) {
      try {
        await this.device.setStoreValue('last_battery_percentage', this._smoothedValue);
        await this.device.setStoreValue('last_battery_time', Date.now());
        await this.device.setStoreValue('last_battery_source', source);
        if (this.lastVoltage !== null) {
          await this.device.setStoreValue('battery_voltage', this.lastVoltage);
        }
      } catch { /* ignore */ }
    }

    // Log
    if (this.device && this.device.log) {
      this.device.log(`[BATTERY-FB] ${source}: ${this._smoothedValue}% (raw: ${percent}%)`);
    }

    return this._smoothedValue;
  }

  /**
   * Get full diagnostic state.
   */
  getDiagnostics() {
    return {
      value: this.lastValue,
      voltage: this.lastVoltage,
      source: this.lastSource,
      type: this.options.type,
      status: this.getStatus(),
      smoothing: this.options.smoothing,
      smoothed: this._smoothedValue,
      lastUpdate: this.lastUpdate,
    };
  }

  /**
   * Cleanup (called from device.destroy).
   */
  destroy() {
    this.lastValue = null;
    this.lastVoltage = null;
    this.lastSource = null;
    this._smoothedValue = null;
  }
}

module.exports = UniversalBatteryFallback;
module.exports.BATTERY_SPECS = BATTERY_SPECS;
module.exports.DEFAULT_BATTERY = DEFAULT_BATTERY;
module.exports.TUYA_PERCENT_DPS = TUYA_PERCENT_DPS;
module.exports.TUYA_STATE_DPS = TUYA_STATE_DPS;
module.exports.TUYA_VOLTAGE_DPS = TUYA_VOLTAGE_DPS;
module.exports.coerceNumeric = coerceNumeric;
module.exports.normalizeVoltage = normalizeVoltage;
module.exports.voltageToPercent = voltageToPercent;
module.exports.normalizeValue = normalizeValue;
module.exports.tuyaDpToPercent = tuyaDpToPercent;
