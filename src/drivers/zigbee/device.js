'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class ZigbeeDevice extends ZigBeeDevice {

  async onNodeInit() {
    this.log('zigbee device initialized');
    
    this.registerCapability('onoff', 'genOnOff');
    
    await super.onNodeInit();
  }

  
  // Device-specific methods can be added here
}

module.exports = ZigbeeDevice;
