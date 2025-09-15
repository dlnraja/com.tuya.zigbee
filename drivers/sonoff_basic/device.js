'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class SonoffBasic extends ZigBeeDevice {
  
  async onNodeInit({ zclNode }) {
    // Initialize device
    this.log('Sonoff Basic initialized');
    
        // Basic device initialization
    this.registerCapabilityListener('onoff', this.onCapabilityOnoff.bind(this));
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

module.exports = SonoffBasic;