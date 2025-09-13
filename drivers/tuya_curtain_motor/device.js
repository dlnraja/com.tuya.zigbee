'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class TuyaCurtainMotorDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    
    // enable debugging
    this.enableDebug();

    // print the node's info to the console
    this.printNode();

    // Register window coverings capability
    if (this.hasCapability('windowcoverings_state')) {
      this.registerCapability('windowcoverings_state', 'closuresWindowCovering', {
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 0, // No minimum
            maxInterval: 300, // 5 minutes
            minChange: 1,
          },
        },
      });
    }

    // Register dim capability for position control
    if (this.hasCapability('dim')) {
      this.registerCapability('dim', 'genLevelCtrl', {
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 1, // 1 second
            maxInterval: 300, // 5 minutes
            minChange: 1, // 1%
          },
        },
      });
    }

    this.log('Tuya Curtain Motor initialized');
  }

}

module.exports = TuyaCurtainMotorDevice;
