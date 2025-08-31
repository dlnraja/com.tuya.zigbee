'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class TS0011Device extends ZigBeeDevice {
  async onNodeInit() {
    this.log('TS0011 device initialized');
    
    // Register capabilities
    this.registerCapability('onoff', 'genOnOff');
    
    // Handle on/off commands
    this.registerCapabilityListener('onoff', async (value) => {
      await this.node.endpoints[1].clusters.genOnOff.toggle({});
    });
  }
}

module.exports = TS0011Device;
