'use strict';

/**
 * EnergyEstimator — Estimates power/energy consumption when no native sensor exists.
 * 
 * Uses manufacturer profiles, device class, on/off duration, dim level,
 * and capability values to estimate watts, voltage, current, and kWh.
 * 
 * Import in any driver (Zigbee or WiFi) to provide estimated energy data:
 *   const EnergyEstimator = require('../../lib/utils/EnergyEstimator');
 *   this.energyEstimator = new EnergyEstimator(this);
 */

const { safeDivide, safeMultiply, safeParse } = require('./tuyaUtils');

// Manufacturer-specific power profiles (watts)
// Based on real-world measurements and manufacturer specs
const POWER_PROFILES = {
  // Lighting
  light: { min: 3, max: 15, standby: 0.5, dimmable: true },
  bulb_dimmable: { min: 3, max: 12, standby: 0.3, dimmable: true },
  bulb_rgb: { min: 5, max: 15, standby: 0.5, dimmable: true },
  bulb_rgbw: { min: 5, max: 18, standby: 0.5, dimmable: true },
  bulb_tunable_white: { min: 4, max: 14, standby: 0.3, dimmable: true },
  led_strip: { min: 5, max: 72, standby: 0.5, dimmable: true },
  led_controller: { min: 1, max: 144, standby: 0.3, dimmable: true },

  // Switches & Plugs
  plug: { min: 0.5, max: 3680, standby: 0.8, dimmable: false },
  smart_plug: { min: 0.5, max: 3680, standby: 0.8, dimmable: false },
  switch: { min: 0.5, max: 2200, standby: 0.5, dimmable: false },
  wall_switch: { min: 0.5, max: 2200, standby: 0.5, dimmable: false },
  dimmer: { min: 3, max: 200, standby: 0.5, dimmable: true },
  din_rail: { min: 0.5, max: 7360, standby: 1.0, dimmable: false },

  // Climate
  heater: { min: 800, max: 2000, standby: 2, dimmable: false },
  thermostat: { min: 1, max: 5, standby: 1, dimmable: false },
  radiator_valve: { min: 1, max: 3, standby: 0.5, dimmable: false },
  air_purifier: { min: 5, max: 60, standby: 2, dimmable: false },
  fan: { min: 10, max: 60, standby: 1, dimmable: true },
  ceiling_fan: { min: 15, max: 120, standby: 1, dimmable: true },
  humidifier: { min: 20, max: 60, standby: 2, dimmable: false },
  hvac: { min: 500, max: 3500, standby: 5, dimmable: false },

  // Covers & Motors
  curtain_motor: { min: 20, max: 80, standby: 0.5, dimmable: false },
  shutter: { min: 30, max: 100, standby: 0.5, dimmable: false },
  garage_door: { min: 100, max: 500, standby: 1, dimmable: false },
  valve: { min: 5, max: 15, standby: 0.5, dimmable: false },

  // Sensors (very low power)
  sensor: { min: 0.001, max: 0.05, standby: 0.001, dimmable: false },
  motion_sensor: { min: 0.002, max: 0.05, standby: 0.002, dimmable: false },
  contact_sensor: { min: 0.001, max: 0.03, standby: 0.001, dimmable: false },
  temperature_sensor: { min: 0.001, max: 0.03, standby: 0.001, dimmable: false },
  water_leak_sensor: { min: 0.001, max: 0.03, standby: 0.001, dimmable: false },

  // IR & Remote
  ir_blaster: { min: 0.5, max: 3, standby: 0.3, dimmable: false },
  remote: { min: 0.001, max: 0.05, standby: 0.001, dimmable: false },

  // Default fallback
  default: { min: 1, max: 100, standby: 0.5, dimmable: false },
};

// Manufacturer-specific multipliers (some brands are more/less efficient)
const BRAND_MULTIPLIERS = {
  'BSEED': 1.0,
  'Moes': 1.05,
  'Zemismart': 1.0,
  'Sonoff': 0.95,
  'Tuya': 1.0,
  'Xiaomi': 0.9,
  'Aqara': 0.85,
  'IKEA': 0.9,
  'Philips': 0.95,
  'Legrand': 1.0,
  'Konke': 1.0,
  'Orvibo': 1.0,
};

