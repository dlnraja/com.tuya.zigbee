'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class SonoffSmartPlugAcDevice extends ZigBeeDevice {
  
  async onNodeInit({ zclNode }) {
    this.printNode();
    
    this.registerCapability('onoff', CLUSTER.ON_OFF, { endpoint: 1 });
    // measure_power - to implement
    
    this.log('Smart Plug (Sonoff) initialized');
  }
  
}

module.exports = SonoffSmartPlugAcDevice;
