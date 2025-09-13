'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class TuyaCoDetectorDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.enableDebug();
    this.printNode();

    // Register CO alarm capability
    if (this.hasCapability('alarm_co')) {
      this.registerCapability('alarm_co', 'ssIasZone', {
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 1,
            maxInterval: 300,
            minChange: 1,
          },
        },
      });
    }

    // Register battery capability
    if (this.hasCapability('measure_battery')) {
      this.registerCapability('measure_battery', 'genPowerCfg', {
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 300,
            maxInterval: 3600,
            minChange: 5,
          },
        },
      });
    }

    // Register tamper alarm capability
    if (this.hasCapability('alarm_tamper')) {
      this.registerCapability('alarm_tamper', 'ssIasZone', {
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 1,
            maxInterval: 300,
            minChange: 1,
          },
        },
      });
    }

    this.log('Tuya CO Detector initialized');
  }

}

module.exports = TuyaCoDetectorDevice;
