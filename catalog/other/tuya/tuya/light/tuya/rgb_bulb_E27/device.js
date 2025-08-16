#!/usr/bin/env node
'use strict';

'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER, Cluster, ZCLDataTypes } = require('zigbee-clusters');

class RgbBulbE27Device extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.log('rgb_bulb_E27 device initialized');
    
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
    await this.registerCapability('light_hue', CLUSTER.BASIC, {
      getOpts: {
        getOnStart: true,
        pollInterval: 300000,
        getOnOnline: true
      }
    });
    await this.registerCapability('light_saturation', CLUSTER.BASIC, {
      getOpts: {
        getOnStart: true,
        pollInterval: 300000,
        getOnOnline: true
      }
    });
    await this.registerCapability('light_temperature', CLUSTER.BASIC, {
      getOpts: {
        getOnStart: true,
        pollInterval: 300000,
        getOnOnline: true
      }
    });
    
    this.log('rgb_bulb_E27 capabilities registered successfully');
  }
}

module.exports = RgbBulbE27Device;