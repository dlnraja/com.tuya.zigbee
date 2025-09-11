'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class SecurityDevice extends ZigBeeDevice {

  async onNodeInit() {
    this.log('security device initialized');
    
    this.registerCapability('onoff', 'genOnOff');
    
    await super.onNodeInit();
  }

  
  // Device-specific methods can be added here
}

module.exports = SecurityDevice;
