'use strict';

const BaseHybridDevice = require('../../lib/devices/BaseHybridDevice');
const TuyaDPMapper = require('../../lib/tuya/TuyaDPMapper');
const TuyaDPDiscovery = require('../../lib/tuya/TuyaDPDiscovery');
const TuyaTimeSyncManager = require('../../lib/tuya/TuyaTimeSyncManager');
const BatteryManagerV4 = require('../../lib/BatteryManagerV4');

/**
 * ClimateMonitorDevice - Enhanced SDK3 Climate Monitor
 *
 * Features:
 * - Temperature & Humidity sensing (clusters 1026, 1029)
 * - Multi-protocol battery detection (Zigbee/Tuya/Xiaomi)
 * - Time/Date synchronization to device screen
 * - Backlight control button
 * - Hybrid power support (AC/DC/Battery)
 * - SDK3 compliant: Numeric cluster IDs only
 *
 * Supported Protocols:
 * - Standard Zigbee (TS0201, _TZ3000_* series)
 * - Tuya Custom (TS0601, _TZE200_* series, cluster 61184)
 * - Xiaomi/Aqara (lumi.* series)
 *
 * Clusters:
 * - 0 (Basic): Device info, power source
 * - 1 (PowerConfiguration): Standard Zigbee battery
 * - 3 (Identify): Device identification
 * - 10 (Time): Standard Zigbee time sync
 * - 1026 (TemperatureMeasurement): Temperature sensor
 * - 1029 (RelativeHumidity): Humidity sensor
 * - 61184 (TuyaCustom/0xEF00): Tuya-specific features
 */
class ClimateMonitorDevice extends BaseHybridDevice {

  async onNodeInit({ zclNode }) {
    this.log('[CLIMATE-V4] 🌡️  ClimateMonitorDevice initializing (ULTRA VERSION)...');

    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit({ zclNode }).catch(err => this.error(err));

    // 🆕 V4: AUTO DP MAPPING (intelligent!)
    if (this.tuyaEF00Manager) {
      this.log('[CLIMATE-V4] 🤖 Starting auto DP mapping...');
      await TuyaDPMapper.autoSetup(this, zclNode).catch(err => {
        this.log('[CLIMATE-V4] ⚠️  Auto-mapping failed:', err.message);
      });
    }

    // 🆕 V4: TIME SYNC MANAGER (pour affichage date/heure)
    this.timeSyncManager = new TuyaTimeSyncManager(this);
    await this.timeSyncManager.initialize(zclNode).catch(err => {
      this.log('[CLIMATE-V4] ⚠️  Time sync init failed:', err.message);
    });

    // 🆕 V4: BATTERY MANAGER V4 (ultra-précis avec courbes voltage)
    this.batteryManagerV4 = new BatteryManagerV4(this, 'AAA'); // Climate sensors = AAA
    await this.batteryManagerV4.startMonitoring().catch(err => {
      this.log('[CLIMATE-V4] ⚠️  Battery V4 init failed:', err.message);
    });

    // 🆕 V4: DP DISCOVERY MODE (si debug activé)
    const settings = this.getSettings();
    if (settings.dp_discovery_mode === true) {
      this.dpDiscovery = new TuyaDPDiscovery(this);
      this.dpDiscovery.startDiscovery();
      this.log('[CLIMATE-V4] 🔍 DP Discovery active - interact with device!');
    }

    // Setup Tuya DP listeners for climate data (legacy support)
    if (this.tuyaEF00Manager && this.tuyaEF00Manager.tuyaCluster) {
      await this.setupClimateListeners();
    }

    // Setup climate sensing (temperature & humidity)
    await this.setupClimateSensing();

    // Setup backlight button control
    await this.setupBacklightButton();

    this.log('[CLIMATE-V4] ✅ ClimateMonitor ready (V4 ULTRA)');
    this.log(`   Power source: ${this.powerType || 'unknown'}`);
    this.log(`   Model: ${this.getData().manufacturerName}`);
    this.log(`   Battery type: ${this.batteryManagerV4?.batteryType || 'unknown'}`);
    this.log(`   Time sync: ${this.timeSyncManager ? 'enabled' : 'disabled'}`);
  }

