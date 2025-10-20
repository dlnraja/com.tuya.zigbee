'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class Remote4buttonStyrbarBatteryDevice extends ZigBeeDevice {
  
  async onNodeInit({ zclNode }) {
    this.printNode();
    
    // IKEA STYRBAR Remote Control
    
    this.log('Remote 4 Button (IKEA) initialized');
  }
}

module.exports = Remote4buttonStyrbarBatteryDevice;
