'use strict';
const { safeDivide, safeParse } = require('../utils/tuyaUtils.js');

/**
 * CapabilityManagerMixin - v6.0.0
 * 
 * Centralized, robust capability management for all Tuya Zigbee devices.
 */

const BVB_CONSTRAINTS = {
  measure_temperature: { min: -40, max: 80, maxJump: 10 },
  measure_humidity:    { min: 0, max: 100, maxJump: 30 },
  'measure_humidity.soil': { min: 0, max: 100, maxJump: 15 },
  measure_battery:     { min: 0, max: 100, maxJump: 50 },
  measure_luminance:   { min: 0, max: 100000 },
  measure_power:       { min: 0, max: 5000 },
  measure_voltage:     { min: 50, max: 280 },
  measure_current:     { min: 0, max: 25 },
  meter_power:         { min: 0, max: 999999 },
};

const CapabilityManagerMixin = {

  async _safeSetCapability(capability, value, options = {}) {
    try {
      if (!capability) return false;

      let calibratedValue = value;
      const now = Date.now();
      const previousValue = this.getCapabilityValue(capability);

      if (this.mainsPowered && (capability === 'measure_battery' || capability === 'alarm_battery')) {
        return false;
      }

      if (['alarm_presence', 'alarm_motion'].includes(capability) && value === true) {
        this._lastPresenceTime = now;
      }

      if (this._blockBizarreValue && this._blockBizarreValue(capability, value)) {
        return false;
      }

      if (this._applyCalibration && typeof value === 'number') {
        calibratedValue = this._applyCalibration(capability, value);
      }

      if (capability === 'alarm_contact' && (this._invertContact || this._userExplicitInvert)) {
          if (typeof calibratedValue === 'boolean') calibratedValue = !calibratedValue;
      }

      if (typeof this.hasCapability === 'function' && !this.hasCapability(capability)) {
        if (options.noDynamicAddition) return false;
        try {
          if (typeof this.addCapability === 'function') {
            await this.addCapability(capability);
            for (let i = 0; i < 5; i++) {
              if (this.hasCapability(capability)) break;
              await new Promise(r => setTimeout(r, 100));
            }
          }
        } catch (err) {}
      }

      const valueChanged = calibratedValue !== previousValue;
      const forceTrigger = options.forceTrigger || false;

      const THROTTLE = {
        'measure_battery': 3600000,
        'measure_temperature': 30000,
        'measure_humidity': 30000,
        'measure_luminance': 10000,
        'alarm_motion': 2000,
      };
      
      const isButtonOrSwitch = capability.startsWith('onoff') || capability.startsWith('button');
      let throttleMs = isButtonOrSwitch ? 50 : (THROTTLE[capability] || 10000);

      const SIGNIFICANT = {
        'measure_battery': 2, 
        'measure_temperature': 0.3,
        'measure_humidity': 2, 
        'measure_luminance': 50,
      };
      const sigThreshold = SIGNIFICANT[capability];

      this._capUpdateTracker = this._capUpdateTracker || {};
      const tracker = this._capUpdateTracker[capability];

      if (tracker && !options.skipThrottle && typeof calibratedValue !== 'boolean') {
        const elapsed = now - tracker.time;
        const sigChange = sigThreshold && typeof calibratedValue === 'number' && typeof previousValue === 'number'
          ? Math.abs(calibratedValue - previousValue) >= sigThreshold : false;

        if (elapsed < throttleMs && !sigChange && !forceTrigger) {
          return false;
        }
      }

      this._capUpdateTracker[capability] = { time: now, value: calibratedValue };

      const sdkSetter = this._setCapabilityValueDirect ? this._setCapabilityValueDirect.bind(this) : (this.setCapabilityValue ? this.setCapabilityValue.bind(this) : null);
      if (sdkSetter) {
        await sdkSetter(capability, calibratedValue).catch(() => {});
      }

      if (valueChanged || forceTrigger) {
        if (capability.includes('.')) this._triggerSubCapabilityFlow?.(capability, calibratedValue);
        if (capability.startsWith('onoff')) this._triggerGangFlows?.(capability, calibratedValue);
        if (typeof this._triggerCustomFlowsIfNeeded === 'function') await this._triggerCustomFlowsIfNeeded(capability, calibratedValue, previousValue);
      }

      return true;
    } catch (err) {
      return false;
    }
  },

  _updateLastSeen() {
    const now = new Date();
    this._lastSeenTimestamp = now.getTime();
    if (typeof this.setLastSeenAt === 'function') {
      try { this.setLastSeenAt(now); } catch(e) {}
    }
    if (this.setAvailable && !this.getAvailable()) {
      this.setAvailable().catch(() => { });
    }
  },

  _applyCalibration(capability, value) {
    if (typeof value !== 'number') return value;
    const s = this.getSettings?.() || {};
    if (capability.startsWith('measure_temperature')) {
      const offset = parseFloat(s.temperature_calibration) || parseFloat(s.temperature_offset) || 0;
      return Math.round((value + offset) * 10) / 10;
    }
    if (capability.startsWith('measure_humidity')) {
      const offset = parseFloat(s.humidity_calibration) || parseFloat(s.humidity_offset) || 0;
      return Math.max(0, Math.min(100, Math.round(value + offset)));
    }
    if (capability === 'measure_power') {
      const scale = parseFloat(s.power_scale) || 1;
      const offset = parseFloat(s.power_calibration) || 0;
      return Math.round((value * scale + offset) * 10) / 10;
    }
    return value;
  },

  _blockBizarreValue(capability, value) {
    if (value === null || value === undefined || Number.isNaN(value)) return true;
    if ([65535, 32767, -32768, -1].includes(value)) return true;
    
    const bounds = BVB_CONSTRAINTS[capability] || BVB_CONSTRAINTS[capability.split('.')[0]];
    if (bounds && typeof value === 'number') {
      if (value < bounds.min || value > bounds.max) return true;
    }
    return false;
  },

  _getFlowCard(id, type = 'trigger') {
    try {
      if (!id || !this.homey || !this.homey.flow) return null;
      const typeMap = { 'trigger': 'getTriggerCard', 'condition': 'getConditionCard', 'action': 'getActionCard' };
      const method = typeMap[type];
      if (typeof this.homey.flow[method] === 'function') return this.homey.flow[method](id);
    } catch (err) {}
    return null;
  },

  _registerCapabilityListeners() {
    this.log?.('[CAP-MGR] _registerCapabilityListeners (no-op fallback)');
  },

  _cleanupCapabilityManager() {
    this._capUpdateTracker = null;
    this._jumpHold = null;
  }
};

module.exports = CapabilityManagerMixin;