  /**
   * Setup climate sensing capabilities (SDK3)
   * Uses numeric cluster IDs: 1026 (temperature), 1029 (humidity)
   */
  async setupClimateSensing() {
    this.log('[TEMP]  Setting up climate sensing (SDK3)...');

    const endpoint = this.zclNode.endpoints[1];
    if (!endpoint) {
      this.log('[WARN]  Endpoint 1 not available');
      return;
    }

    try {
      // Temperature (Cluster 1026) - WORKING SDK3 VERSION
      const tempCluster = endpoint.clusters?.msTemperatureMeasurement;
      if (this.hasCapability('measure_temperature') && tempCluster) {
        this.log('[TEMP] Configuring temperature sensor...');

        // Read initial value
        try {
          const { measuredValue } = await tempCluster.readAttributes(['measuredValue']);
          const temp = measuredValue / 100;
          this.log('[TEMP] ✅ Initial temperature:', temp, '°C');
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
        } catch (readErr) {
          this.log('[TEMP] ⚠️  Initial read failed');
        }

        // Listen for reports
        tempCluster.on('attr.measuredValue', async (value) => {
          const temp = value / 100;
          this.log('[TEMP] 📊 Temperature update:', temp, '°C');
          await (async () => {
            this.log(`📝 [DIAG] setCapabilityValue: ${'measure_temperature'} = ${temp}`);
            try {
              await this.setCapabilityValue('measure_temperature', temp);
              this.log(`✅ [DIAG] setCapabilityValue SUCCESS: ${'measure_temperature'}`);
            } catch (err) {
              this.error(`❌ [DIAG] setCapabilityValue FAILED: ${'measure_temperature'}`, err.message);
              throw err;
            }
          })().catch(this.error);
        });

        // Configure reporting
        try {
          await this.configureAttributeReporting([{
            endpointId: 1,
            cluster: 'msTemperatureMeasurement',
            attributeName: 'measuredValue',
            minInterval: 60,
            maxInterval: 3600,
            minChange: 10
          }]);
          this.log('[TEMP] ✅ Reporting configured');
        } catch (reportErr) {
          this.log('[TEMP] ⚠️  Reporting config failed');
        }

        this.log('[OK] Temperature sensor configured (cluster 1026)');
      }

      // Humidity (Cluster 1029) - WORKING SDK3 VERSION
      const humidityCluster = endpoint.clusters?.msRelativeHumidity;
      if (this.hasCapability('measure_humidity') && humidityCluster) {
        this.log('[HUMID] Configuring humidity sensor...');

        // Read initial value
        try {
          const { measuredValue } = await humidityCluster.readAttributes(['measuredValue']);
          const humidity = measuredValue / 100;
          this.log('[HUMID] ✅ Initial humidity:', humidity, '%');
          await (async () => {
            this.log(`📝 [DIAG] setCapabilityValue: ${'measure_humidity'} = ${humidity}`);
            try {
              await this.setCapabilityValue('measure_humidity', humidity);
              this.log(`✅ [DIAG] setCapabilityValue SUCCESS: ${'measure_humidity'}`);
            } catch (err) {
              this.error(`❌ [DIAG] setCapabilityValue FAILED: ${'measure_humidity'}`, err.message);
              throw err;
            }
          })();
        } catch (readErr) {
          this.log('[HUMID] ⚠️  Initial read failed');
        }

        // Listen for reports
        humidityCluster.on('attr.measuredValue', async (value) => {
          const humidity = value / 100;
          this.log('[HUMID] 📊 Humidity update:', humidity, '%');
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
        });

        // Configure reporting
        try {
          await this.configureAttributeReporting([{
            endpointId: 1,
            cluster: 'msRelativeHumidity',
            attributeName: 'measuredValue',
            minInterval: 60,
            maxInterval: 3600,
            minChange: 100
          }]);
          this.log('[HUMID] ✅ Reporting configured');
        } catch (reportErr) {
          this.log('[HUMID] ⚠️  Reporting config failed');
        }

        this.log('[OK] Humidity sensor configured (cluster 1029)');
      }

      this.log('[OK] Climate sensing configured');
    } catch (err) {
      this.error('Climate sensing setup failed:', err);
    }
  }

