'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER, Cluster, ZCLDataTypes } = require('zigbee-clusters');

class TuyaZigbeeDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.log('tuya_zigbee device initialized');
    
    // Register capabilities based on device type
    await this.registerCapability('onoff', CLUSTER.ON_OFF, {
      getOpts: {
        getOnStart: true,
        pollInterval: 300000,
        getOnOnline: true
      }
    });
    
    // Add more capabilities based on device type
    if (this.hasCapability('dim')) {
      await this.registerCapability('dim', CLUSTER.LEVEL_CONTROL, {
        getOpts: {
          getOnStart: true,
          pollInterval: 300000,
          getOnOnline: true
        }
      });
    }
  }
}

module.exports = TuyaZigbeeDevice;