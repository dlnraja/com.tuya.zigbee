'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class TuyaDoorWindowSensorDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    
    // enable debugging
    this.enableDebug();

    // print the node's info to the console
    this.printNode();

    // Register contact alarm capability
    if (this.hasCapability('alarm_contact')) {
      this.registerCapability('alarm_contact', 'msOccupancySensing', {
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 1, // 1 second
            maxInterval: 60, // 1 minute
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

    this.log('Tuya Door & Window Sensor initialized');
  }

}

module.exports = TuyaDoorWindowSensorDevice;
