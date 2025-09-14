'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class TuyaDimmerSwitchDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.enableDebug();
    this.printNode();

    // Register onoff capability
    if (this.hasCapability('onoff')) {
      this.registerCapability('onoff', 'genOnOff', {
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 1,
            maxInterval: 300,
            minChange: 1,
          },
        },
      });
    }

    // Register dim capability
    if (this.hasCapability('dim')) {
      this.registerCapability('dim', 'genLevelCtrl', {
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 1,
            maxInterval: 300,
            minChange: 5,
          },
        },
      });
    }

    this.log('Tuya Dimmer Switch initialized');
  }

}

module.exports = TuyaDimmerSwitchDevice;
