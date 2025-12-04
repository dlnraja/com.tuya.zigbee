'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

/**
 * Zigbee Air Quality / CO2 Sensor
 * Alternative to Netatmo Air Quality Monitor
 */
class AirQualityCO2Device extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('Air Quality CO2 Sensor initializing...');
    this._mainsPowered = true;

    // Initialize Tuya DP for TS0601 devices
    try {
      const TuyaEF00Manager = require('../../lib/tuya/TuyaEF00Manager');
      this.tuyaEF00Manager = new TuyaEF00Manager(this);
      await this.tuyaEF00Manager.initialize(zclNode);

      this.tuyaEF00Manager.on('dpReport', ({ dpId, value }) => {
        this._handleDP(dpId, value);
      });
    } catch (e) {
      this.log('[CO2] Tuya DP not available:', e.message);
    }

    // CO2 threshold alarm
    if (this.hasCapability('alarm_co2')) {
      this._co2Threshold = this.getSetting('co2_threshold') || 1000;
    }

    this.log('Air Quality CO2 Sensor initialized');
  }

  _handleDP(dpId, value) {
    this.log(`[CO2] DP${dpId}: ${value}`);

    switch (dpId) {
      case 2: // CO2 ppm
        this.setCapabilityValue('measure_co2', value).catch(this.error);
        if (this.hasCapability('alarm_co2')) {
          this.setCapabilityValue('alarm_co2', value > this._co2Threshold).catch(this.error);
        }
        break;
      case 18: // Temperature (x10)
      case 19:
        this.setCapabilityValue('measure_temperature', value / 10).catch(this.error);
        break;
      case 20: // Humidity
        this.setCapabilityValue('measure_humidity', value).catch(this.error);
        break;
      case 21: // PM2.5
        if (this.hasCapability('measure_pm25')) {
          this.setCapabilityValue('measure_pm25', value).catch(this.error);
        }
        break;
      case 22: // VOC
        if (this.hasCapability('measure_voc')) {
          this.setCapabilityValue('measure_voc', value).catch(this.error);
        }
        break;
    }
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    if (changedKeys.includes('co2_threshold')) {
      this._co2Threshold = newSettings.co2_threshold;
      this.log(`[CO2] Threshold: ${this._co2Threshold} ppm`);
    }
  }
}

module.exports = AirQualityCO2Device;
