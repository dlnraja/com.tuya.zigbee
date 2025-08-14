'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER, Cluster, ZCLDataTypes } = require('zigbee-clusters');

class Ts0601ContactDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.log('ts0601_contact device initialized');
    
    // Register capabilities based on device type
    await this.registerCapability('alarm_contact', CLUSTER.BINARY_INPUT, {
      getOpts: {
        getOnStart: true,
        pollInterval: 300000,
        getOnOnline: true
      }
    });
    
    this.log('ts0601_contact capabilities registered successfully');
  }
}

module.exports = Ts0601ContactDevice;