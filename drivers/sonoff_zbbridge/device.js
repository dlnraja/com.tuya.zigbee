'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class SonoffZbbridge extends ZigBeeDevice {
  
  async onNodeInit({ zclNode }) {
    // Initialize device
    this.log('Sonoff Zbbridge initialized');
    
        // Basic device initialization
    this.registerCapabilityListener('onoff', this.onCapabilityOnoff.bind(this));
  }
  
  
}

module.exports = SonoffZbbridge;