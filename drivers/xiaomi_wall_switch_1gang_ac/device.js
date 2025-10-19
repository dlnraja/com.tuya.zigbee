'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class XiaomiWallSwitch1gangAcDevice extends ZigBeeDevice {
  
  async onNodeInit({ zclNode }) {
    this.printNode();
    
    this.registerCapability('onoff', CLUSTER.ON_OFF, { endpoint: 1 });
    
    this.log('Wall Switch 1 Gang (Xiaomi) initialized');
  }
  
}

module.exports = XiaomiWallSwitch1gangAcDevice;
