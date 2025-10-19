'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class SamsungWaterLeakSensorBatteryDevice extends ZigBeeDevice {
  
  async onNodeInit({ zclNode }) {
    this.printNode();
    
    // alarm_water - to implement
    this.registerCapability('measure_temperature', CLUSTER.TEMPERATURE_MEASUREMENT);
    this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
      get: 'batteryPercentageRemaining',
      reportParser: value => value / 2
    });
    
    this.log('Water Leak Sensor (Samsung) initialized');
  }
  
}

module.exports = SamsungWaterLeakSensorBatteryDevice;
