'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER, Cluster, ZCLDataTypes } = require('zigbee-clusters');

class Ts0601CoverDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.log('ts0601_cover device initialized');
    
    // Register capabilities based on device type
    await this.registerCapability('windowcoverings_state', CLUSTER.WINDOW_COVERING, {
      getOpts: {
        getOnStart: true,
        pollInterval: 300000,
        getOnOnline: true
      }
    });
    await this.registerCapability('windowcoverings_set', CLUSTER.WINDOW_COVERING, {
      getOpts: {
        getOnStart: true,
        pollInterval: 300000,
        getOnOnline: true
      }
    });
    
    this.log('ts0601_cover capabilities registered successfully');
  }
}

module.exports = Ts0601CoverDevice;