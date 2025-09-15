'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class IkeaTradfriBulb extends ZigBeeDevice {
  
  async onNodeInit({ zclNode }) {
    // Initialize device
    this.log('IKEA Tradfri Bulb initialized');
    
        // Register capability listeners
    this.registerCapabilityListener('onoff', this.onCapabilityOnoff.bind(this));
    if (this.hasCapability('dim')) {
      this.registerCapabilityListener('dim', this.onCapabilityDim.bind(this));
    }
  }
  
  
  async onCapabilityOnoff(value) {
    await this.zclNode.endpoints[1].clusters.genOnOff.setOn(value);
    return value;
  }
  
  async onCapabilityDim(value) {
    if (this.zclNode.endpoints[1].clusters.genLevelCtrl) {
      await this.zclNode.endpoints[1].clusters.genLevelCtrl.moveToLevel({
        level: Math.round(value * 254),
        transtime: 1
      });
    }
    return value;
  }
}

module.exports = IkeaTradfriBulb;