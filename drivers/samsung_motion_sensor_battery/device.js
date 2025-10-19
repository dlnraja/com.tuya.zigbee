'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class SamsungMotionSensorBatteryDevice extends ZigBeeDevice {
  
  async onNodeInit({ zclNode }) {
    this.printNode();
    
    this.registerCapability('alarm_motion', CLUSTER.IAS_ZONE, {
      zoneType: 'motion',
      zoneState: 'alarm_1'
    });
    this.registerCapability('measure_temperature', CLUSTER.TEMPERATURE_MEASUREMENT);
    this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
      get: 'batteryPercentageRemaining',
      reportParser: value => value / 2
    });
    
    this.log('Motion Sensor (Samsung) initialized');
  }
  
}

module.exports = SamsungMotionSensorBatteryDevice;
