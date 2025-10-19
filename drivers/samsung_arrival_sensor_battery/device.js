'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class SamsungArrivalSensorBatteryDevice extends ZigBeeDevice {
  
  async onNodeInit({ zclNode }) {
    this.printNode();
    
    // alarm_generic - to implement
    this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
      get: 'batteryPercentageRemaining',
      reportParser: value => value / 2
    });
    
    this.log('Arrival Sensor (Samsung) initialized');
  }
  
}

module.exports = SamsungArrivalSensorBatteryDevice;
