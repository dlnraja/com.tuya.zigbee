'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class SoilMoistureTemperatureSensorDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {

    // Temperature measurement
    if (this.hasCapability('measure_temperature')) {
      this.registerCapability('measure_temperature', 'msTemperatureMeasurement', {
        get: 'measuredValue',
        report: 'measuredValue',
        reportParser: value => Math.round((value / 100) * 10) / 10
      });
    }

    // Soil moisture (using relative humidity cluster)
    if (this.hasCapability('measure_humidity')) {
      this.registerCapability('measure_humidity', 'msRelativeHumidity', {
        get: 'measuredValue', 
        report: 'measuredValue',
        reportParser: value => Math.round((value / 100) * 10) / 10
      });
    }

    // Battery reporting
    if (this.hasCapability('measure_battery')) {
      this.registerCapability('measure_battery', 'genPowerCfg', {
        get: 'batteryPercentageRemaining',
        report: 'batteryPercentageRemaining',
        getOpts: {
          getOnStart: true,
        },
        reportParser: value => Math.round(value / 2)
      });
    }

    if (this.hasCapability('alarm_battery')) {
      this.registerCapability('alarm_battery', 'genPowerCfg', {
        get: 'batteryPercentageRemaining',
        report: 'batteryPercentageRemaining',
        getOpts: {
          getOnStart: true,
        },
        reportParser: value => value < 20
      });
    }

    await super.onNodeInit({ zclNode });
  }

}

module.exports = SoilMoistureTemperatureSensorDevice;
