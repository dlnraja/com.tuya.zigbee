'use strict';

/**
 * CapabilityManagerMixin - v6.0.0
 * 
 * Centralized, robust capability management for all Tuya Zigbee devices.
 * Provides _safeSetCapability to ensure:
 * 1. Throttling (prevents spamming Homey)
 * 2. Calibration (applies temp/humidity offsets)
 * 3. Blocking (prevents bizarre values from reaching flows)
 * 4. Dynamic addition (adds capability if missing but reported)
 * 5. Error handling (catches SDK errors and destroys timeouts)
 */

// ═══════════════════════════════════════════════════════════════════════════════
// GLOBAL BIZARRE VALUE BLOCKING (BVB) - v6.1.0
// Filtering illogical/garbage data (0xFFFF, 255%, huge jumps)
// ═══════════════════════════════════════════════════════════════════════════════
const BVB_CONSTRAINTS = {
  measure_temperature: { min: -40, max: 80, maxJump: 10 },        // v7.0.0: Reduced Max 80°C (standard sensors)
  measure_humidity:    { min: 0, max: 100, maxJump: 30 },        // v7.0.0: Reduced Max 30% jump
  'measure_humidity.soil': { min: 0, max: 100, maxJump: 15 },    // Quoted because of dot
  measure_battery:     { min: 0, max: 100, maxJump: 50 },        // v7.0.0: Increased Max 50% jump (Allow initial join recovery)
  measure_luminance:   { min: 0, max: 100000 },                  // No lux negative
  measure_power:       { min: 0, max: 5000 },                    // Max for standard outlet (5000W)
  measure_voltage:     { min: 50, max: 280 },                    // v7.0.0: Rational line voltage (50V-280V)
  measure_current:     { min: 0, max: 25 },                      // Max for standard relay (25A)
  meter_power:         { min: 0, max: 999999 },                  // Accumulation logic
};

