'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class IkeaSymfoniskRemote extends ZigBeeDevice {
  
  async onNodeInit({ zclNode }) {
    // Initialize device
    this.log('IKEA Symfonisk Remote initialized');
    
        // Register button events
    if (zclNode.endpoints[1]?.clusters?.genOnOff) {
      zclNode.endpoints[1].clusters.genOnOff.on('attr.onOff', () => {
        this.homey.flow.getDeviceTriggerCard('button_pressed').trigger(this).catch(this.error);
      });
    }
  }
  
  
}

module.exports = IkeaSymfoniskRemote;