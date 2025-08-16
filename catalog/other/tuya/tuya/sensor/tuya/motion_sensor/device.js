#!/usr/bin/env node
'use strict';

'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER, Cluster, ZCLDataTypes } = require('zigbee-clusters');

class MotionSensorDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.log('motion_sensor device initialized');
    
    // Register capabilities based on device type
    await this.registerCapability('measure_temperature', CLUSTER.TEMPERATURE_MEASUREMENT, {
      getOpts: {
        getOnStart: true,
        pollInterval: 300000,
        getOnOnline: true
      }
    });
    await this.registerCapability('measure_humidity', CLUSTER.RELATIVE_HUMIDITY_MEASUREMENT, {
      getOpts: {
        getOnStart: true,
        pollInterval: 300000,
        getOnOnline: true
      }
    });
    await this.registerCapability('measure_pressure', CLUSTER.BASIC, {
      getOpts: {
        getOnStart: true,
        pollInterval: 300000,
        getOnOnline: true
      }
    });
    
    this.log('motion_sensor capabilities registered successfully');
  }
}

module.exports = MotionSensorDevice;