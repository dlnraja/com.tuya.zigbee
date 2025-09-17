'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class CODetectorAdvancedDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {

    // CO alarm capability
    if (this.hasCapability('alarm_co')) {
      this.registerCapability('alarm_co', 'ssIasZone', {
        get: 'zoneStatus',
        report: 'zoneStatus',
        reportParser: value => (value & 1) === 1
      });
    }

    // CO measurement capability
    if (this.hasCapability('measure_co')) {
      this.registerCapability('measure_co', 'genAnalogInput', {
        get: 'presentValue',
        report: 'presentValue',
        reportParser: value => Math.round(value)
      });
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

module.exports = CODetectorAdvancedDevice;
