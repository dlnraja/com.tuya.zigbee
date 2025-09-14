'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class TuyaSmokeSensorDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    
    // enable debugging
    this.enableDebug();

    // print the node's info to the console
    this.printNode();

    // Register smoke alarm capability
    if (this.hasCapability('alarm_smoke')) {
      this.registerCapability('alarm_smoke', 'msOccupancySensing', {
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 1, // 1 second
            maxInterval: 300, // 5 minutes
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
            minInterval: 300, // 5 minutes
            maxInterval: 3600, // 1 hour
            minChange: 5, // 5%
          },
        },
      });
    }

    this.log('Tuya Smoke Sensor initialized');
  }

}

module.exports = TuyaSmokeSensorDevice;
