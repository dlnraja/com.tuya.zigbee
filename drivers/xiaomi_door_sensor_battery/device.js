'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class XiaomiDoorSensorBatteryDevice extends ZigBeeDevice {
  
  async onNodeInit({ zclNode }) {
    this.printNode();
    
    this.registerCapability('alarm_contact', CLUSTER.IAS_ZONE, {
      zoneType: 'contact',
      zoneState: 'alarm_1'
    });
    this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
      get: 'batteryPercentageRemaining',
      reportParser: value => value / 2
    });
    
    this.log('Door/Window Sensor (Xiaomi) initialized');
  }
  
}

module.exports = XiaomiDoorSensorBatteryDevice;
