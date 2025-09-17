'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class AirQualityMonitorAdvancedDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {

    // Temperature measurement
    if (this.hasCapability('measure_temperature')) {
      this.registerCapability('measure_temperature', 'msTemperatureMeasurement');
    }

    // Humidity measurement  
    if (this.hasCapability('measure_humidity')) {
      this.registerCapability('measure_humidity', 'msRelativeHumidity');
    }

    // CO2 measurement
    if (this.hasCapability('measure_co2')) {
      this.registerCapability('measure_co2', 'msCO2');
    }

    // PM2.5 measurement
    if (this.hasCapability('measure_pm25')) {
      this.registerCapability('measure_pm25', 'genAnalogInput');
    }

    // CO2 alarm threshold
    if (this.hasCapability('alarm_co2')) {
      this.registerCapability('alarm_co2', 'msCO2', {
        reportParser: value => value > 1000 // ppm threshold
      });
    }

    // Battery reporting
    if (this.hasCapability('alarm_battery')) {
      this.registerCapability('alarm_battery', 'genPowerCfg', {
        get: 'batteryPercentageRemaining',
        report: 'batteryPercentageRemaining',
        reportParser: value => value < 20
      });
    }

    if (this.hasCapability('measure_battery')) {
      this.registerCapability('measure_battery', 'genPowerCfg', {
        get: 'batteryPercentageRemaining',
        report: 'batteryPercentageRemaining',
        reportParser: value => Math.max(0, Math.min(100, value))
      });
    }

    await super.onNodeInit({ zclNode });
  }

}

module.exports = AirQualityMonitorAdvancedDevice;
