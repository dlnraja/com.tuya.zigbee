'use strict';

const { safeMultiply, safeDivide } = require('../utils/tuyaUtils.js');
const { safeSetInterval, safeClearInterval } = require('../utils/safe-timers');

/**
 * VirtualEnergyMeterMixin — estimated W/kWh/V/A when hardware metering is absent.
 *
 * Contract:
 * 1. Never overwrite real measure_power / meter_power once SmartEnergy marks them real.
 * 2. Prefer `safeSetCapabilityValue` (L14) via `_safeSetCapability`.
 * 3. Estimates only after audit + 15 min silence from real power reports.
 * 4. Mains devices must still declare `mainsPowered` and must not use energy.approximation
 *    together with measure_power/meter_power in compose (Athom schema).
 * 5. Timers: safeSetInterval; always call `_cleanupVirtualEnergy()` from onDeleted/onUninit.
 *
 * Not a repair bot: estimation only. Driver/FP fixes ship via GitHub → Homey Test.
 */
const VirtualEnergyMeterMixin = {

  /**
   * Initialize virtual metering
   */
  async _initVirtualEnergy() {
    this._virtualEnergyActive = this.getSetting('enable_virtual_energy') !== false;
    if (!this._virtualEnergyActive) {return;}

    this.log('[VIRTUAL-ENERGY] Init estimated meter');

    this._ensureNominalPower();
    this._virtualEnergyLastUpdate = Date.now();
    this._virtualVoltage = Number(this.getSetting('virtual_voltage')) || 230;

    safeClearInterval(this, this._virtualEnergyTimer);
    this._virtualEnergyTimer = safeSetInterval(this, () => {
      if (this._destroyed) {return;}
      this._updateVirtualEnergy().catch((err) => this.error?.(err));
    }, 300000);

    await this._updateVirtualEnergy();
  },

  /**
   * Clear virtual energy timer (call from onDeleted / onUninit).
   */
  _cleanupVirtualEnergy() {
    safeClearInterval(this, this._virtualEnergyTimer);
    this._virtualEnergyTimer = null;
    this._virtualEnergyActive = false;
  },

  /**
   * Ensure nominal_power is available, guessing if missing
   */
  _ensureNominalPower() {
    let nominalPower = this.getStoreValue('nominal_power');
    
    // Prioritize manual setting from user
    const userNominal = this.getSetting('nominal_power_override');
    if (userNominal && userNominal > 0) {
      nominalPower = userNominal;
    }

    if (nominalPower === undefined || nominalPower === 0) {
      const driverId = this.driver.id;
      const deviceClass = this.getClass();
      
      // Intelligent guessing
      if (driverId.includes('bulb') || deviceClass === 'light') {nominalPower = 9.0;}
      else if (driverId.includes('plug') || driverId.includes('socket')) {nominalPower = 0.5;} // Just the relay
      else if (driverId.includes('heater')) {nominalPower = 2000.0;}
      else if (driverId.includes('purifier')) {nominalPower = 35.0;}
      else if (driverId.includes('fan')) {nominalPower = 45.0;}
      else if (driverId.includes('switch')) {
        const gangs = driverId.match(/(\d)gang/);
        const gangCount = gangs ? parseInt(gangs[1]) : 1;
        nominalPower = safeMultiply(0.2, gangCount);
      } else {nominalPower = 1.0;}
      
      this.setStoreValue('nominal_power', nominalPower).catch(() => {});
      this.log(`[VIRTUAL-ENERGY] Guessed nominal power: ${nominalPower}W`);
    }
  },

  /**
   * Update virtual energy metrics
   */
  async _updateVirtualEnergy() {
    if (!this._virtualEnergyActive) {return;}

    // 1. Determine "On" state (check all gangs if multi-switch)
    let isOn = false;
    const capabilities = this.getCapabilities();
    if (capabilities.includes('onoff')) {
      isOn = this.getCapabilityValue('onoff');
    }
    // Multi-gang check
    for (const cap of capabilities) {
      if (cap.startsWith('onoff.') && this.getCapabilityValue(cap)) {
        isOn = true;
        break;
      }
    }

    // 2. Calculate Current Power (W)
    const nominalPower = this.getStoreValue('nominal_power') || 1.0;
    let powerFactor = 1.0;
    if (capabilities.includes('dim')) {
      powerFactor = this.getCapabilityValue('dim') || 1.0;
    }

    const standbyPower = this.driver.id.includes('wifi') ? 0.8 : 0.4;
    const currentPower = isOn ? safeMultiply(nominalPower, powerFactor) : standbyPower;

    // 3. Accumulate Energy (kWh)
    const now = Date.now();
    const durationHours = (now - this._virtualEnergyLastUpdate) / (1000 * 60 * 60);
    const energyDeltaKwh = safeDivide(safeMultiply(currentPower, durationHours), 1000);
    
    let totalEnergy = this.getCapabilityValue('meter_power') || 0;
    totalEnergy += energyDeltaKwh;

    // 4. Estimate Current (A)
    const currentA = safeDivide(currentPower, this._virtualVoltage);

    // 5. Update Capabilities only when no real metering is advertising
    const silentPeriod = now - (this._lastRealPowerReport || 0);
    const smart = this.smartEnergy;
    const auditDone = !smart || typeof smart.isAuditComplete !== 'function' || smart.isAuditComplete();
    const allowEstimate = auditDone && silentPeriod > 900000;
    if (allowEstimate) {
      if (this.hasCapability('measure_power') && !(smart?.isRealCapability?.('measure_power'))) {
        await this._setEstimatedCap('measure_power', Math.round(currentPower * 10) / 10);
      }
      if (this.hasCapability('meter_power') && !(smart?.isRealCapability?.('meter_power'))) {
        await this._setEstimatedCap('meter_power', Math.round(totalEnergy * 1000) / 1000);
      }
      if (this.hasCapability('measure_voltage') && !(smart?.isRealCapability?.('measure_voltage'))) {
        await this._setEstimatedCap('measure_voltage', this._virtualVoltage);
      }
      if (this.hasCapability('measure_current') && !(smart?.isRealCapability?.('measure_current'))) {
        await this._setEstimatedCap('measure_current', Math.round(currentA * 100) / 100);
      }
    }

    this._virtualEnergyLastUpdate = now;
  },

  /**
   * Internal capability setter — marks telemetry source=estimated
   */
  async _setEstimatedCap(capabilityId, value) {
    if (this._destroyed) {return;}
    await this._safeSetCapability(capabilityId, value, { source: 'estimated' });
    try {
      const DeviceTelemetryEstimator = require('../utils/DeviceTelemetryEstimator');
      await DeviceTelemetryEstimator.record(this, capabilityId, value, { source: 'estimated', via: 'virtual-meter-mixin' });
    } catch (_e) { /* optional */ }
  },

  async _safeSetCapability(capabilityId, value, options = {}) {
    if (this._destroyed) {return;}
    try {
      const { commitCapability } = require('../layers/commitCapability');
      return commitCapability(this, capabilityId, value, options.source || 'estimated', 0.4);
    } catch (_e) {
      if (typeof this.safeSetCapabilityValue === 'function') {
        return this.safeSetCapabilityValue(capabilityId, value, { source: options.source || 'estimated' }).catch(() => {});
      }
      if (typeof this.setCapabilityValue === 'function') {
        return this.setCapabilityValue(capabilityId, value).catch(() => {});
      }
    }
  }
};

module.exports = VirtualEnergyMeterMixin;
