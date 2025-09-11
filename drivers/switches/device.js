'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class SwitchesDevice extends ZigBeeDevice {

  async onNodeInit() {
    this.log('switches device initialized');
    
    this.registerCapability('onoff', 'genOnOff');
    
    await super.onNodeInit();
  }

  
  // Device-specific methods can be added here
}

module.exports = SwitchesDevice;
