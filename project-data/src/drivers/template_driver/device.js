'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class TemplateDriverDevice extends ZigBeeDevice {

  async onNodeInit() {
    this.log('template_driver device initialized');
    
    this.registerCapability('onoff', 'genOnOff');
    
    await super.onNodeInit();
  }

  
  // Device-specific methods can be added here
}

module.exports = TemplateDriverDevice;
