'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class TuyaLightSwitchDevice extends ZigBeeDevice {

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
            minInterval: 0, // No minimum reporting interval
            maxInterval: 300, // 5 minutes
            minChange: 1,
          },
        },
      });
    }

    this.log('Tuya Light Switch initialized');
  }

}

module.exports = TuyaLightSwitchDevice;
