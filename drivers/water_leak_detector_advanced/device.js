'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class WaterLeakDetectorAdvancedDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {

    // Water alarm capability
    if (this.hasCapability('alarm_water')) {
      this.registerCapability('alarm_water', 'ssIasZone', {
        get: 'zoneStatus',
        report: 'zoneStatus',
        reportParser: value => (value & 1) === 1
      });
    }

    // Temperature measurement
    if (this.hasCapability('measure_temperature')) {
      this.registerCapability('measure_temperature', 'msTemperatureMeasurement');
    }

    // Battery capabilities
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

module.exports = WaterLeakDetectorAdvancedDevice;
