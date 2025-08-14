'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER, Cluster, ZCLDataTypes } = require('zigbee-clusters');

class Radar24gDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.log('radar-24g device initialized');
    
    // Register capabilities based on device type
    await this.registerCapability('onoff', CLUSTER.ON_OFF, {
      getOpts: {
        getOnStart: true,
        pollInterval: 300000,
        getOnOnline: true
      }
    });
    await this.registerCapability('dim', CLUSTER.LEVEL_CONTROL, {
      getOpts: {
        getOnStart: true,
        pollInterval: 300000,
        getOnOnline: true
      }
    });
    
    this.log('radar-24g capabilities registered successfully');
  }
}

module.exports = Radar24gDevice;