const CapabilityManagerMixin = {

  /**
   * v6.0.0: MASTER CAPABILITY SETTER
   * Call this instead of this.setCapabilityValue() everywhere.
   */
  async _safeSetCapability(capability, value, options = {}) {
    try {
      if (!capability) return false;

      // 1. Initial Processing
      let calibratedValue = value;
      const now = Date.now();
      const previousValue = this.getCapabilityValue(capability);

      // v6.1.2: TRACK PRESENCE for Radar Ghost Protection
      if (['alarm_presence', 'alarm_motion'].includes(capability) && value === true) {
        this._lastPresenceTime = now;
      }

      // 2. Sanity Checks & Garbage Blocking
      if (this._blockBizarreValue && this._blockBizarreValue(capability, value)) {
        return false;
      }

      // 3. APPLY CALIBRATION (from settings)
      if (this._applyCalibration && typeof value === 'number') {
        calibratedValue = this._applyCalibration(capability, value);
      }

      // v5.12.2: Contact Inversion logic (moved from BaseHybridDevice)
      const shouldInvertContact = capability === 'alarm_contact' && (this._invertContact || this._userExplicitInvert);
      if (shouldInvertContact && typeof calibratedValue === 'boolean') {
        calibratedValue = !calibratedValue;
      }

      // 4. Dynamic Capability Addition (v5.8.1)
      if (!this.hasCapability(capability)) {
        if (options.noDynamicAddition) return false;
        
        this.log(`[DYNAMIC] ➕ Target capability ${capability} missing - adding now...`);
        try {
          await this.addCapability(capability);
          // Wait a bit for Homey to register the new capability
          await new Promise(r => setTimeout(r, 500));
        } catch (err) {
          this.error(`[DYNAMIC] ❌ Failed to add ${capability}:`, err.message);
          return false;
        }
      }

      // 5. THROTTLING & SIGNIFICANCE
      // v5.13.2: Multi-gang switch / Button events bypass most throttling
      const isBooleanChange = typeof calibratedValue === 'boolean' && calibratedValue !== previousValue;
      const valueChanged = calibratedValue !== previousValue;
      const forceTrigger = options.forceTrigger || false;

      const THROTTLE = {
        'measure_battery': 3600000, // 1 hour for battery
        'measure_temperature': 30000, 'measure_temperature.probe': 30000, 'measure_temperature.soil': 30000,
        'measure_humidity': 30000, 'measure_humidity.soil': 30000,
        'measure_luminance': 10000, 'measure_luminance.distance': 5000,
        'alarm_motion': 2000, 'alarm_human': 2000, 'alarm_contact': 2000,
      };
      
      const isButtonOrSwitch = capability.startsWith('onoff') || capability.startsWith('button');
      const throttleMs = isButtonOrSwitch ? 50 : (THROTTLE[capability] || 10000);

      const SIGNIFICANT = {
        'measure_battery': 2, 
        'measure_temperature': 0.3, 'measure_temperature.probe': 0.3, 'measure_temperature.soil': 0.3,
        'measure_humidity': 2, 'measure_humidity.soil': 2, 
        'measure_luminance': 50,
      };
      const sigThreshold = SIGNIFICANT[capability];

      this._capUpdateTracker = this._capUpdateTracker || {};
      const tracker = this._capUpdateTracker[capability];

      if (tracker && !options.skipThrottle && !isBooleanChange) {
        const elapsed = now - tracker.time;
        const sigChange = sigThreshold && typeof calibratedValue === 'number' && typeof previousValue === 'number'
          ? Math.abs(calibratedValue - previousValue) >= sigThreshold : false;
        
        if (elapsed < throttleMs && !sigChange && !valueChanged && !forceTrigger) {
          return false;
        }
      }

      // 6. Record interaction
      this._capUpdateTracker[capability] = { time: now, value: calibratedValue };

      // v5.13.1: ENERGY TRACKING (moved from BaseHybridDevice)
      if (['measure_power', 'measure_voltage', 'measure_current', 'meter_power'].includes(capability)) {
        this._energyCapReceived = this._energyCapReceived || {};
        this._energyCapReceived[capability] = true;
      }

      // 7. SDK UPDATE
      // v6.1.0: Call direct setter to allow BaseHybridDevice to intercept without loop
      const sdkSetter = this._setCapabilityValueDirect ? this._setCapabilityValueDirect.bind(this) : this.setCapabilityValue.bind(this);
      await sdkSetter(capability, calibratedValue).catch(err => {
        this.error(`[SDK] Failed to set ${capability}:`, err.message);
      });

      // 8. FLOW TRIGGERS
      if (valueChanged || forceTrigger) {
        if (capability.includes('.')) {
          this._triggerSubCapabilityFlow?.(capability, calibratedValue);
        }
        if (capability.startsWith('onoff')) {
          this._triggerGangFlows?.(capability, calibratedValue);
        }
        if (typeof this._triggerCustomFlowsIfNeeded === 'function') {
          await this._triggerCustomFlowsIfNeeded(capability, calibratedValue, previousValue);
        }
      }

      // 9. EXTRA HOOKS (Probe observation etc)
      if (this._probeObservationSamples && capability.startsWith('measure_temperature')) {
        this._recordProbeObservation?.();
      }

      // 10. Intelligent Adapter observation
      if (this.intelligentAdapter && typeof this.intelligentAdapter.recordDataPoint === 'function') {
        this.intelligentAdapter.recordDataPoint(capability, calibratedValue, '_safeSetCapability');
      }

      // 11. Heartbeat maintenance
      if (typeof this._updateLastSeen === 'function') {
        this._updateLastSeen();
      }

      return true;
    } catch (err) {
      this.error(`[SAFE-SET] ❌ Critical failure on ${capability}:`, err.message);
      return false;
    }
  },

  /**
   * v6.0.0: Unified Last Seen update
   */
  _updateLastSeen() {
    const now = new Date();
    this._lastSeenTimestamp = now.getTime();
    
    // SDK 3 heartbeats (Homey v12.6.1+)
    if (typeof this.setLastSeenAt === 'function') {
      try { this.setLastSeenAt(now); } catch(e) {}
    }

    if (this.setAvailable && !this.getAvailable()) {
      this.setAvailable().catch(() => { });
    }
  },

  /**
   * v6.1.5: Apply calibration and scaling from settings
   * Supports: temperature, humidity, power, voltage, current, meter_power (kWh)
   */
  _applyCalibration(capability, value) {
    if (typeof value !== 'number') return value;
    const s = this.getSettings?.() || {};
    
    // 1. Temperature & Humidity (standard Tuya offsets)
    if (capability.startsWith('measure_temperature')) {
      const offset = parseFloat(s.temperature_calibration) || parseFloat(s.temperature_offset) || 0;
      return Math.round((value + offset) * 10) / 10;
    }
    
    if (capability.startsWith('measure_humidity')) {
      const offset = parseFloat(s.humidity_calibration) || parseFloat(s.humidity_offset) || 
                   parseFloat(s.moisture_calibration) || parseFloat(s.soil_calibration) || 0;
      return Math.max(0, Math.min(100, Math.round(value + offset)));
    }

    // 2. ENERGY MONITORING - SCALING & CALIBRATION (v6.1.5 - Fix Issue #197)
    // Supports user-defined multipliers (scale) and additive offsets (calibration)
    
    // Power (W)
    if (capability === 'measure_power') {
      const scale = parseFloat(s.power_scale) || 1;
      const offset = parseFloat(s.power_calibration) || parseFloat(s.power_compensation) || 0;
      return Math.round((value * scale + offset) * 10) / 10;
    }

    // Voltage (V)
    if (capability === 'measure_voltage') {
      const scale = parseFloat(s.voltage_scale) || 1;
      const offset = parseFloat(s.voltage_calibration) || 0;
      return Math.round((value * scale + offset) * 10) / 10;
    }

    // Current (A)
    if (capability === 'measure_current') {
      const scale = parseFloat(s.current_scale) || 1;
      const offset = parseFloat(s.current_calibration) || 0;
      // Current often needs 2 or 3 decimals for accuracy (mA range)
      return Math.round((value * scale + offset) * 1000) / 1000;
    }

    // Energy (kWh)
    if (capability === 'meter_power') {
      const scale = parseFloat(s.meter_power_scale) || parseFloat(s.energy_scale) || 1;
      const offset = parseFloat(s.meter_power_calibration) || 0;
      return Math.round((value * scale + offset) * 100) / 100;
    }
    
    return value;
  },

  /**
   * v6.1.1: COMPREHENSIVE BIZARRE VALUE BLOCKING
   * Block valid but irrelevant or garbage data (0xFFFF, 255, mmWave temp etc)
   */
  _blockBizarreValue(capability, value) {
    if (value === null || value === undefined || Number.isNaN(value)) return true;

    // 1. FILTER TUYA DEFAULT GARBAGE (0xFFFF / 255)
    // 1. FILTER TUYA / ZCL ERROR CODES (0xFFFF, 0x7FFF, 0x8000, -1)
    if ([65535, 32767, -32768, -1].includes(value)) {
      this.log(`[BVB] 🚫 Blocked ZCL/Tuya Error Code (${value}) for ${capability}`);
      return true;
    }
    
    // 1a. BATTERY SPECIFIC FILTERING (v6.1.6)
    if (capability === 'measure_battery' && [255, 127, 200].includes(value)) {
      this.log(`[BVB] 🚫 Blocked invalid Tuya battery report (${value}) for ${capability}`);
      return true;
    }
    
    // v6.1.1: 255 filtering (EXCEPT Lighting & Power metrics)
    const isLighting = ['dim', 'light_hue', 'light_saturation', 'light_temperature', 'light_mode'].includes(capability);
    const isPower = ['measure_voltage', 'measure_power', 'meter_power', 'measure_current'].includes(capability);
    if (value === 255 && !isLighting && !isPower) {
      this.log(`[BVB] 🚫 Blocked suspected Tuya 8-bit garbage (255) for ${capability}`);
      return true;
    }

    // 1b. RADAR GHOST PROTECTION (v6.1.2)
    // mmWave sensors flood obsolete 0 values when presence changes
    if (value === 0 && this.hasCapability('alarm_presence') || this.hasCapability('alarm_motion')) {
      const now = Date.now();
      this._lastPresenceTime = this._lastPresenceTime || 0;
      if (now - this._lastPresenceTime < 2000 && !['alarm_presence', 'alarm_motion'].includes(capability)) {
        this.log(`[BVB] 🚫 Blocked Radar Ghost report (0) for ${capability} during presence window`);
        return true;
      }
    }

    // 2. LOGICAL BOUNDS CHECK
    const bounds = BVB_CONSTRAINTS[capability] || BVB_CONSTRAINTS[capability.split('.')[0]];
    if (bounds && typeof value === 'number') {
      if (value < bounds.min || value > bounds.max) {
        this.log(`[BVB] 🚫 Blocked out-of-bounds value (${value}) for ${capability}. Allowed: ${bounds.min}-${bounds.max}`);
        return true;
      }
    }

    // 3. JUMP DETECTION (Delta filtering)
    // Prevents graphs from being ruined by sudden 0-100-0 jumps
    const previous = this.getCapabilityValue(capability);
    if (bounds?.maxJump && typeof value === 'number' && typeof previous === 'number') {
      const jump = Math.abs(value - previous);
      
      // v6.1.1: RECOVERY JUMP HANDLING
      // Allow large jumps if they move the value BACK into a "neutral/safe" range (30-70%)
      // This prevents "smoothing" lag when a sensor recovers from a garbage drop.
      const isRecovery = (value >= 30 && value <= 70 && jump > bounds.maxJump);
      
      if (jump > bounds.maxJump && !isRecovery) {
        // v6.1.0: Multi-stage jump protection (allow if confirmed by multiple reports)
        const now = Date.now();
        const JUMP_TTL = 300000; // 5 minutes TTL to prevent memory leaks

        this._jumpHold = this._jumpHold || {};
        let hold = this._jumpHold[capability];
        
        // v6.1.2: Check TTL to prevent memory leaks if 2nd report never arrives
        if (hold && (now - hold.time > JUMP_TTL)) {
          this.log(`[BVB] ♻️ Expired stale jump hold for ${capability}`);
          hold = null;
        }

        hold = hold || { count: 0, lastValue: null, time: now };
        
        // v6.1.1: Persistent Garbage Protection
        // If we see 0, 100 or 255 more than 3 times consecutively, it's likely real floor/ceiling
        // We'll accept it after the threshold to prevent "stuck" states on real extremes.
        const isGarbageValue = (value === 0 || value === 100 || value === 255);
        if (isGarbageValue && hold.lastValue === value && hold.count >= 3) {
          this.log(`[BVB] ✅ Persistent garbage value (${value}) accepted after threshold for ${capability}`);
          delete this._jumpHold[capability];
          return false; // Accept it
        }

        if (hold.lastValue === value) {
          hold.count++;
          hold.time = now; // Refresh TTL
        } else {
          hold.count = 1;
          hold.lastValue = value;
          hold.time = now;
        }
        
        this._jumpHold[capability] = hold;

        if (hold.count < 2) {
          this.log(`[BVB] 🚫 Blocked huge jump from ${previous} to ${value} for ${capability} (Ref: ${bounds.maxJump})`);
          return true;
        }
        this.log(`[BVB] ✅ Jump confirmed after ${hold.count} reports: ${value} for ${capability}`);
      }
    }

    // 4. PHANTOM RADAR / SENSOR REPORTS (Radar mmwave specificity)
    const driverType = this.driver?.id || '';
    const isRadar = driverType.includes('presence') || driverType.includes('radar') || 
                    driverType.includes('mmwave');
                    
    if (isRadar && (capability === 'measure_temperature' || capability === 'measure_humidity')) {
      // mmWave radars often report 0 or garbage temperature during occupancy refresh
      this.log(`[BVB] 🚫 Blocked irrelevant ${capability} report from Radar device`);
      return true;
    }

    return false;
  }

};

module.exports = CapabilityManagerMixin;
