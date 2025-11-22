'use strict';

const BaseHybridDevice = require('../../lib/BaseHybridDevice');

/**
 * HumidityControllerDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class HumidityControllerDevice extends BaseHybridDevice {

  async onNodeInit({ zclNode }) {
    this.log('HumidityControllerDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit({ zclNode }).catch(err => this.error(err));

    // Setup sensor capabilities (SDK3)
    await this.setupTemperatureSensor();
    await this.setupHumiditySensor();
    
    this.log('HumidityControllerDevice initialized - Power source:', this.powerSource || 'unknown');
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

  /**
   * Setup measure_humidity capability (SDK3)
   * Cluster 1029 - measuredValue
   */
  async setupHumiditySensor() {
    if (!this.hasCapability('measure_humidity')) {
      return;
    }
    
    this.log('[TEMP]  Setting up measure_humidity (cluster 1029)...');
    
    const endpoint = this.zclNode.endpoints[1];
    if (!endpoint?.clusters[1029]) {
      this.log('[WARN]  Cluster 1029 not available');
      return;
    }
    
    try {
      /* REFACTOR: registerCapability deprecated with cluster spec.
   Original: this.registerCapability('measure_humidity', 1029,
   Replace with SDK3 pattern - see ZigbeeDevice docs
   Capability: 'measure_humidity', Cluster: 1029
*/
// this.registerCapability('measure_humidity', 1029, {
//         get: 'measuredValue',
//         report: 'measuredValue',
//         reportParser: value => value / 100,
//         reportOpts: {
//           configureAttributeReporting: {
//             minInterval: 60,
//             maxInterval: 3600,
//             minChange: 100
          }
        },
        getOpts: {
          getOnStart: true
        }
      });
      
      this.log('[OK] measure_humidity configured (cluster 1029)');
    } catch (err) {
      this.error('measure_humidity setup failed:', err);
    }
  }

  async onDeleted() {
    this.log('HumidityControllerDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = HumidityControllerDevice;
