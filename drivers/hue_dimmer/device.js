'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class HueDimmer extends ZigBeeDevice {
  
  async onNodeInit({ zclNode }) {
    // Initialize device
    this.log('Philips Hue Dimmer initialized');
    
        // Register button events
    if (zclNode.endpoints[1]?.clusters?.genOnOff) {
      zclNode.endpoints[1].clusters.genOnOff.on('attr.onOff', () => {
        this.homey.flow.getDeviceTriggerCard('button_pressed').trigger(this).catch(this.error);
      });
    }
  }
  
  
}

module.exports = HueDimmer;