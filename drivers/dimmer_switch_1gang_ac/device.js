'use strict';
const { ZigBeeDevice } = require('homey-zigbeedriver');

class Device extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.enableDebug();
    this.printNode();

    // Register capabilities using numeric Zigbee clusters (SDK3 best practice)
    if (this.hasCapability('onoff')) {
      this.registerCapability('onoff', 6);
    }
    if (this.hasCapability('dim')) {
      this.registerCapability('dim', 8);
    }
  }
}

module.exports = Device;