'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class SmartSmokeDetectorAdvancedDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {

    // Smoke alarm capability
    if (this.hasCapability('alarm_smoke')) {
      this.registerCapability('alarm_smoke', 'ssIasZone', {
        get: 'zoneStatus',
        report: 'zoneStatus',
        reportParser: value => (value & 1) > 0
      });
    }

    // Tamper alarm
    if (this.hasCapability('alarm_tamper')) {
      this.registerCapability('alarm_tamper', 'ssIasZone', {
        get: 'zoneStatus',
        report: 'zoneStatus', 
        reportParser: value => (value & 4) > 0
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

module.exports = SmartSmokeDetectorAdvancedDevice;
