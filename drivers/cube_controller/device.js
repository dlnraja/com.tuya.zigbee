'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class AqaraCube extends ZigBeeDevice {
  
  async onNodeInit({ zclNode }) {
    // Initialize device
    this.log('Aqara Cube initialized');
    
        // Register button events
    if (zclNode.endpoints[1]?.clusters?.genOnOff) {
      zclNode.endpoints[1].clusters.genOnOff.on('attr.onOff', () => {
        this.homey.flow.getDeviceTriggerCard('button_pressed').trigger(this).catch(this.error);
      });
    }
  }
  
  
}

module.exports = AqaraCube;