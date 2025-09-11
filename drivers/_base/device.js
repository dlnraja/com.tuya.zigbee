'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class BaseDevice extends ZigBeeDevice {

  async onNodeInit() {
    this.log('_base device initialized');
    
    this.registerCapability('onoff', 'genOnOff');
    
    await super.onNodeInit();
  }

  
  // Device-specific methods can be added here
}

module.exports = BaseDevice;
