'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER, Cluster, ZCLDataTypes } = require('zigbee-clusters');

class Ts0204Device extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.log('ts0204 device initialized');
    
    // Register capabilities based on device type
    await this.registerCapability('alarm_contact', CLUSTER.BINARY_INPUT, {
      getOpts: {
        getOnStart: true,
        pollInterval: 300000,
        getOnOnline: true
      }
    });
    
    this.log('ts0204 capabilities registered successfully');
  }
}

module.exports = Ts0204Device;