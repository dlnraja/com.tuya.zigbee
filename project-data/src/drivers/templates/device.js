'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class TemplatesDevice extends ZigBeeDevice {

  async onNodeInit() {
    this.log('templates device initialized');
    
    this.registerCapability('onoff', 'genOnOff');
    
    await super.onNodeInit();
  }

  
  // Device-specific methods can be added here
}

module.exports = TemplatesDevice;
