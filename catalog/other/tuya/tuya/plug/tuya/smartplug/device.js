#!/usr/bin/env node
'use strict';

'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER, Cluster, ZCLDataTypes } = require('zigbee-clusters');

class SmartplugDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.log('smartplug device initialized');
    
    // Register capabilities based on device type
    await this.registerCapability('onoff', CLUSTER.ON_OFF, {
      getOpts: {
        getOnStart: true,
        pollInterval: 300000,
        getOnOnline: true
      }
    });
    await this.registerCapability('measure_power', CLUSTER.ELECTRICAL_MEASUREMENT, {
      getOpts: {
        getOnStart: true,
        pollInterval: 300000,
        getOnOnline: true
      }
    });
    await this.registerCapability('measure_current', CLUSTER.BASIC, {
      getOpts: {
        getOnStart: true,
        pollInterval: 300000,
        getOnOnline: true
      }
    });
    await this.registerCapability('measure_voltage', CLUSTER.BASIC, {
      getOpts: {
        getOnStart: true,
        pollInterval: 300000,
        getOnOnline: true
      }
    });
    
    this.log('smartplug capabilities registered successfully');
  }
}

module.exports = SmartplugDevice;