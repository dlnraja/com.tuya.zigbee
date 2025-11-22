'use strict';

const BaseHybridDevice = require('../../lib/BaseHybridDevice');
const { CLUSTER } = require('zigbee-clusters');

/**
 * Soil Moisture Sensor - TS0601 by _TZE204_myd45weu, _TZE200_wqashyqo, HOBEIAN
 * 
 * Supports:
 * - Soil moisture (0-100%)
 * - Temperature (°C)
 * - Air humidity (%)
 * - Battery level (%)
 * 
 * Based on:
 * - GitHub ZHA Issue #4122
 * - PR #47 by community
 * - HOBEIAN manufacturer research
 * 
 * Tuya Data Points:
 * - DP1: Soil Moisture (%)
 * - DP2: Temperature (°C × 10)
 * - DP3: Humidity (% × 10)
 * - DP4: Battery (%)
 * 
 * Clusters:
 * - 0x0000 (Basic)
 * - 0x0001 (Power Configuration) - Battery
 * - 0x0003 (Identify)
 * - 0x0402 (Temperature Measurement)
 * - 0x0405 (Relative Humidity Measurement)
 * - 0xEF00 (Tuya Private Cluster) - For soil moisture via DP
 */
class SoilMoistureSensor extends BaseHybridDevice {

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });

    this.log('Soil Moisture Sensor initializing...');

    // Register standard Zigbee capabilities
    await this.registerCapabilities();

    // Setup Tuya DP handlers for soil moisture
    await this.setupTuyaDPHandlers();

    // Apply offsets from settings
    await this.applyOffsets();

    this.log('✅ Soil Moisture Sensor initialized');
  }

  /**
   * Register Zigbee capabilities
   */
  async registerCapabilities() {
    // Temperature (Cluster 0x0402)
    if (this.hasCapability('measure_temperature')) {
      try {
        this.registerCapability('measure_temperature', CLUSTER.TEMPERATURE_MEASUREMENT, {
          get: 'measuredValue',
          reportOpts: {
            configureAttributeReporting: {
              minInterval: 0,
              maxInterval: 3600,
              minChange: 50
            }
          },
          getOpts: {
            getOnStart: true,
            getOnOnline: true
          }
        });
        this.log('✅ Temperature capability registered (Zigbee native)');
      } catch (err) {
        this.log('⚠️ Temperature via Zigbee failed, will use Tuya DP:', err.message);
      }
    }

    // Humidity (Cluster 0x0405)
    if (this.hasCapability('measure_humidity')) {
      try {
        this.registerCapability('measure_humidity', CLUSTER.RELATIVE_HUMIDITY_MEASUREMENT, {
          get: 'measuredValue',
          reportOpts: {
            configureAttributeReporting: {
              minInterval: 0,
              maxInterval: 3600,
              minChange: 100
            }
          },
          getOpts: {
            getOnStart: true,
            getOnOnline: true
          }
        });
        this.log('✅ Humidity capability registered (Zigbee native)');
      } catch (err) {
        this.log('⚠️ Humidity via Zigbee failed, will use Tuya DP:', err.message);
      }
    }

    // Battery (Cluster 0x0001)
    if (this.hasCapability('measure_battery')) {
      try {
        this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
          get: 'batteryPercentageRemaining',
          reportOpts: {
            configureAttributeReporting: {
              minInterval: 3600,
              maxInterval: 64800,
              minChange: 2
            }
          },
          getOpts: {
            getOnStart: true,
            getOnOnline: true,
            pollInterval: 3600000 // Every hour
          }
        });
        this.log('✅ Battery capability registered (Zigbee native)');
      } catch (err) {
        this.log('⚠️ Battery via Zigbee failed, will use Tuya DP:', err.message);
      }
    }
  }

  /**
   * Setup Tuya DP handlers for soil moisture
   * Soil moisture is typically only available via Tuya DP, not standard Zigbee
   */
  async setupTuyaDPHandlers() {
    // Check if we have Tuya EF00 manager
    if (!this.tuyaEF00Manager) {
      this.log('⚠️ No Tuya EF00 manager, soil moisture might not work');
      return;
    }

    // DP1: Soil Moisture (0-100%)
    this.tuyaEF00Manager.on('dp-1', (value) => {
      this.log(`[TUYA-DP] Soil Moisture DP1 = ${value}%`);
      
      if (this.hasCapability('measure_moisture')) {
        // Apply offset if configured
        const offset = this.getSetting('moisture_offset') || 0;
        const adjusted = Math.max(0, Math.min(100, value + offset));
        
        this.setCapabilityValue('measure_moisture', adjusted).catch(this.error);
      }
    });

    // DP2: Temperature (°C × 10)
    this.tuyaEF00Manager.on('dp-2', (value) => {
      this.log(`[TUYA-DP] Temperature DP2 = ${value / 10}°C`);
      
      if (this.hasCapability('measure_temperature')) {
        const offset = this.getSetting('temperature_offset') || 0;
        const adjusted = (value / 10) + offset;
        
        this.setCapabilityValue('measure_temperature', adjusted).catch(this.error);
      }
    });

    // DP3: Humidity (% × 10)
    this.tuyaEF00Manager.on('dp-3', (value) => {
      this.log(`[TUYA-DP] Humidity DP3 = ${value / 10}%`);
      
      if (this.hasCapability('measure_humidity')) {
        const offset = this.getSetting('humidity_offset') || 0;
        const adjusted = Math.max(0, Math.min(100, (value / 10) + offset));
        
        this.setCapabilityValue('measure_humidity', adjusted).catch(this.error);
      }
    });

    // DP4: Battery (%)
    this.tuyaEF00Manager.on('dp-4', (value) => {
      this.log(`[TUYA-DP] Battery DP4 = ${value}%`);
      
      if (this.hasCapability('measure_battery')) {
        this.setCapabilityValue('measure_battery', value).catch(this.error);
      }
      
      // Update battery alarm
      if (this.hasCapability('alarm_battery')) {
        this.setCapabilityValue('alarm_battery', value < 20).catch(this.error);
      }
    });

    // Request initial values
    this.log('📥 Requesting initial DP values...');
    setTimeout(() => {
      [1, 2, 3, 4].forEach(dp => {
        if (this.tuyaEF00Manager.requestDP) {
          this.tuyaEF00Manager.requestDP(dp);
        }
      });
    }, 2000);
  }

  /**
   * Apply offsets from settings
   */
  async applyOffsets() {
    const settings = this.getSettings();
    
    if (settings.temperature_offset || settings.humidity_offset || settings.moisture_offset) {
      this.log('📊 Offsets configured:', {
        temperature: settings.temperature_offset || 0,
        humidity: settings.humidity_offset || 0,
        moisture: settings.moisture_offset || 0
      });
    }
  }

  /**
   * Handle settings changes
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('⚙️ Settings changed:', changedKeys);

    // Re-apply offsets
    await this.applyOffsets();

    // If offsets changed, request new values to update immediately
    if (changedKeys.some(key => key.includes('offset'))) {
      this.log('🔄 Offsets changed, requesting new values...');
      
      if (this.tuyaEF00Manager && this.tuyaEF00Manager.requestDP) {
        setTimeout(() => {
          [1, 2, 3, 4].forEach(dp => this.tuyaEF00Manager.requestDP(dp));
        }, 500);
      }
    }
  }

  /**
   * Log device info on delete
   */
  async onDeleted() {
    this.log('🗑️ Soil Moisture Sensor removed');
    
    // Cleanup
    if (this.tuyaEF00Manager) {
      this.tuyaEF00Manager.removeAllListeners('dp-1');
      this.tuyaEF00Manager.removeAllListeners('dp-2');
      this.tuyaEF00Manager.removeAllListeners('dp-3');
      this.tuyaEF00Manager.removeAllListeners('dp-4');
    }
    
    await super.onDeleted();
  }
}

module.exports = SoilMoistureSensor;
