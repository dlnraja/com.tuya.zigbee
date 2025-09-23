'use strict';
const { ZigBeeDevice } = require('homey-zigbeedriver');

class TuyaDevice extends ZigBeeDevice {
  async onNodeInit() {
    this.enableDebug();
    this.printNode();
    
    // Register capabilities
    const caps = this.getCapabilities();
    caps.forEach(cap => {
      this.registerCapability(cap, 'CLUSTER_TUYA_SPECIFIC');
    });
  }
}
module.exports = TuyaDevice;