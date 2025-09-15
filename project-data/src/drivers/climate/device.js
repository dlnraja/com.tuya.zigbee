'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class ClimateDevice extends ZigBeeDevice {

  async onNodeInit() {
    this.log('climate device initialized');
    
    this.registerCapability('onoff', 'genOnOff');
    
    await super.onNodeInit();
  }

  
  // Device-specific methods can be added here
}

module.exports = ClimateDevice;
