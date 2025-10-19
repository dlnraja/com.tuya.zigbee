'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class XiaomiMotionSensorBatteryDevice extends ZigBeeDevice {
  
  async onNodeInit({ zclNode }) {
    this.printNode();
    
    this.registerCapability('alarm_motion', CLUSTER.IAS_ZONE, {
      zoneType: 'motion',
      zoneState: 'alarm_1'
    });
    this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
      get: 'batteryPercentageRemaining',
      reportParser: value => value / 2
    });
    // measure_luminance - to implement
    
    this.log('Motion Sensor (Xiaomi) initialized');
  }
  
}

module.exports = XiaomiMotionSensorBatteryDevice;
