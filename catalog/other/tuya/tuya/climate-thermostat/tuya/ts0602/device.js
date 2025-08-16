#!/usr/bin/env node
'use strict';

'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER, Cluster, ZCLDataTypes } = require('zigbee-clusters');

class Ts0602Device extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.log('ts0602 device initialized');
    
    // Register capabilities based on device type
    await this.registerCapability('target_temperature', CLUSTER.THERMOSTAT, {
      getOpts: {
        getOnStart: true,
        pollInterval: 300000,
        getOnOnline: true
      }
    });
    await this.registerCapability('measure_temperature', CLUSTER.TEMPERATURE_MEASUREMENT, {
      getOpts: {
        getOnStart: true,
        pollInterval: 300000,
        getOnOnline: true
      }
    });
    
    this.log('ts0602 capabilities registered successfully');
  }
}

module.exports = Ts0602Device;