'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class LightsDevice extends ZigBeeDevice {

  async onNodeInit() {
    this.log('lights device initialized');
    
    this.registerCapability('onoff', 'genOnOff');
    this.registerCapability('dim', 'genLevelCtrl');
    
    await super.onNodeInit();
  }

  
  // Device-specific methods can be added here
}

module.exports = LightsDevice;
