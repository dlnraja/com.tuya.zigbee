'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class CommonDevice extends ZigBeeDevice {

  async onNodeInit() {
    this.log('common device initialized');
    
    this.registerCapability('onoff', 'genOnOff');
    
    await super.onNodeInit();
  }

  
  // Device-specific methods can be added here
}

module.exports = CommonDevice;
