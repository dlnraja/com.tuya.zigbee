'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class IkeaTradfriBulbDevice extends ZigBeeDevice {

  async onNodeInit() {
    this.log('ikea_tradfri_bulb device initialized');
    
    this.registerCapability('onoff', 'genOnOff');
    
    await super.onNodeInit();
  }

  
  // Device-specific methods can be added here
}

module.exports = IkeaTradfriBulbDevice;
