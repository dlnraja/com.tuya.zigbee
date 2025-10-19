'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class SonoffTempHumiditySensorBatteryDevice extends ZigBeeDevice {
  
  async onNodeInit({ zclNode }) {
    this.printNode();
    
    this.registerCapability('measure_temperature', CLUSTER.TEMPERATURE_MEASUREMENT);
    this.registerCapability('measure_humidity', CLUSTER.RELATIVE_HUMIDITY_MEASUREMENT);
    this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
      get: 'batteryPercentageRemaining',
      reportParser: value => value / 2
    });
    
    this.log('Temp/Humidity Sensor (Sonoff) initialized');
  }
  
}

module.exports = SonoffTempHumiditySensorBatteryDevice;
