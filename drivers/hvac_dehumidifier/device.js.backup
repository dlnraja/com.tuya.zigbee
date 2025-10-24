'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class DehumidifierDevice extends ZigBeeDevice {
  
  async onNodeInit({ zclNode }) {
    this.printNode();
    
    // onoff capability
    if (this.hasCapability('onoff')) {
      this.registerCapability('onoff', CLUSTER.ON_OFF, {
        endpoint: 1
      });
    }
    
    // target_humidity capability via Tuya datapoints
    if (this.hasCapability('target_humidity')) {
      this.registerCapability('target_humidity', 61184, {
        endpoint: 1,
        set: async (value) => {
          return {
            dp: 2, // Tuya datapoint for target humidity
            datatype: 2, // Value type
            data: Math.round(value)
          };
        },
        get: 'data',
        reportParser: (value) => {
          if (value && value.dp === 2) {
            return value.data;
          }
          return null;
        }
      });
    }
    
    // measure_humidity capability via Tuya datapoints
    if (this.hasCapability('measure_humidity')) {
      this.registerCapability('measure_humidity', 61184, {
        endpoint: 1,
        get: 'data',
        reportParser: (value) => {
          if (value && value.dp === 1) { // Current humidity datapoint
            return value.data;
          }
          return null;
        }
      });
    }
    
    // measure_temperature capability (if available)
    if (this.hasCapability('measure_temperature')) {
      this.registerCapability('measure_temperature', 61184, {
        endpoint: 1,
        get: 'data',
        reportParser: (value) => {
          if (value && value.dp === 3) { // Temperature datapoint
            return value.data / 10; // Usually in 0.1°C units
          }
          return null;
        }
      });
    }
    
    // measure_power capability (if available)
    if (this.hasCapability('measure_power')) {
      this.registerCapability('measure_power', 61184, {
        endpoint: 1,
        get: 'data',
        reportParser: (value) => {
          if (value && value.dp === 5) { // Power datapoint
            return value.data;
          }
          return null;
        }
      });
    }
    
    // alarm_water capability (water tank full)
    if (this.hasCapability('alarm_water')) {
      this.registerCapability('alarm_water', 61184, {
        endpoint: 1,
        get: 'data',
        reportParser: (value) => {
          if (value && value.dp === 11) { // Water tank status
            return value.data === 1; // 1 = full, 0 = not full
          }
          return null;
        }
      });
    }
    
    this.log('Dehumidifier device initialized');
  }
  
}

module.exports = DehumidifierDevice;
