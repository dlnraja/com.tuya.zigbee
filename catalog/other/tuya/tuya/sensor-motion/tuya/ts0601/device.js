#!/usr/bin/env node
'use strict';

'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER, Cluster, ZCLDataTypes } = require('zigbee-clusters');

class Ts0601Device extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.log('ts0601 device initialized');
    
    // Register capabilities based on device type
    await this.registerCapability('alarm_motion', CLUSTER.OCCUPANCY_SENSING, {
      getOpts: {
        getOnStart: true,
        pollInterval: 300000,
        getOnOnline: true
      }
    });
    
    this.log('ts0601 capabilities registered successfully');
  }
}

module.exports = Ts0601Device;