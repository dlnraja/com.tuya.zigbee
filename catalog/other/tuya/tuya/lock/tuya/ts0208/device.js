#!/usr/bin/env node
'use strict';

'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER, Cluster, ZCLDataTypes } = require('zigbee-clusters');

class Ts0208Device extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.log('ts0208 device initialized');
    
    // Register capabilities based on device type
    await this.registerCapability('lock_state', CLUSTER.DOOR_LOCK, {
      getOpts: {
        getOnStart: true,
        pollInterval: 300000,
        getOnOnline: true
      }
    });
    
    this.log('ts0208 capabilities registered successfully');
  }
}

module.exports = Ts0208Device;