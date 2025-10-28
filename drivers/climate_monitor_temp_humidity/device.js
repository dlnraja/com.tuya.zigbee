'use strict';

const BaseHybridDevice = require('../../lib/BaseHybridDevice');

/**
 * ClimateMonitorDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class ClimateMonitorDevice extends BaseHybridDevice {

  async onNodeInit({ zclNode }) {
    this.log('ClimateMonitorDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit().catch(err => this.error(err));

    // Setup sensor capabilities (SDK3)
    await this.setupTemperatureSensor();
    await this.setupHumiditySensor();
    
    this.log('ClimateMonitorDevice initialized - Power source:', this.powerSource || 'unknown');
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
      this.log('[WARN]  Cluster 1026 not available, trying Tuya DP fallback...');
      await this.setupTuyaTemperatureFallback();
      return;
    }
    
    try {
      /* REFACTOR: registerCapability deprecated with cluster spec.
   Original: this.registerCapability('measure_temperature', 1026,
   Replace with SDK3 pattern - see ZigbeeDevice docs
   Capability: 'measure_temperature', Cluster: 1026
*/
// this.registerCapability('measure_temperature', 1026, {
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
      this.log('[WARN]  Cluster 1029 not available, trying Tuya DP fallback...');
      await this.setupTuyaHumidityFallback();
      return;
    }
    
    try {
      /* REFACTOR: registerCapability deprecated with cluster spec.
   Original: this.registerCapability('measure_humidity', 1029,
   Replace with SDK3 pattern - see ZigbeeDevice docs
   Capability: 'measure_humidity', Cluster: 1029
*/
// this.registerCapability('measure_humidity', 1029, {
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
      
      this.log('[OK] measure_humidity configured (cluster 1029)');
    } catch (err) {
      this.error('measure_humidity setup failed:', err);
    }
  }

  /**
   * Setup Tuya DP fallback for temperature (DP 1)
   * Used when standard cluster 1026 is not available
   */
  async setupTuyaTemperatureFallback() {
    try {
      const endpoint = this.zclNode.endpoints[1];
      const tuyaCluster = endpoint?.clusters?.manuSpecificTuya || endpoint?.clusters?.['0xEF00'];
      
      if (!tuyaCluster) {
        this.log('[WARN]  Tuya cluster (0xEF00) not available for temperature');
        return;
      }
      
      this.log('📱 Using Tuya DP fallback for temperature');
      
      // Listen for Tuya DP reporting
      tuyaCluster.on('reporting', async (data) => {
        try {
          // DP 1 is typically temperature in Tuya devices
          if (data.dp === 1 || data.datapoint === 1) {
            const rawTemp = data.value || data.data;
            // Tuya usually sends temperature in 0.1°C units
            const temperature = typeof rawTemp === 'number' ? rawTemp / 10 : rawTemp;
            this.log(`[TEMP] Tuya temperature update: ${temperature}°C (DP1)`);
            if (this.hasCapability('measure_temperature')) {
              await this.setCapabilityValue('measure_temperature', temperature).catch(this.error);
            }
          }
        } catch (err) {
          this.error('Tuya temperature DP error:', err.message);
        }
      });
      
      // Try to read initial value
      try {
        const tempData = await tuyaCluster.read('dp', 1).catch(() => null);
        if (tempData?.value !== undefined && tempData?.value !== null) {
          const temperature = tempData.value / 10;
          this.log(`[TEMP] Tuya initial temperature: ${temperature}°C`);
          await this.setCapabilityValue('measure_temperature', temperature).catch(this.error);
        }
      } catch (err) {
        this.log('Tuya temperature read (non-critical):', err.message);
      }
      
      this.log('[OK] Tuya temperature fallback configured (DP1)');
    } catch (err) {
      this.error('Tuya temperature fallback failed:', err.message);
    }
  }

  /**
   * Setup Tuya DP fallback for humidity (DP 2)
   * Used when standard cluster 1029 is not available
   */
  async setupTuyaHumidityFallback() {
    try {
      const endpoint = this.zclNode.endpoints[1];
      const tuyaCluster = endpoint?.clusters?.manuSpecificTuya || endpoint?.clusters?.['0xEF00'];
      
      if (!tuyaCluster) {
        this.log('[WARN]  Tuya cluster (0xEF00) not available for humidity');
        return;
      }
      
      this.log('📱 Using Tuya DP fallback for humidity');
      
      // Listen for Tuya DP reporting
      tuyaCluster.on('reporting', async (data) => {
        try {
          // DP 2 is typically humidity in Tuya devices
          if (data.dp === 2 || data.datapoint === 2) {
            const humidity = data.value || data.data;
            // Tuya usually sends humidity as percentage directly
            this.log(`[HUMID] Tuya humidity update: ${humidity}% (DP2)`);
            if (this.hasCapability('measure_humidity')) {
              await this.setCapabilityValue('measure_humidity', humidity).catch(this.error);
            }
          }
        } catch (err) {
          this.error('Tuya humidity DP error:', err.message);
        }
      });
      
      // Try to read initial value
      try {
        const humidityData = await tuyaCluster.read('dp', 2).catch(() => null);
        if (humidityData?.value !== undefined && humidityData?.value !== null) {
          this.log(`[HUMID] Tuya initial humidity: ${humidityData.value}%`);
          await this.setCapabilityValue('measure_humidity', humidityData.value).catch(this.error);
        }
      } catch (err) {
        this.log('Tuya humidity read (non-critical):', err.message);
      }
      
      this.log('[OK] Tuya humidity fallback configured (DP2)');
    } catch (err) {
      this.error('Tuya humidity fallback failed:', err.message);
    }
  }

  async onDeleted() {
    this.log('ClimateMonitorDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = ClimateMonitorDevice;
