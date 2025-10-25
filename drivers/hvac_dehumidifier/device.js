'use strict';

const BaseHybridDevice = require('../../lib/BaseHybridDevice');
const { CLUSTER } = require('zigbee-clusters');

class DehumidifierDevice extends BaseHybridDevice {
  
  async onNodeInit({ zclNode }) {
    // Initialize hybrid base (power detection)
    await super.onNodeInit();

    // Setup sensor capabilities (SDK3)
    await this.setupHumiditySensor();
    await this.setupTemperatureSensor();

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


  /**
   * Setup measure_humidity capability (SDK3)
   * Cluster 1029 - measuredValue
   */
  async setupHumiditySensor() {
    if (!this.hasCapability('measure_humidity')) {
      return;
    }
    
    this.log('🌡️  Setting up measure_humidity (cluster 1029)...');
    
    const endpoint = this.zclNode.endpoints[1];
    if (!endpoint?.clusters[1029]) {
      this.log('⚠️  Cluster 1029 not available');
      return;
    }
    
    try {
      this.registerCapability('measure_humidity', 1029, {
        get: 'measuredValue',
        report: 'measuredValue',
        reportParser: value => value / 100,
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 60,
            maxInterval: 3600,
            minChange: 100
          }
        },
        getOpts: {
          getOnStart: true
        }
      });
      
      this.log('✅ measure_humidity configured (cluster 1029)');
    } catch (err) {
      this.error('measure_humidity setup failed:', err);
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
    
    this.log('🌡️  Setting up measure_temperature (cluster 1026)...');
    
    const endpoint = this.zclNode.endpoints[1];
    if (!endpoint?.clusters[1026]) {
      this.log('⚠️  Cluster 1026 not available');
      return;
    }
    
    try {
      this.registerCapability('measure_temperature', 1026, {
        get: 'measuredValue',
        report: 'measuredValue',
        reportParser: value => value / 100,
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 60,
            maxInterval: 3600,
            minChange: 10
          }
        },
        getOpts: {
          getOnStart: true
        }
      });
      
      this.log('✅ measure_temperature configured (cluster 1026)');
    } catch (err) {
      this.error('measure_temperature setup failed:', err);
    }
  }
}

module.exports = DehumidifierDevice;