class EnergyEstimator {
  /**
   * @param {object} device - Homey device instance
   * @param {object} [options] - Optional overrides
   * @param {string} [options.deviceClass] - Override device class for profile lookup
   * @param {number} [options.ratedPower] - Manufacturer-rated max power in watts
   * @param {number} [options.standbyPower] - Standby power in watts
   * @param {number} [options.voltage] - Mains voltage (default: 230 for EU)
   */
  constructor(device, options = {}) {
    this.device = device;
    this.options = options;
    this._profile = this._detectProfile();
    this._stateHistory = [];
    this._lastStateChange = Date.now();
    this._totalOnMs = 0;
    this._totalEnergyWh = 0;
    this._sessionStart = Date.now();

    // Load persisted state if available
    this._loadState();
  }

  /**
   * Detect the best power profile based on device class and manufacturer
   */
  _detectProfile() {
    const deviceClass = this.options.deviceClass
      || this.device.getClass?.()
      || 'default';

    // Try exact match first
    let profile = POWER_PROFILES[deviceClass];
    if (!profile) {
      // Try partial match
      const classLower = deviceClass.toLowerCase();
      for (const [key, val] of Object.entries(POWER_PROFILES)) {
        if (classLower.includes(key) || key.includes(classLower)) {
          profile = val;
          break;
        }
      }
    }
    profile = profile || POWER_PROFILES.default;

    // Apply manufacturer multiplier
    const manufacturer = this._getManufacturer();
    const multiplier = BRAND_MULTIPLIERS[manufacturer] || 1.0;

    return {
      ...profile,
      min: profile.min * multiplier,
      max: profile.max * multiplier,
      standby: profile.standby * multiplier,
    };
  }

  /**
   * Get manufacturer name from device
   */
  _getManufacturer() {
    try {
      const settings = this.device.getSettings?.() || {};
      return settings.zb_manufacturer_name
        || settings.manufacturerName
        || this.device.manufacturerName
        || 'Tuya';
    } catch {
      return 'Tuya';
    }
  }

  /**
   * Get voltage (default 230V for EU, can be overridden)
   */
  getVoltage() {
    // Check if device reports voltage natively
    if (this.device.hasCapability?.('measure_voltage')) {
      const v = this.device.getCapabilityValue?.('measure_voltage');
      if (v && v > 50 && v < 300) return v;
    }
    return this.options.voltage || 230;
  }

  /**
   * Estimate current power consumption in watts
   * Takes into account: on/off state, dim level, device class, manufacturer specs
   */
  estimatePower() {
    const profile = this._profile;
    const isOn = this._isOn();

    if (!isOn) {
      return profile.standby;
    }

    let power = profile.min;

    // If device is dimmable, scale power by dim level
    if (profile.dimmable && this.device.hasCapability?.('dim')) {
      const dimLevel = this.device.getCapabilityValue?.('dim') || 1;
      power = profile.min + (profile.max - profile.min) * dimLevel;
    } else {
      // For non-dimmable, use average of min/max
      power = (profile.min + profile.max) / 2;
    }

    // Check if device has rated power in settings
    const ratedPower = this.options.ratedPower
      || this.device.getSettings?.()?.rated_power;
    if (ratedPower && ratedPower > 0) {
      // Use rated power as upper bound
      power = Math.min(power, ratedPower);
    }

    return Math.round(power * 100) / 100;
  }

  /**
   * Estimate current in amps
   */
  estimateCurrent() {
    const power = this.estimatePower();
    const voltage = this.getVoltage();
    return safeDivide(power, voltage);
  }

