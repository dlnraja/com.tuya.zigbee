'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER, Cluster, ZCLDataTypes } = require('zigbee-clusters');

class Ts0206Device extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.log('ts0206 device initialized');
    
    // Register capabilities based on device type
    await this.registerCapability('alarm_siren', CLUSTER.ALARMS, {
      getOpts: {
        getOnStart: true,
        pollInterval: 300000,
        getOnOnline: true
      }
    });
    
    this.log('ts0206 capabilities registered successfully');
  }
}

module.exports = Ts0206Device;