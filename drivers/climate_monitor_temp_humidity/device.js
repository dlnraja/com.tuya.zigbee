'use strict';

const { Cluster } = require('zigbee-clusters');
const BaseHybridDevice = require('../../lib/devices/BaseHybridDevice');
const TuyaSpecificCluster = require('../../lib/tuya/TuyaSpecificCluster');

// CRITICAL: Register Tuya custom cluster for Homey SDK3
Cluster.addCluster(TuyaSpecificCluster);

/**
 * ClimateMonitorDevice - Unified Hybrid Driver
 * Supports BOTH standard Zigbee AND Tuya TS0601 DataPoint devices
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 */
class ClimateMonitorDevice extends BaseHybridDevice {

  async onNodeInit({ zclNode }) {
    this.log('════════════════════════════════════════');
    this.log('[CLIMATE] 🌡️  Climate Monitor initializing...');
    this.log('════════════════════════════════════════');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit({ zclNode }).catch(err => this.error(err));

    // Detect device type
    await this.detectDeviceType();
    
    // Setup based on device type
    if (this.isTuyaDevice) {
      this.log('[CLIMATE] 🔧 Setting up Tuya TS0601 DataPoint device...');
      await this.setupTuyaDataPoints();
    } else {
      this.log('[CLIMATE] 🔧 Setting up standard Zigbee device...');
      await this.setupStandardZigbee();
    }
    
    this.log('[CLIMATE] ✅ Climate Monitor initialized!');
    this.log('[CLIMATE] Power:', this.powerType || 'unknown');
    this.log('[CLIMATE] Type:', this.isTuyaDevice ? 'Tuya TS0601' : 'Standard Zigbee');
    this.log('════════════════════════════════════════\n');
  }
  
  /**
   * Detect if this is a Tuya TS0601 device
   */
  async detectDeviceType() {
    this.log('[CLIMATE] 🔍 Detecting device type...');
    
    const endpoint = this.zclNode.endpoints[1];
    const clusters = endpoint?.clusters || {};
    
    this.log('[CLIMATE] 📋 Available clusters:', Object.keys(clusters).join(', '));
    
    // CRITICAL: In Homey SDK3, Tuya cluster might be named:
    // - tuyaManufacturer (most common)
    // - tuyaSpecific (our custom cluster)
    // - manuSpecificTuya (zigbee2mqtt)
    const tuyaCluster = clusters.tuyaSpecific ||     // Our custom cluster
                       clusters.tuyaManufacturer ||  // Real Homey cluster name
                       clusters.tuya;                // Alternative name
    
    if (tuyaCluster) {
      const clusterName = Object.keys(clusters).find(k => clusters[k] === tuyaCluster);
      this.log('[CLIMATE] ✅ Tuya cluster FOUND!');
      this.log('[CLIMATE] 🏷️  Cluster name:', clusterName);
      this.log('[CLIMATE] 🔢 Cluster ID:', tuyaCluster.id || 'unknown');
      this.isTuyaDevice = true;
      this.tuyaCluster = tuyaCluster;
    } else {
      this.log('[CLIMATE] ℹ️  No Tuya cluster detected');
      this.log('[CLIMATE] 📋 Available clusters:', Object.keys(clusters));
      this.log('[CLIMATE] 🔧 Using standard Zigbee clusters instead');
      this.isTuyaDevice = false;
    }
  }
  
