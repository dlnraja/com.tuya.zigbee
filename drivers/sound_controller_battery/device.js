'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class SoundControllerBatteryDevice extends ZigBeeDevice {
  
  async onNodeInit({ zclNode }) {
    this.printNode();
    
    // IKEA SYMFONISK Sound Controller
    
    this.log('Sound Controller (IKEA) initialized');
  }
}

module.exports = SoundControllerBatteryDevice;
