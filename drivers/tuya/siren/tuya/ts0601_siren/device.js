'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER, Cluster, ZCLDataTypes } = require('zigbee-clusters');

class Ts0601SirenDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.log('ts0601_siren device initialized');
    
    // Register capabilities based on device type
    await this.registerCapability('alarm_siren', CLUSTER.ALARMS, {
      getOpts: {
        getOnStart: true,
        pollInterval: 300000,
        getOnOnline: true
      }
    });
    
    this.log('ts0601_siren capabilities registered successfully');
  }
}

module.exports = Ts0601SirenDevice;