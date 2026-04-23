'use strict';
const { safeMultiply, safeParse } = require('../utils/tuyaUtils.js');


/**
 * VirtualEnergyMeterMixin - v1.0.0
 * 
 * Provides estimated power (measure_power) and energy (meter_power) for devices
 * without hardware energy monitoring.
 * Uses 'nominal_power' (driver-calculated) and 'onoff' state.
 */
const VirtualEnergyMeterMixin = {

  /**
   * Initialize virtual metering
   */
  _initVirtualEnergy() {
    this._virtualEnergyActive = this.getSettings().enable_virtual_energy !== false;
    if (!this._virtualEnergyActive) return;

    this.log('[VIRTUAL-ENERGY]  Initializing intelligent virtual meter...');
    
    // v7.2.2: Ensure nominal power is set or guessed
    this._ensureNominalPower();

    // Start energy accumulation timer (every 10 minutes)
    this._virtualEnergyTimer = this.setInterval(() => {
      this._calculateVirtualEnergy();
    }, 600000);

    // Immediate calculation
    this._calculateVirtualEnergy();
  },

  /**
   * Ensure nominal_power is available, guessing if missing
   */
  _ensureNominalPower() {
    let nominalPower = this.getStoreValue('nominal_power');
    
    // v7.2.2: Prioritize value from manifest (calculated by polish_app.js)
    const manifest = this.getDriver().getManifest();
    const manifestPower = manifest.energy?.approximation?.usageConstant;
    
    if (manifestPower !== undefined && manifestPower > 0) {
      nominalPower = manifestPower;
      this.setStoreValue('nominal_power', nominalPower).catch(() => {});
    }

    // v7.2.2: Intelligent guessing based on driver/manifest if still 0
    if (nominalPower === undefined || nominalPower === 0) {
      const driverId = this.driver.id;
      const deviceClass = this.getClass();
      
      this.log(`[VIRTUAL-ENERGY]  Guessing nominal power for ${driverId} (${deviceClass})...`);
      
      if (driverId.includes('bulb') || deviceClass === 'light') {
        nominalPower = 9.0; // Typical LED bulb
      } else if (driverId.includes('plug') || driverId.includes('socket')) {
        nominalPower = 0.8; // Idle plug logic
      } else if (driverId.includes('strip')) {
        nominalPower = 12.0;
      } else if (driverId.includes('switch')) {
        const gangs = driverId.match(/(\d)gang/);
        const gangCount = gangs ? parseInt(gangs[1]) : 1;
        nominalPower =safeMultiply(0.2, gangCount);
      } else if (driverId.includes('radar') || driverId.includes('presence')) {
        nominalPower = 1.2;
      } else if (driverId.includes('purifier')) {
        nominalPower = 35.0; // Medium fan speed
      } else {
        nominalPower = 0.5; // Safe default
      }
      
      this.setStoreValue('nominal_power', nominalPower).catch(() => {});
      this.log(`[VIRTUAL-ENERGY]  Guessed: ${nominalPower}W`);
    }
  },

  /**
   * Calculate and report virtual values
   */
  _calculateVirtualEnergy() {
    if (!this._virtualEnergyActive) return;

    const isOn = this.hasCapability('onoff') ? this.getCapabilityValue('onoff') : true;
    const nominalPower = this.getStoreValue('nominal_power') || 0.5;
    
    // v7.2.2: Component-Aware Analytics
    // Adjust power based on dim level if available
    let powerFactor = 1.0;
    if (this.hasCapability('dim')) {
      powerFactor = this.getCapabilityValue('dim') || 1.0;
    }

    // 1. Calculate Power (W)
    // Standby power is approx 0.3W for Zigbee, 0.8W for WiFi
    const standbyPower = this.getDriver().id.includes('wifi') ? 0.8 : 0.4;
    const currentPower = isOn ?safeMultiply((nominalPower, powerFactor)) : standbyPower;
    
    // v7.2.2: Hybrid Suppression Logic
    // Only report if we haven't seen a REAL energy report in the last 15 mins
    const lastReal = this._lastEnergyReportTime || 0;
    const silentPeriod = Date.now() - lastReal;
    
    if (silentPeriod > 900000) { // 15 mins
      this._safeSetCapability('measure_power', currentPower, { noDynamicAddition: false });
      
      // 2. Accumulate Energy (kWh)
      const now = Date.now();
      if (this._lastVirtualEnergyCalc) {
        const hours = (now -safeParse(this._lastVirtualEnergyCalc), 3600000);
        const kwhGain =safeMultiply((currentPower, safeParse)(hours), 1000);
        
        let totalKwh = this.getCapabilityValue('meter_power') || 0;
        totalKwh += kwhGain;
        
        this._safeSetCapability('meter_power', totalKwh, { noDynamicAddition: false });
      }
      this._lastVirtualEnergyCalc = now;
    } else {
      this.log(`[VIRTUAL-ENERGY]  Suppression active (last real report ${Math.round(silentPeriod / 1000)}s ago)`);
    }
  },

  /**
   * Hook for real energy reports to suppress virtual meter
   */
  _recordRealEnergyActivity() {
    this._lastEnergyReportTime = Date.now();
    this._energyCapReceived = true; // Block virtual meter
  }

};

module.exports = VirtualEnergyMeterMixin;


