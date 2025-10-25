'use strict';

const BaseHybridDevice = require('../../lib/BaseHybridDevice');

/**
 * PirRadarIlluminationSensorDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class PirRadarIlluminationSensorDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('PirRadarIlluminationSensorDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit().catch(err => this.error(err));

    // Setup sensor capabilities (SDK3)
    await this.setupLuminanceSensor();
    
    this.log('PirRadarIlluminationSensorDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  
  /**
   * Setup measure_luminance capability (SDK3)
   * Cluster 1024 - measuredValue
   */
  async setupLuminanceSensor() {
    if (!this.hasCapability('measure_luminance')) {
      return;
    }
    
    this.log('🌡️  Setting up measure_luminance (cluster 1024)...');
    
    const endpoint = this.zclNode.endpoints[1];
    if (!endpoint?.clusters[1024]) {
      this.log('⚠️  Cluster 1024 not available');
      return;
    }
    
    try {
      this.registerCapability('measure_luminance', 1024, {
        get: 'measuredValue',
        report: 'measuredValue',
        reportParser: value => Math.pow(10, (value - 1) / 10000),
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
      
      this.log('✅ measure_luminance configured (cluster 1024)');
    } catch (err) {
      this.error('measure_luminance setup failed:', err);
    }
  }

  async onDeleted() {
    this.log('PirRadarIlluminationSensorDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = PirRadarIlluminationSensorDevice;
