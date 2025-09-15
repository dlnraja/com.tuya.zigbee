'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class TypesDevice extends ZigBeeDevice {

  async onNodeInit() {
    this.log('types device initialized');
    
    this.registerCapability('onoff', 'genOnOff');
    
    await super.onNodeInit();
  }

  
  // Device-specific methods can be added here
}

module.exports = TypesDevice;
