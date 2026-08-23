'use strict';

/**
 * SmartBiorhythmHandler — Local Solar Sync via DaylightAtmosphere SSOT.
 * Optional Tuya DP toggle; soft clock/solar curve when native biorhythm DP absent.
 */
class SmartBiorhythmHandler {
  constructor(device) {
    this.device = device;
    this._interval = null;
    this.isActive = false;
    
    // Tuya specific DPs for biorhythm (often DP 30 or 34, but we simulate it locally if unsupported)
    this.DP_BIORHYTHM_TOGGLE = 30;
  }

  log(...args) {
    if (this.device && typeof this.device.log === 'function') {
      this.device.log('[BIORHYTHM]', ...args);
    }
  }

  async init() {
    // Check if the device has light_temperature capability
    if (!this.device.hasCapability('light_temperature')) {return;}

    // Check saved state
    this.isActive = this.device.getStoreValue('biorhythm_active') === true;

    if (this.isActive) {
      this.start();
    }
  }

  async handleDP(dpId, value) {
    if (dpId === this.DP_BIORHYTHM_TOGGLE) {
      const active = Boolean(value);
      if (active !== this.isActive) {
        this.isActive = active;
        this.device.setStoreValue('biorhythm_active', active).catch(() => {});
        this.log(`Toggled ${active ? 'ON' : 'OFF'} via Tuya DP`);
        if (active) {this.start();}
        else {this.stop();}
        return true;
      }
    }
    return false;
  }

  /**
   * Daylight Atmosphere → Homey light_temperature (0 cold … 1 warm).
   */
  _calculateCurrentTemperature() {
    const DaylightAtmosphere = require('../features/DaylightAtmosphere');
    const solar = this.device?.homey?.app?.solarElevation || null;
    const lux = DaylightAtmosphere.luxFromDevice(this.device);
    return DaylightAtmosphere.compute({ solar, lux }).temperature;
  }

  start() {
    if (this._interval) {clearInterval(this._interval);}
    this.isActive = true;
    
    // Update immediately
    this._applyTemperature();

    // Update every 15 minutes
    this._interval = this.device.homey.setInterval(() => {
      if (this._destroyed || this.device._destroyed) {return;}
      this._applyTemperature();
    }, 15 * 60 * 1000);
    
    this.log('Solar Sync (local daylight) activated');
  }

  stop() {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
    }
    this.isActive = false;
    this.log('Solar Sync deactivated');
  }

  async _applyTemperature() {
    if (!this.device || this.device._destroyed) {
      this.stop();
      return;
    }

    try {
      const isOff = this.device.getCapabilityValue('onoff') === false;
      if (isOff) {return;}

      const targetTemp = this._calculateCurrentTemperature();
      const currentTemp = this.device.getCapabilityValue('light_temperature');

      if (currentTemp === null || Math.abs(currentTemp - targetTemp) > 0.05) {
        await this.device.safeSetCapabilityValue('light_temperature', Number(targetTemp.toFixed(2)));
        this.log(`light_temperature → ${targetTemp.toFixed(2)} (Daylight Atmosphere)`);
      }
    } catch (err) {
      // Silent catch
    }
  }
}

module.exports = SmartBiorhythmHandler;