  /**
   * Setup multi-protocol battery detection (SDK3)
   * Supports: Standard Zigbee, Tuya Custom, Xiaomi/Aqara
   */
  async setupMultiProtocolBattery() {
    if (!this.hasCapability('measure_battery')) {
      return;
    }

    this.log('[BATTERY] Setting up multi-protocol battery detection...');

    const endpoint = this.zclNode.endpoints[1];
    const manufacturer = this.getData().manufacturerName || '';

    // Method 1: Standard Zigbee (Cluster 1 - PowerConfiguration) - WORKING VERSION
    const powerCluster = endpoint?.clusters?.powerConfiguration;
    if (powerCluster) {
      try {
        this.log('[BATTERY] Using Standard Zigbee battery...');

        // Read initial value
        try {
          const { batteryPercentageRemaining } = await powerCluster.readAttributes(['batteryPercentageRemaining']);
          const battery = Math.round(batteryPercentageRemaining / 2);
          this.log('[BATTERY] ✅ Initial battery:', battery, '%');
          await (async () => {
            this.log(`📝 [DIAG] setCapabilityValue: ${'measure_battery'} = ${battery}`);
            try {
              await this.setCapabilityValue('measure_battery', battery);
              this.log(`✅ [DIAG] setCapabilityValue SUCCESS: ${'measure_battery'}`);
            } catch (err) {
              this.error(`❌ [DIAG] setCapabilityValue FAILED: ${'measure_battery'}`, err.message);
              throw err;
            }
          })();
        } catch (readErr) {
          this.log('[BATTERY] ⚠️  Initial read failed');
        }

        // Listen for reports
        powerCluster.on('attr.batteryPercentageRemaining', async (value) => {
          const battery = Math.round(value / 2);
          this.log('[BATTERY] 📊 Battery update:', battery, '%');
          await (async () => {
            this.log(`📝 [DIAG] setCapabilityValue: ${'measure_battery'} = ${battery}`);
            try {
              await this.setCapabilityValue('measure_battery', battery);
              this.log(`✅ [DIAG] setCapabilityValue SUCCESS: ${'measure_battery'}`);
            } catch (err) {
              this.error(`❌ [DIAG] setCapabilityValue FAILED: ${'measure_battery'}`, err.message);
              throw err;
            }
          })().catch(this.error);
        });

        // Configure reporting
        try {
          await this.configureAttributeReporting([{
            endpointId: 1,
            cluster: 'powerConfiguration',
            attributeName: 'batteryPercentageRemaining',
            minInterval: 300,
            maxInterval: 3600,
            minChange: 2
          }]);
          this.log('[BATTERY] ✅ Reporting configured');
        } catch (reportErr) {
          this.log('[BATTERY] ⚠️  Reporting config failed');
        }

        this.log('[OK] Battery: Standard Zigbee (cluster 1)');
        this.batteryMethod = 'zigbee_standard';
        return;
      } catch (err) {
        this.log('Standard battery failed:', err.message);
      }
    }

    // Method 2: Tuya Custom (Cluster 61184 / 0xEF00, DP 101)
    if (endpoint?.clusters[61184]) {
      try {
        endpoint.clusters[61184].on('response', async (data) => {
          if (data.dp === 101) { // Battery DP
            const battery = data.data.readUInt8(0);
            await (async () => {
              this.log(`📝 [DIAG] setCapabilityValue: ${'measure_battery'} = ${battery}`);
              try {
                await this.setCapabilityValue('measure_battery', battery);
                this.log(`✅ [DIAG] setCapabilityValue SUCCESS: ${'measure_battery'}`);
              } catch (err) {
                this.error(`❌ [DIAG] setCapabilityValue FAILED: ${'measure_battery'}`, err.message);
                throw err;
              }
            })().catch(this.error);
            this.log('[BATTERY] Battery (Tuya):', battery, '%');
          }
        });

        // Request initial battery status (NEW API: dpValues instead of dp)
        await endpoint.clusters[61184].command('dataQuery', {
          dpValues: [{ dp: 101 }]
        }).catch(() => { });

        this.log('[OK] Battery: Tuya Custom (cluster 61184, DP 101)');
        this.batteryMethod = 'tuya_custom';
        return;
      } catch (err) {
        this.log('Tuya battery failed:', err.message);
      }
    }

    // Method 3: Xiaomi/Aqara (Basic cluster attribute 0xFF01)
    if (manufacturer.startsWith('lumi.') && endpoint?.clusters[0]) {
      try {
        endpoint.clusters[0].on('attr.65281', async (value) => {
          if (value.batteryVoltage) {
            const battery = this.voltageToBattery(value.batteryVoltage);
            await (async () => {
              this.log(`📝 [DIAG] setCapabilityValue: ${'measure_battery'} = ${battery}`);
              try {
                await this.setCapabilityValue('measure_battery', battery);
                this.log(`✅ [DIAG] setCapabilityValue SUCCESS: ${'measure_battery'}`);
              } catch (err) {
                this.error(`❌ [DIAG] setCapabilityValue FAILED: ${'measure_battery'}`, err.message);
                throw err;
              }
            })().catch(this.error);
            this.log('[BATTERY] Battery (Xiaomi):', battery, '%');
          }
        });

        this.log('[OK] Battery: Xiaomi/Aqara (attribute 0xFF01)');
        this.batteryMethod = 'xiaomi_custom';
        return;
      } catch (err) {
        this.log('Xiaomi battery failed:', err.message);
      }
    }

    this.log('[WARN]  No battery detection method available');
    this.batteryMethod = 'none';
  }

