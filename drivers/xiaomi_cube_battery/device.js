'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class XiaomiCubeBatteryDevice extends ZigBeeDevice {
  
  async onNodeInit({ zclNode }) {
    this.printNode();
    
    this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
      get: 'batteryPercentageRemaining',
      reportParser: value => value / 2
    });
    
    this.log('Cube Controller (Xiaomi) initialized');
  }
  
}

module.exports = XiaomiCubeBatteryDevice;