  /**
   * Check if device is currently on
   */
  _isOn() {
    try {
      if (this.device.hasCapability?.('onoff')) {
        return !!this.device.getCapabilityValue?.('onoff');
      }
      // For multi-gang, check if any gang is on
      for (let i = 1; i <= 8; i++) {
        const cap = `onoff_${i}`;
        if (this.device.hasCapability?.(cap)) {
          if (this.device.getCapabilityValue?.(cap)) return true;
        }
      }
    } catch { /* ignore */ }
    return false;
  }

  /**
   * Track state change (call this from driver's onCapability handler)
   * @param {boolean} isOn - New on/off state
   */
  trackStateChange(isOn) {
    const now = Date.now();
    const elapsed = now - this._lastStateChange;

    // Accumulate on-time
    if (this._isOn()) {
      this._totalOnMs += elapsed;
      // Accumulate energy
      const power = this.estimatePower();
      const hours = elapsed / 3600000;
      this._totalEnergyWh += power * hours;
    }

    this._stateHistory.push({ state: isOn, timestamp: now });
    // Keep only last 1000 entries
    if (this._stateHistory.length > 1000) {
      this._stateHistory = this._stateHistory.slice(-500);
    }

    this._lastStateChange = now;
    this._saveState();
  }

  /**
   * Get estimated energy in kWh since tracking started
   */
  getEstimatedEnergy() {
    // Update with current state
    const now = Date.now();
    const elapsed = now - this._lastStateChange;
    let totalWh = this._totalEnergyWh;

    if (this._isOn()) {
      const power = this.estimatePower();
      totalWh += power * (elapsed / 3600000);
    }

    return safeDivide(totalWh, 1000); // Convert Wh to kWh
  }

  /**
   * Get estimated power (for measure_power capability)
   */
  getEstimatedPower() {
    return this.estimatePower();
  }

  /**
   * Get estimated voltage
   */
  getEstimatedVoltage() {
    return this.getVoltage();
  }

  /**
   * Get estimated current in amps
   */
  getEstimatedCurrent() {
    return this.estimateCurrent();
  }

  /**
   * Get comprehensive energy report
   */
  getReport() {
    const power = this.estimatePower();
    const voltage = this.getVoltage();
    const current = this.estimateCurrent();
    const energy = this.getEstimatedEnergy();
    const onTimeMs = this._totalOnMs + (this._isOn() ? (Date.now() - this._lastStateChange) : 0);
    const totalMs = Date.now() - this._sessionStart;

    return {
      power_w: Math.round(power * 100) / 100,
      voltage_v: Math.round(voltage * 10) / 10,
      current_a: Math.round(current * 1000) / 1000,
      energy_kwh: Math.round(energy * 10000) / 10000,
      on_time_hours: Math.round(onTimeMs / 3600000 * 100) / 100,
      duty_cycle: totalMs > 0 ? Math.round(onTimeMs / totalMs * 100) : 0,
      estimated: true, // Flag to indicate this is estimated, not measured
      profile: this._profile,
    };
  }

  /**
   * Persist state to device store
   */
  _saveState() {
    try {
      this.device.setStoreValue?.('energyEstimator', {
        totalOnMs: this._totalOnMs,
        totalEnergyWh: this._totalEnergyWh,
        sessionStart: this._sessionStart,
        lastStateChange: this._lastStateChange,
      });
    } catch { /* ignore */ }
  }

  /**
   * Load persisted state from device store
   */
  _loadState() {
    try {
      const saved = this.device.getStoreValue?.('energyEstimator');
      if (saved) {
        this._totalOnMs = saved.totalOnMs || 0;
        this._totalEnergyWh = saved.totalEnergyWh || 0;
        this._sessionStart = saved.sessionStart || Date.now();
        this._lastStateChange = saved.lastStateChange || Date.now();
      }
    } catch { /* ignore */ }
  }

  /**
   * Reset all accumulated data
   */
  reset() {
    this._totalOnMs = 0;
    this._totalEnergyWh = 0;
    this._sessionStart = Date.now();
    this._lastStateChange = Date.now();
    this._stateHistory = [];
    this._saveState();
  }
}

module.exports = EnergyEstimator;