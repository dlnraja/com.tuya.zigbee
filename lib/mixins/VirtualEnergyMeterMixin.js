'use strict';

const { safeMultiply, safeDivide, safeParse } = require('../utils/tuyaUtils.js');

/**
 * VirtualEnergyMeterMixin - v2.0.0 (Universal Tuya Engine)
 * 
 * Provides high-fidelity estimated power, energy, voltage, and current for devices
 * without hardware monitoring.
 * 
 * New in v2.0.0:
 * - Estimations for measure_voltage (fixed 230V) and measure_current (W/V).
 * - Advanced duration-based accumulation for meter_power.
 * - Integration with dim level for linear power scaling.
 * - Intelligent power-state detection across multiple gangs.
 */
const VirtualEnergyMeterMixin = {

  /**
   * Initialize virtual metering
   */
  async _initVirtualEnergy() {
    this._virtualEnergyActive = this.getSetting('enable_virtual_energy') !== false;
    if (!this._virtualEnergyActive) return;

    this.log('[VIRTUAL-ENERGY] Initializing intelligent virtual meter v2.0.0...');
    
    this._ensureNominalPower();
    this._virtualEnergyLastUpdate = Date.now();
    this._virtualVoltage = 230; // Default V

    // Periodically update energy (every 5 minutes for higher accuracy)
    this._virtualEnergyTimer = this.homey.setInterval(() => {
      this._updateVirtualEnergy().catch(this.error);
    }, 300000);

    // Initial update
    await this._updateVirtualEnergy();
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
      if (driverId.includes('bulb') || deviceClass === 'light') nominalPower = 9.0;
      else if (driverId.includes('plug') || driverId.includes('socket')) nominalPower = 0.5; // Just the relay
      else if (driverId.includes('heater')) nominalPower = 2000.0;
      else if (driverId.includes('purifier')) nominalPower = 35.0;
      else if (driverId.includes('fan')) nominalPower = 45.0;
      else if (driverId.includes('switch')) {
        const gangs = driverId.match(/(\d)gang/);
        const gangCount = gangs ? parseInt(gangs[1]) : 1;
        nominalPower = safeMultiply(0.2, gangCount);
      } else nominalPower = 1.0;
      
      this.setStoreValue('nominal_power', nominalPower).catch(() => {});
      this.log(`[VIRTUAL-ENERGY] Guessed nominal power: ${nominalPower}W`);
    }
  },

  /**
   * Update virtual energy metrics
   */
  async _updateVirtualEnergy() {
    if (!this._virtualEnergyActive) return;

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

    // 5. Update Capabilities (if not receiving real reports)
    const silentPeriod = now - (this._lastRealPowerReport || 0);
    if (silentPeriod > 900000) { // 15 mins
      if (this.hasCapability('measure_power')) {
        await this._safeSetCapability('measure_power', Math.round(currentPower * 10) / 10).catch(() => {});
      }
      if (this.hasCapability('meter_power')) {
        await this._safeSetCapability('meter_power', Math.round(totalEnergy * 1000) / 1000).catch(() => {});
      }
      if (this.hasCapability('measure_voltage')) {
        await this._safeSetCapability('measure_voltage', this._virtualVoltage).catch(() => {});
      }
      if (this.hasCapability('measure_current')) {
        await this._safeSetCapability('measure_current', Math.round(currentA * 100) / 100).catch(() => {});
      }
    }

    this._virtualEnergyLastUpdate = now;
  },

  /**
   * Internal capability setter bypass
   */
  async _safeSetCapability(capabilityId, value) {
    if (typeof this.setCapabilityValue === 'function') {
      return this.setCapabilityValue(capabilityId, value).catch(() => {});
    }
  }
};

module.exports = VirtualEnergyMeterMixin;