  /**
   * Setup time synchronization to device screen
   * Supports both standard Zigbee Time cluster and Tuya custom
   */
  async setupTimeSync() {
    this.log('🕐 Setting up time synchronization...');

    const endpoint = this.zclNode.endpoints[1];

    // Detect supported time sync method
    this.timeSyncMethod = null;

    if (endpoint?.clusters[10]) {
      this.timeSyncMethod = 'zigbee_standard';
      this.log('[OK] Time sync: Standard Zigbee (cluster 10)');
    } else if (endpoint?.clusters[61184]) {
      this.timeSyncMethod = 'tuya_custom';
      this.log('[OK] Time sync: Tuya Custom (cluster 61184, DP 0x19)');
    } else {
      this.log('[INFO]  Time sync not available on this device');
      return;
    }

    // Initial time sync
    await this.syncTimeToDevice();

    // Auto-sync every hour
    this.timeSyncInterval = setInterval(async () => {
      await this.syncTimeToDevice();
    }, 60 * 60 * 1000); // 1 hour

    this.log('[OK] Auto time sync configured (every 1 hour)');
  }

  /**
   * Sync current time/date to device screen
   */
  async syncTimeToDevice() {
    if (!this.timeSyncMethod) {
      return;
    }

    try {
      const endpoint = this.zclNode.endpoints[1];
      const now = new Date();

      if (this.timeSyncMethod === 'zigbee_standard') {
        // Method 1: Standard Zigbee Time Cluster (10)
        const zigbeeEpoch = Math.floor(Date.now() / 1000) - 946684800; // Seconds since 2000-01-01

        await endpoint.clusters[10].writeAttributes({
          time: zigbeeEpoch,
          timeStatus: {
            master: false,
            synchronized: true,
            masterZoneDst: false,
            superseding: false
          }
        });

        this.log('🕐 Time synced:', now.toLocaleString(), '(Zigbee standard)');

      } else if (this.timeSyncMethod === 'tuya_custom') {
        // Method 2: Tuya Custom Cluster (61184, DP 0x19)
        const timeData = {
          dp: 0x19, // Time sync DP
          datatype: 0x02, // String
          data: Buffer.from([
            now.getFullYear() - 2000,
            now.getMonth() + 1,
            now.getDate(),
            now.getHours(),
            now.getMinutes(),
            now.getSeconds()
          ])
        };

        await endpoint.clusters[61184].command('dataReport', timeData);

        this.log('🕐 Time synced:', now.toLocaleString(), '(Tuya custom)');
      }
    } catch (err) {
      this.error('Time sync failed:', err.message);
    }
  }

