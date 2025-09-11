'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class ProtocolsContainerDevice extends ZigBeeDevice {

  async onNodeInit() {
    this.log('protocols_container device initialized');
    
    this.registerCapability('onoff', 'genOnOff');
    
    await super.onNodeInit();
  }

  
  // Device-specific methods can be added here
}

module.exports = ProtocolsContainerDevice;
