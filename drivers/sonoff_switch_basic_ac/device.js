'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class SonoffSwitchBasicAcDevice extends ZigBeeDevice {
  
  async onNodeInit({ zclNode }) {
    this.printNode();
    
    this.registerCapability('onoff', CLUSTER.ON_OFF, { endpoint: 1 });
    
    this.log('Basic Switch (Sonoff) initialized');
  }
  
}

module.exports = SonoffSwitchBasicAcDevice;