  /**
   * Setup backlight button control
   * Adds button.backlight capability for screen backlight control
   */
  async setupBacklightButton() {
    this.log('[BULB] Setting up backlight button...');

    const endpoint = this.zclNode.endpoints[1];

    // Detect supported backlight control method
    this.backlightMethod = null;

    if (endpoint?.clusters[61184]) {
      this.backlightMethod = 'tuya_custom';
      this.log('[OK] Backlight: Tuya Custom (cluster 61184, DP 0x0E)');
    } else if (endpoint?.clusters[3]) {
      this.backlightMethod = 'identify';
      this.log('[OK] Backlight: Identify cluster (cluster 3, flash)');
    } else {
      this.log('[INFO]  Backlight control not available on this device');
      return;
    }

    // Add button.backlight capability if not present
    if (!this.hasCapability('button.backlight')) {
      await this.addCapability('button.backlight').catch(err => {
        this.log('Could not add backlight button:', err.message);
        return;
      });
    }

    // Register button listener
    if (this.hasCapability('button.backlight')) {
      this.registerCapabilityListener('button.backlight', async () => {
        this.log('Backlight button pressed');
        try {
          await this.toggleBacklight();
        } catch (err) {
          this.error('Backlight toggle error:', err);
        }
      });
      this.log('[OK] Backlight button configured');
    }
  }

  /**
   * Toggle screen backlight
   */
  async toggleBacklight() {
    if (!this.backlightMethod) {
      return;
    }

    try {
      const endpoint = this.zclNode.endpoints[1];

      if (this.backlightMethod === 'tuya_custom') {
        // Method 1: Tuya Custom Cluster DP 0x0E
        await endpoint.clusters[61184].command('dataReport', {
          dp: 0x0E,
          datatype: 0x01, // Boolean
          data: Buffer.from([0x01]) // Toggle
        });

        this.log('[BULB] Backlight toggled (Tuya custom)');

      } else if (this.backlightMethod === 'identify') {
        // Method 2: Standard Identify cluster (flash briefly)
        const duration = this.getSetting('backlight_auto_off') || 10;

        await endpoint.clusters[3].identify({ identifyTime: duration });

        this.log(`[BULB] Screen flashed for ${duration}s (identify cluster)`);
      }
    } catch (err) {
      this.error('Backlight toggle failed:', err.message);
    }
  }

  /**
   * Convert battery voltage to percentage (for Xiaomi/Aqara)
   */
  voltageToBattery(voltage) {
    const batteryType = this.getSetting('battery_type') || 'CR2032';

    const voltageRanges = {
      'CR2032': { max: 3000, min: 2000 },
      'CR2450': { max: 3000, min: 2000 },
      'CR123A': { max: 3000, min: 2000 },
      'AA': { max: 1500, min: 900 },
      'AAA': { max: 1500, min: 900 }
    };

    const range = voltageRanges[batteryType] || voltageRanges['CR2032'];
    const percentage = Math.round(
      ((voltage - range.min) / (range.max - range.min)) * 100
    );

    return Math.max(0, Math.min(100, percentage));
  }

  async onDeleted() {
    this.log('[CLIMATE-V4] ClimateMonitorDevice deleted - cleanup...');

    // 🆕 V4: Stop Time Sync Manager
    if (this.timeSyncManager) {
      this.timeSyncManager.cleanup();
    }

    // 🆕 V4: Stop Battery Manager V4
    if (this.batteryManagerV4) {
      this.batteryManagerV4.stopMonitoring();
    }

    // 🆕 V4: Stop DP Discovery
    if (this.dpDiscovery && this.dpDiscovery.enabled) {
      const report = this.dpDiscovery.stopDiscovery();
      this.log('[CLIMATE-V4] Final DP discovery report saved');
    }

    // Clear legacy time sync interval
    if (this.timeSyncInterval) {
      clearInterval(this.timeSyncInterval);
    }

    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = ClimateMonitorDevice;
