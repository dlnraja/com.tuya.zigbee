'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class XiaomiWallSwitch2gangAcDevice extends ZigBeeDevice {
  
  async onNodeInit({ zclNode }) {
    this.printNode();
    
    this.registerCapability('onoff', CLUSTER.ON_OFF, { endpoint: 1 });
    // onoff.1 - to implement
    
    this.log('Wall Switch 2 Gang (Xiaomi) initialized');
  }
  
}

module.exports = XiaomiWallSwitch2gangAcDevice;
