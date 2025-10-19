'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class SamsungSmartPlugAcDevice extends ZigBeeDevice {
  
  async onNodeInit({ zclNode }) {
    this.printNode();
    
    this.registerCapability('onoff', CLUSTER.ON_OFF, { endpoint: 1 });
    // measure_power - to implement
    // meter_power - to implement
    
    this.log('Smart Plug (Samsung) initialized');
  }
  
}

module.exports = SamsungSmartPlugAcDevice;
