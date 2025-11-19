'use strict';

const BaseHybridDevice = require('../../lib/devices/BaseHybridDevice');
const { CLUSTER } = require('zigbee-clusters');

class AirConditionerDevice extends BaseHybridDevice {

  async onNodeInit({ zclNode }) {
    // Initialize hybrid base (power detection)
    await super.onNodeInit({ zclNode });

    // Setup sensor capabilities (SDK3)
    await this.setupTemperatureSensor();

    this.printNode();

    // onoff capability
    if (this.hasCapability('onoff')) {
      this.registerCapability('onoff', CLUSTER.ON_OFF, {
        endpoint: 1
      });
    }

    // target_temperature capability
    if (this.hasCapability('target_temperature')) {
      /* REFACTOR: registerCapability deprecated with cluster spec.
   Original: this.registerCapability('target_temperature', CLUSTER.THERMOSTAT,
   Replace with SDK3 pattern - see ZigbeeDevice docs
   Capability: 'target_temperature', Cluster: CLUSTER.THERMOSTAT
*/
      // this.registerCapability('target_temperature', CLUSTER.THERMOSTAT, {
      //         endpoint: 1,
      //         getOpts: {
      //           getOnStart: true
      //         }
      //       });
    }

    // measure_temperature capability
    if (this.hasCapability('measure_temperature')) {
      /* REFACTOR: registerCapability deprecated with cluster spec.
   Original: this.registerCapability('measure_temperature', CLUSTER.THERMOSTAT,
   Replace with SDK3 pattern - see ZigbeeDevice docs
   Capability: 'measure_temperature', Cluster: CLUSTER.THERMOSTAT
*/
      // this.registerCapability('measure_temperature', CLUSTER.THERMOSTAT, {
      //         endpoint: 1,
      //         getOpts: {
      //           getOnStart: true
      //     }
      //   });
    }

    // thermostat_mode capability
    if (this.hasCapability('thermostat_mode')) {
      /* REFACTOR: registerCapability deprecated with cluster spec.
    Original: this.registerCapability('thermostat_mode', 61184,
    Replace with SDK3 pattern - see ZigbeeDevice docs
    Capability: 'thermostat_mode', Cluster: 61184
    */
      // this.registerCapability('thermostat_mode', 61184, {
      //         endpoint: 1,
      //         set: async (value) => {
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
  /* REFACTOR: registerCapability deprecated with cluster spec.
Original: this.registerCapability('fan_speed', 61184,
Replace with SDK3 pattern - see ZigbeeDevice docs
Capability: 'fan_speed', Cluster: 61184
*/
  // this.registerCapability('fan_speed', 61184, {
  //         endpoint: 1,
  //         set: async (value) => {
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


  /**
   * Setup measure_temperature capability (SDK3)
   * Cluster 1026 - measuredValue
   */
  async setupTemperatureSensor() {
  if (!this.hasCapability('measure_temperature')) {
    return;
  }

  this.log('[TEMP]  Setting up measure_temperature (cluster 1026)...');

  const endpoint = this.zclNode.endpoints[1];
  if (!endpoint?.clusters[1026]) {
    this.log('[WARN]  Cluster 1026 not available');
    return;
  }

  try {
    /* REFACTOR: registerCapability deprecated with cluster spec.
 Original: this.registerCapability('measure_temperature', 1026,
 Replace with SDK3 pattern - see ZigbeeDevice docs
 Capability: 'measure_temperature', Cluster: 1026
*/
    // this.registerCapability('measure_temperature', 1026, {
    //         get: 'measuredValue',
    //         report: 'measuredValue',
    //         reportParser: value => value / 100,
    //         reportOpts: {
    //           configureAttributeReporting: {
    //             minInterval: 60,
    //             maxInterval: 3600,
    //             minChange: 10
  }
        },
getOpts: {
  getOnStart: true
}
      });

this.log('[OK] measure_temperature configured (cluster 1026)');
    } catch (err) {
  this.error('measure_temperature setup failed:', err);
}
  }
}

module.exports = AirConditionerDevice;