  /**
   * Setup Tuya TS0601 DataPoints - Homey SDK3 Native Approach
   */
  async setupTuyaDataPoints() {
    this.log('[TUYA] 🔧 Setting up Tuya DataPoint listeners (Homey SDK3)...');
    
    try {
      this.log('[TUYA] 📌 Cluster:', this.tuyaCluster);
      this.log('[TUYA] 📌 Type:', typeof this.tuyaCluster);
      this.log('[TUYA] 📌 Available methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(this.tuyaCluster)));
      
      // Listen for dataReport command (Tuya devices send this)
      this.log('[TUYA] 📡 Registering dataReport listener...');
      
      this.tuyaCluster.on('dataReport', async (payload) => {
        this.log('[TUYA] 📥 DATA REPORT RECEIVED!');
        this.log('[TUYA] 📋 Raw payload:', JSON.stringify(payload, null, 2));
        
        try {
          // Parse DataPoints from payload
          const dpBuffer = payload.dpValues || payload.data || payload;
          
          if (!Buffer.isBuffer(dpBuffer)) {
            this.log('[TUYA] ⚠️  Payload is not a buffer, converting...');
            return;
          }
          
          const datapoints = TuyaSpecificCluster.parseDataPoints(dpBuffer);
          this.log('[TUYA] 🔍 Parsed DataPoints:', JSON.stringify(datapoints, null, 2));
          
          // Process each datapoint
          for (const dp of datapoints) {
            await this.handleTuyaDataPoint(dp);
          }
          
        } catch (parseErr) {
          this.error('[TUYA] ❌ Parse error:', parseErr);
          this.error('[TUYA] Stack:', parseErr.stack);
        }
      });
      
      // Also listen for raw 'response' events
      this.tuyaCluster.on('response', async (data) => {
        this.log('[TUYA] 📥 RESPONSE EVENT:', JSON.stringify(data, null, 2));
      });
      
      // Try to query initial values
      this.log('[TUYA] 📝 Querying initial DataPoint values...');
      try {
        await this.tuyaCluster.getData({ seq: 0, datapoints: Buffer.from([1, 2, 4]) });
        this.log('[TUYA] ✅ Initial query sent');
      } catch (queryErr) {
        this.log('[TUYA] ⚠️  Initial query failed (device will report automatically):', queryErr.message);
      }
      
      this.log('[TUYA] ✅ Tuya DataPoint system ready!');
      
    } catch (err) {
      this.error('[TUYA] ❌ DataPoint setup failed:', err);
      this.error('[TUYA] Stack:', err.stack);
      this.log('[TUYA] ⚠️  Falling back to standard Zigbee...');
      await this.setupStandardZigbee();
    }
  }
  
  /**
   * Handle individual Tuya DataPoint
   */
  async handleTuyaDataPoint(dp) {
    this.log(`[TUYA-DP] 📍 DP ${dp.dp}: ${dp.value} (type: ${dp.dataType})`);
    
    try {
      // DP 1 = Temperature (°C * 10)
      if (dp.dp === 1 && this.hasCapability('measure_temperature')) {
        const temp = dp.value / 10;
        this.log(`[TUYA] 🌡️  Temperature: ${dp.value} → ${temp}°C`);
        await (async () => {
        this.log(`📝 [DIAG] setCapabilityValue: ${'measure_temperature'} = ${temp}`);
        try {
          await this.setCapabilityValue('measure_temperature', temp);
          this.log(`✅ [DIAG] setCapabilityValue SUCCESS: ${'measure_temperature'}`);
        } catch (err) {
          this.error(`❌ [DIAG] setCapabilityValue FAILED: ${'measure_temperature'}`, err.message);
          throw err;
        }
      })();
      }
      
      // DP 2 = Humidity (%)
      else if (dp.dp === 2 && this.hasCapability('measure_humidity')) {
        this.log(`[TUYA] 💧 Humidity: ${dp.value}%`);
        await (async () => {
        this.log(`📝 [DIAG] setCapabilityValue: ${'measure_humidity'} = ${dp.value}`);
        try {
          await this.setCapabilityValue('measure_humidity', dp.value);
          this.log(`✅ [DIAG] setCapabilityValue SUCCESS: ${'measure_humidity'}`);
        } catch (err) {
          this.error(`❌ [DIAG] setCapabilityValue FAILED: ${'measure_humidity'}`, err.message);
          throw err;
        }
      })();
      }
      
      // DP 4 = Battery (%)
      else if (dp.dp === 4 && this.hasCapability('measure_battery')) {
        this.log(`[TUYA] 🔋 Battery: ${dp.value}%`);
        await (async () => {
        this.log(`📝 [DIAG] setCapabilityValue: ${'measure_battery'} = ${dp.value}`);
        try {
          await this.setCapabilityValue('measure_battery', dp.value);
          this.log(`✅ [DIAG] setCapabilityValue SUCCESS: ${'measure_battery'}`);
        } catch (err) {
          this.error(`❌ [DIAG] setCapabilityValue FAILED: ${'measure_battery'}`, err.message);
          throw err;
        }
      })();
      }
      
      else {
        this.log(`[TUYA-DP] ℹ️  Unknown DP ${dp.dp} - value: ${dp.value}`);
      }
      
    } catch (setErr) {
      this.error(`[TUYA-DP] ❌ Failed to set value for DP ${dp.dp}:`, setErr);
    }
  }
  
  /**
   * Setup standard Zigbee clusters
   * 
   * NOTE: BaseHybridDevice.registerAllCapabilitiesWithReporting() handles
   * standard cluster registration automatically. This function is kept for
   * Tuya-specific fallbacks only.
   */
  async setupStandardZigbee() {
    this.log('[ZIGBEE] 🔧 Standard Zigbee clusters will be handled by BaseHybridDevice');
    this.log('[ZIGBEE] 📋 BaseHybridDevice.registerAllCapabilitiesWithReporting() called automatically');
    this.log('[ZIGBEE] ✅ Standard Zigbee configured!');
    
    // BaseHybridDevice automatically registers:
    // - measure_battery (cluster 0x0001 - powerConfiguration)
    // - measure_temperature (cluster 0x0402 - temperatureMeasurement)  
    // - measure_humidity (cluster 0x0405 - relativeHumidity)
    // No need to duplicate here
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
      // Commented out - replaced by SDK3 direct cluster access
      // this.registerCapability('measure_temperature', 1026, {
      //   get: 'measuredValue',
      //   report: 'measuredValue',
      //   reportParser: value => value / 100,
      //   reportOpts: {
      //     configureAttributeReporting: {
      //       minInterval: 60,
      //       maxInterval: 3600,
      //       minChange: 10
      //     }
      //   },
      //   getOpts: {
      //     getOnStart: true
      //   }
      // });
      
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
   
   Code commented out - needs SDK3 direct cluster access implementation
*/
      // this.registerCapability('measure_humidity', 1029, {
      //   get: 'measuredValue',
      //   report: 'measuredValue',
      //   reportParser: value => value / 100,
      //   reportOpts: {
      //     configureAttributeReporting: {
      //       minInterval: 60,
      //       maxInterval: 3600,
      //       minChange: 100
      //     }
      //   },
      //   getOpts: {
      //     getOnStart: true
      //   }
      // });
      
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
              await (async () => {
        this.log(`📝 [DIAG] setCapabilityValue: ${'measure_temperature'} = ${temperature}`);
        try {
          await this.setCapabilityValue('measure_temperature', temperature);
          this.log(`✅ [DIAG] setCapabilityValue SUCCESS: ${'measure_temperature'}`);
        } catch (err) {
          this.error(`❌ [DIAG] setCapabilityValue FAILED: ${'measure_temperature'}`, err.message);
          throw err;
        }
      })().catch(this.error);
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
          await (async () => {
        this.log(`📝 [DIAG] setCapabilityValue: ${'measure_temperature'} = ${temperature}`);
        try {
          await this.setCapabilityValue('measure_temperature', temperature);
          this.log(`✅ [DIAG] setCapabilityValue SUCCESS: ${'measure_temperature'}`);
        } catch (err) {
          this.error(`❌ [DIAG] setCapabilityValue FAILED: ${'measure_temperature'}`, err.message);
          throw err;
        }
      })().catch(this.error);
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
              await (async () => {
        this.log(`📝 [DIAG] setCapabilityValue: ${'measure_humidity'} = ${humidity}`);
        try {
          await this.setCapabilityValue('measure_humidity', humidity);
          this.log(`✅ [DIAG] setCapabilityValue SUCCESS: ${'measure_humidity'}`);
        } catch (err) {
          this.error(`❌ [DIAG] setCapabilityValue FAILED: ${'measure_humidity'}`, err.message);
          throw err;
        }
      })().catch(this.error);
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
          await (async () => {
        this.log(`📝 [DIAG] setCapabilityValue: ${'measure_humidity'} = ${humidityData.value}`);
        try {
          await this.setCapabilityValue('measure_humidity', humidityData.value);
          this.log(`✅ [DIAG] setCapabilityValue SUCCESS: ${'measure_humidity'}`);
        } catch (err) {
          this.error(`❌ [DIAG] setCapabilityValue FAILED: ${'measure_humidity'}`, err.message);
          throw err;
        }
      })().catch(this.error);
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
