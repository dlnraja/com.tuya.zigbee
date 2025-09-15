'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class TemplateDevice extends ZigBeeDevice {

  async onNodeInit() {
    this.log('_template device initialized');
    
    this.registerCapability('onoff', 'genOnOff');
    
    await super.onNodeInit();
  }

  
  // Device-specific methods can be added here
}

module.exports = TemplateDevice;
