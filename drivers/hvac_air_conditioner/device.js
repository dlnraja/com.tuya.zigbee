'use strict';

const BaseHybridDevice = require('../../lib/BaseHybridDevice');
const { CLUSTER } = require('zigbee-clusters');

class AirConditionerDevice extends BaseHybridDevice {
  
  async onNodeInit({ zclNode }) {
    // Initialize hybrid base (power detection)
    await super.onNodeInit();

    this.printNode();
    
    // onoff capability
    if (this.hasCapability('onoff')) {
      this.registerCapability('onoff', CLUSTER.ON_OFF, {
        endpoint: 1
      });
    }
    
    // target_temperature capability
    if (this.hasCapability('target_temperature')) {
      this.registerCapability('target_temperature', CLUSTER.THERMOSTAT, {
        endpoint: 1,
        getOpts: {
          getOnStart: true
        }
      });
    }
    
    // measure_temperature capability
    if (this.hasCapability('measure_temperature')) {
      this.registerCapability('measure_temperature', CLUSTER.THERMOSTAT, {
        endpoint: 1,
        getOpts: {
          getOnStart: true
        }
      });
    }
    
    // thermostat_mode capability
    if (this.hasCapability('thermostat_mode')) {
      this.registerCapability('thermostat_mode', 61184, {
        endpoint: 1,
        set: async (value) => {
          const modes = {
            'cool': 0,
            'heat': 1,
            'auto': 2,
            'dry': 3,
            'fan': 4
          };
          return {
            dp: 4, // Tuya datapoint for mode
            datatype: 4, // Enum type
            data: modes[value] || 0
          };
        },
        get: 'data',
        reportParser: (value) => {
          if (value && value.dp === 4) {
            const modes = ['cool', 'heat', 'auto', 'dry', 'fan'];
            return modes[value.data] || 'auto';
          }
          return null;
        }
      });
    }
    
    // fan_speed capability
    if (this.hasCapability('fan_speed')) {
      this.registerCapability('fan_speed', 61184, {
        endpoint: 1,
        set: async (value) => {
          const speeds = {
            'low': 0,
            'medium': 1,
            'high': 2,
            'auto': 3
          };
          return {
            dp: 5, // Tuya datapoint for fan speed
            datatype: 4, // Enum type
            data: speeds[value] || 3
          };
        },
        get: 'data',
        reportParser: (value) => {
          if (value && value.dp === 5) {
            const speeds = ['low', 'medium', 'high', 'auto'];
            return speeds[value.data] || 'auto';
          }
          return null;
        }
      });
    }
    
    this.log('Air conditioner device initialized');
  }
  
}

module.exports = AirConditionerDevice;
