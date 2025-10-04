'use strict';
const { ZigBeeDevice } = require('homey-zigbeedriver');

class TuyaDevice extends ZigBeeDevice {
  async onNodeInit() {
    this.enableDebug();
    this.printNode();
    
    // Register capabilities with proper Zigbee clusters
    if (this.hasCapability('onoff')) {
      this.registerCapability('onoff', 6);
    }

    if (this.hasCapability('dim')) {
      this.registerCapability('dim', 8);
    }

    if (this.hasCapability('light_hue')) {
      this.registerCapability('light_hue', 768);
    }

    if (this.hasCapability('light_saturation')) {
      this.registerCapability('light_saturation', 768);
    }

    if (this.hasCapability('light_temperature')) {
      this.registerCapability('light_temperature', 768);
    }
  }
}
module.exports = TuyaDevice;