'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class TuyaSmartPlugDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    
    // enable debugging
    this.enableDebug();

    // print the node's info to the console
    this.printNode();

    // Register onoff capability
    if (this.hasCapability('onoff')) {
      this.registerCapability('onoff', 'genOnOff', {
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 1, // 1 second
            maxInterval: 60, // 1 minute
            minChange: 1,
          },
        },
      });
    }

    // Register power measurement capability
    if (this.hasCapability('measure_power')) {
      this.registerCapability('measure_power', 'genAnalogInput', {
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 5, // 5 seconds
            maxInterval: 300, // 5 minutes
            minChange: 1, // 1W
          },
        },
      });
    }

    // Register energy meter capability
    if (this.hasCapability('meter_power')) {
      this.registerCapability('meter_power', 'genAnalogInput', {
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 60, // 1 minute
            maxInterval: 3600, // 1 hour
            minChange: 10, // 0.01 kWh
          },
        },
      });
    }

    this.log('Tuya Smart Plug initialized');
  }

}

module.exports = TuyaSmartPlugDevice;
