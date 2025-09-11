'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class ManufacturersRootDevice extends ZigBeeDevice {

  async onNodeInit() {
    this.log('manufacturers_root device initialized');
    
    this.registerCapability('onoff', 'genOnOff');
    
    await super.onNodeInit();
  }

  
  // Device-specific methods can be added here
}

module.exports = ManufacturersRootDevice;
