'use strict';

const { HybridSensorBase } = require('../../lib/devices');
const { syncDeviceTimeTuya } = require('../../lib/tuya/TuyaTimeSync');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║     CLIMATE SENSOR ULTIMATE - v5.5.189 MERGED (climate_sensor + climate_box) ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                              ║
 * ║  🔥 v5.5.189: ULTIMATE MERGED DRIVER - All features from both drivers       ║
 * ║  - Merged climate_sensor + climate_box_vvmbj46n into ONE driver             ║
 * ║  - Full Tuya DP support (DP1-20, DP101-103)                                 ║
 * ║  - Full ZCL support (0x0402, 0x0405, 0x0001) with bind/config               ║
 * ║  - Intelligent time sync (Tuya epoch 2000 for LCD, Unix for others)         ║
 * ║  - Calibration offsets for temp/humidity                                    ║
 * ║  - Wake detection + aggressive DP requests                                  ║
 * ║  - Battery via both ZCL and Tuya DP (×2 multiplier)                         ║
 * ║                                                                              ║
 * ║  SUPPORTED PROTOCOLS:                                                        ║
 * ║  ┌─────────────┬──────────────────────────────────────────────────────┐      ║
 * ║  │ Type        │ Protocol                                             │      ║
 * ║  ├─────────────┼──────────────────────────────────────────────────────┤      ║
 * ║  │ _TZE200_*   │ Tuya DP + cmd 0x24 (timeRequest → timeResponse)      │      ║
 * ║  │ _TZE204_*   │ Tuya DP + cmd 0x24 (similar to TZE200)               │      ║
 * ║  │ _TZE284_*   │ Tuya DP + cmd 0x24 + LCD clock (Tuya epoch 2000)     │      ║
 * ║  │ _TZ3000_*   │ ZCL standard (0x0402, 0x0405, 0x0001)                │      ║
 * ║  │ TS0201      │ ZCL standard (temperature, humidity, battery)        │      ║
 * ║  │ TS0601      │ Tuya proprietary (EF00 cluster)                      │      ║
 * ║  └─────────────┴──────────────────────────────────────────────────────┘      ║
 * ║                                                                              ║
 * ║  DP MAPPINGS (verified from Z2M TH05Z, WSD500A, RSH-TH01):                   ║
 * ║  - DP1: Temperature (÷10 = °C)                                               ║
 * ║  - DP2: Humidity (direct %)                                                  ║
 * ║  - DP4: Battery (×2, capped at 100%)                                         ║
 * ║  - DP6: Temperature alt (some _TZE204 models, ÷10)                           ║
 * ║  - DP7: Humidity alt (some _TZE204 models)                                   ║
 * ║  - DP9: Temperature unit (0=C, 1=F)                                          ║
 * ║  - DP10-13: Alarm thresholds (max/min temp/humidity)                         ║
 * ║  - DP14-15: Alarm status (NOT battery!)                                      ║
 * ║  - DP17-20: Reporting config (intervals, sensitivity)                        ║
 * ║  - DP18: Alt temperature on some firmware                                    ║
 * ║  - DP101-103: Button press / illuminance on some models                      ║
 * ║                                                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class ClimateSensorDevice extends HybridSensorBase {

  /** Battery powered */
  get mainsPowered() { return false; }

  // v5.5.189: Try BOTH ZCL and Tuya DP for battery (maximize compatibility)
  get usesTuyaDPBattery() { return true; }
  get skipZclBatteryPolling() { return false; } // Try both!

  // v5.5.54: FORCE ACTIVE MODE - Do NOT block DP requests in passive mode
  // Climate sensors need active queries even if cluster 0xEF00 not visible
  get forceActiveTuyaMode() { return true; }

  // v5.5.54: Enable TRUE HYBRID mode - listen to BOTH ZCL AND Tuya DP
  get hybridModeEnabled() { return true; }

  /** Capabilities for climate sensors */
  get sensorCapabilities() {
    return ['measure_temperature', 'measure_humidity', 'measure_battery'];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // v5.5.189: CALIBRATION OFFSETS (merged from climate_box_vvmbj46n)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get temperature offset from settings (for calibration)
   * @returns {number} Temperature offset in °C
   */
  get temperatureOffset() {
    const settings = this.getSettings() || {};
    // Support both naming conventions (temperature_calibration from driver.compose.json)
    return parseFloat(settings.temperature_calibration) || parseFloat(settings.temperature_offset) || 0;
  }

  /**
   * Get humidity offset from settings (for calibration)
   * @returns {number} Humidity offset in %
   */
  get humidityOffset() {
    const settings = this.getSettings() || {};
    // Support both naming conventions (humidity_calibration from driver.compose.json)
    return parseFloat(settings.humidity_calibration) || parseFloat(settings.humidity_offset) || 0;
  }

  /**
   * Apply calibration offset to temperature
   * @param {number} temp Raw temperature value
   * @returns {number} Calibrated temperature
   */
  _applyTempOffset(temp) {
    const offset = this.temperatureOffset;
    const calibrated = temp + offset;
    if (offset !== 0) {
      this.log(`[CALIBRATION] Temp: ${temp}°C + offset ${offset}°C = ${calibrated}°C`);
    }
    return calibrated;
  }

  /**
   * Apply calibration offset to humidity
   * @param {number} hum Raw humidity value
   * @returns {number} Calibrated humidity (clamped 0-100)
   */
  _applyHumOffset(hum) {
    const offset = this.humidityOffset;
    const calibrated = Math.max(0, Math.min(100, hum + offset));
    if (offset !== 0) {
      this.log(`[CALIBRATION] Humidity: ${hum}% + offset ${offset}% = ${calibrated}%`);
    }
    return calibrated;
  }

  /**
   * v5.4.8: CORRECTED DP MAPPINGS - Fixed soil sensor vs climate sensor confusion
   * Sources:
   * - https://github.com/Koenkk/zigbee2mqtt/issues/26078 (_TZE284_vvmbj46n TH05Z)
   * - https://raw.githubusercontent.com/kkossev/Hubitat/main/Drivers/Tuya Temperature Humidity Illuminance LCD Display with a Clock/Tuya_Temperature_Humidity_Illuminance_LCD_Display_with_a_Clock.groovy
   *
   * CRITICAL: DP3, DP5, DP15 are for SOIL SENSORS, NOT climate sensors!
   * _TZE284_vvmbj46n (TH05Z LCD) uses: DP1=temp, DP2=humidity, DP4=battery
   */
  get dpMappings() {
    return {
      // ═══════════════════════════════════════════════════════════════════
      // TEMPERATURE - Standard DP1 (all climate sensors) + alternative DP18
      // ═══════════════════════════════════════════════════════════════════
      1: { capability: 'measure_temperature', divisor: 10 },    // Standard: value/10 = °C
      18: { capability: 'measure_temperature', divisor: 10 },   // Alternative temp DP (some models)

      // ═══════════════════════════════════════════════════════════════════
      // HUMIDITY - Standard DP2 (all climate sensors)
      // ═══════════════════════════════════════════════════════════════════
      2: { capability: 'measure_humidity', divisor: 1 },        // Standard: direct %

      // ═══════════════════════════════════════════════════════════════════
      // BATTERY - Standard DP4 (most climate sensors with x2 multiplier)
      // v5.3.99: ZHA quirk shows DP4 has x*2 multiplier (device reports half)
      // ═══════════════════════════════════════════════════════════════════
      4: { capability: 'measure_battery', divisor: 1, transform: (v) => Math.min(v * 2, 100) },

      // ═══════════════════════════════════════════════════════════════════
      // v5.4.8: _TZE284_vvmbj46n TH05Z LCD CONFIGURATION DPs
      // These DPs are for device configuration/settings - not capabilities
      // Source: https://github.com/Koenkk/zigbee2mqtt/issues/26078
      // ═══════════════════════════════════════════════════════════════════
      9: { capability: null, setting: 'temperature_unit' },     // 0=Celsius, 1=Fahrenheit
      10: { capability: null, setting: 'max_temp_alarm', divisor: 10 },  // Max temp threshold (°C/10)
      11: { capability: null, setting: 'min_temp_alarm', divisor: 10 },  // Min temp threshold (°C/10)
      12: { capability: null, setting: 'max_humidity_alarm' },  // Max humidity threshold (%)
      13: { capability: null, setting: 'min_humidity_alarm' },  // Min humidity threshold (%)
      // v5.4.8: DP14/DP15 are alarm STATUS (enum: cancel/lower/upper), NOT alarm_generic
      14: { capability: null }, // Temp alarm status (no valid Homey capability)
      15: { capability: null }, // Humidity alarm status (no valid Homey capability - NOT battery!)
      17: { capability: null, setting: 'temp_report_interval' },  // Minutes (1-120)
      18: { capability: null, setting: 'humidity_report_interval' }, // Minutes (1-120) - was missing in early Z2M
      19: { capability: null, setting: 'temp_sensitivity', divisor: 10 },  // °C sensitivity (0.3-1.0)
      20: { capability: null, setting: 'humidity_sensitivity' }, // % sensitivity (3-10)

      // ═══════════════════════════════════════════════════════════════════
      // BUTTON PRESS (common for devices with buttons)
      // ═══════════════════════════════════════════════════════════════════
      101: { capability: 'button', transform: () => true },     // Button press
      102: { capability: 'button', transform: () => true },     // Alternative button

      // ═══════════════════════════════════════════════════════════════════
      // ADDITIONAL DPs (fallbacks for other climate sensor variants)
      // ═══════════════════════════════════════════════════════════════════
      6: { capability: 'measure_temperature', divisor: 10 },    // Some _TZE204 models
      7: { capability: 'measure_humidity', divisor: 1 },        // Some _TZE204 models
      103: { capability: 'measure_humidity', divisor: 1 },      // Some alternative models
    };
  }

  /**
   * v5.5.82: ENHANCED ZCL cluster handlers
   *
   * CRITICAL FOR TZE284 DEVICES:
   * TZE284 devices like _TZE284_vvmbj46n declare ZCL standard clusters:
   * - temperatureMeasurement
   * - relativeHumidity
   * - powerConfiguration
   *
   * These clusters MAY report data via ZCL even if Tuya DP doesn't work!
   */
  get clusterHandlers() {
    return {
      // ═══════════════════════════════════════════════════════════════════
      // TEMPERATURE - ZCL standard cluster (0x0402)
      // Value is in 0.01°C units, divide by 100
      // ═══════════════════════════════════════════════════════════════════
      temperatureMeasurement: {
        attributeReport: (data) => {
          if (data.measuredValue !== undefined) {
            const rawTemp = data.measuredValue / 100;
            // v5.5.108: Sanity check
            if (rawTemp < -40 || rawTemp > 80) {
              this.log(`[ZCL] ⚠️ Temperature out of range: ${rawTemp}°C - IGNORED`);
              return;
            }
            // v5.5.189: Apply calibration offset
            const temp = this._applyTempOffset(rawTemp);
            this.log(`[ZCL] 🌡️ Temperature: ${temp}°C`);
            this._registerZclData?.(); // v5.5.108: Track for learning
            this.setCapabilityValue('measure_temperature', temp).catch(() => { });
          }
        }
      },

      // ═══════════════════════════════════════════════════════════════════
      // HUMIDITY - ZCL standard cluster (0x0405)
      // Value is in 0.01% units, divide by 100
      // ═══════════════════════════════════════════════════════════════════
      relativeHumidity: {
        attributeReport: (data) => {
          if (data.measuredValue !== undefined) {
            const rawHum = data.measuredValue / 100;
            // v5.5.108: Sanity check
            if (rawHum < 0 || rawHum > 100) {
              this.log(`[ZCL] ⚠️ Humidity out of range: ${rawHum}% - IGNORED`);
              return;
            }
            // v5.5.189: Apply calibration offset
            const humidity = this._applyHumOffset(rawHum);
            this.log(`[ZCL] 💧 Humidity: ${humidity}%`);
            this._registerZclData?.(); // v5.5.108: Track for learning
            this.setCapabilityValue('measure_humidity', humidity).catch(() => { });
          }
        }
      },

      // ═══════════════════════════════════════════════════════════════════
      // BATTERY - ZCL standard cluster (0x0001)
      // ═══════════════════════════════════════════════════════════════════
      powerConfiguration: {
        attributeReport: (data) => {
          if (data.batteryPercentageRemaining !== undefined) {
            let battery = Math.round(data.batteryPercentageRemaining / 2);
            battery = Math.max(0, Math.min(100, battery)); // Clamp
            this.log(`[ZCL] 🔋 Battery: ${battery}%`);
            this._registerZclData?.(); // v5.5.108: Track for learning
            this.setCapabilityValue('measure_battery', battery).catch(() => { });
          }
        }
      }
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIALIZATION - v5.5.180 SIMPLIFIED
  // ═══════════════════════════════════════════════════════════════════════════

  async onNodeInit({ zclNode }) {
    this.log('');
    this.log('╔══════════════════════════════════════════════════════════════════════════════╗');
    this.log('║  CLIMATE SENSOR ULTIMATE - v5.5.189 MERGED (ALL PROTOCOLS + CALIBRATION)   ║');
    this.log('║  ZCL + Tuya DP + Battery + Time sync + Temp/Humidity offsets               ║');
    this.log('╚══════════════════════════════════════════════════════════════════════════════╝');
    this.log('');

    // Store zclNode for time sync
    this._zclNode = zclNode;

    // Call parent initialization (HybridSensorBase sets up ALL listeners)
    await super.onNodeInit({ zclNode });

    // ═══════════════════════════════════════════════════════════════════════
    // Read device info from basic cluster
    // ═══════════════════════════════════════════════════════════════════════
    let mfr = 'unknown';
    let modelId = 'unknown';

    try {
      const endpoint = zclNode?.endpoints?.[1];
      const basicCluster = endpoint?.clusters?.basic;
      if (basicCluster && typeof basicCluster.readAttributes === 'function') {
        const attrs = await basicCluster.readAttributes(['manufacturerName', 'modelId']).catch(() => ({}));
        mfr = attrs.manufacturerName || 'unknown';
        modelId = attrs.modelId || 'unknown';
      }
    } catch (e) {
      this.log('[CLIMATE] Basic cluster read failed:', e.message);
    }

    // Fallback to settings
    if (mfr === 'unknown') {
      const settings = this.getSettings() || {};
      mfr = settings.zb_manufacturerName || 'unknown';
      modelId = settings.zb_modelId || 'unknown';
    }

    this._manufacturerName = mfr;
    this._modelId = modelId;

    this.log(`[CLIMATE] Device: ${mfr} / ${modelId}`);

    // ═══════════════════════════════════════════════════════════════════════
    // Detect available clusters
    // ═══════════════════════════════════════════════════════════════════════
    const ep1 = zclNode?.endpoints?.[1];
    const clusters = ep1?.clusters || {};

    this._hasTuyaCluster = !!(
      clusters.tuya || clusters.tuyaSpecific ||
      clusters[0xEF00] || clusters['61184']
    );

    this.log(`[CLIMATE] Tuya cluster: ${this._hasTuyaCluster ? '✅' : '❌'}`);

    // ═══════════════════════════════════════════════════════════════════════
    // v5.5.183: TIME SYNC SETUP (inline, like v5.5.165)
    // Hourly time sync + on device wake
    // ═══════════════════════════════════════════════════════════════════════
    this.log('[CLIMATE] 🕐 Setting up time sync (v5.5.165 style)...');

    // v5.5.165: Hourly time sync interval
    this._hourlySyncInterval = this.homey.setInterval(async () => {
      this.log('[CLIMATE] 🕐 Hourly time sync...');
      await this._sendTimeSync().catch(e => this.log('[CLIMATE] Time sync failed:', e.message));
    }, 60 * 60 * 1000); // 1 hour

    // Setup listener for mcuSyncTime requests from device
    await this._setupTimeSyncListener(zclNode);

    // ═══════════════════════════════════════════════════════════════════════
    // v5.5.188: EXPLICIT ZCL CLUSTER SETUP (like v5.5.165)
    // Bind + configure reporting for temperature, humidity, battery
    // ═══════════════════════════════════════════════════════════════════════
    await this._setupExplicitZCLClusters(zclNode);

    // ═══════════════════════════════════════════════════════════════════════
    // Send Tuya Magic Packet to wake up device
    // ═══════════════════════════════════════════════════════════════════════
    if (this._hasTuyaCluster) {
      this.log('[CLIMATE] 🔮 Sending Tuya Magic Packet...');
      await this._sendTuyaMagicPacket(zclNode).catch(e => {
        this.log('[CLIMATE] Magic packet failed:', e.message);
      });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Schedule initial DP requests for sleepy device
    // ═══════════════════════════════════════════════════════════════════════
    this._scheduleInitialDPRequests();

    // ═══════════════════════════════════════════════════════════════════════
    // v5.5.188: Read ZCL attributes immediately (battery, temp, humidity)
    // ═══════════════════════════════════════════════════════════════════════
    await this._readZCLAttributesNow(zclNode);

    this.log('[CLIMATE] ✅ Climate sensor ready - ULTIMATE MERGED v5.5.189');
    this.log('[CLIMATE] ⚠️ BATTERY DEVICE - First data may take 10-60 minutes after pairing');
    this.log('');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TIME SYNC LISTENER - Respond to device time requests
  // ═══════════════════════════════════════════════════════════════════════════

  async _setupTimeSyncListener(zclNode) {
    try {
      const ep1 = zclNode?.endpoints?.[1];
      if (!ep1) return;

      const tuyaCluster = ep1.clusters?.tuya ||
        ep1.clusters?.manuSpecificTuya ||
        ep1.clusters?.[61184] ||
        ep1.clusters?.[0xEF00];

      if (!tuyaCluster) {
        this.log('[CLIMATE] ⚠️ Tuya cluster not found for time sync listener');
        return;
      }

      if (typeof tuyaCluster.on === 'function') {
        // Listen for mcuSyncTime requests (command 0x24)
        tuyaCluster.on('mcuSyncTime', async () => {
          this.log('[CLIMATE] 🕐 Device requested time sync (mcuSyncTime)');
          await this._respondToTimeRequest();
        });

        // Also listen for command events
        tuyaCluster.on('command', async (cmdName, payload) => {
          if (cmdName === 'mcuSyncTime' || cmdName === 'timeSyncRequest' || cmdName === '0x24') {
            this.log(`[CLIMATE] 🕐 Time sync request via command: ${cmdName}`);
            await this._respondToTimeRequest();
          }
        });

        this.log('[CLIMATE] ✅ Time sync listener active');
      }
    } catch (err) {
      this.log('[CLIMATE] ⚠️ Time sync listener setup failed:', err.message);
    }
  }

  /**
   * Respond to device time request using TuyaTimeSync module
   */
  async _respondToTimeRequest() {
    await this._sendTimeSync();
  }

  /**
   * v5.5.184: Send time sync to device using TUYA epoch (2000)
   * CRITICAL: LCD devices expect Tuya epoch (2000), NOT Unix epoch (1970)!
   * Reference: https://github.com/Koenkk/zigbee2mqtt/issues/30054
   */
  async _sendTimeSync() {
    try {
      const now = new Date();
      const timezoneOffset = -now.getTimezoneOffset() * 60;

      this.log('[CLIMATE] 🕐 Sending time sync (TUYA EPOCH 2000)...');
      this.log(`[CLIMATE] 🕐 Local: ${now.toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}`);
      this.log(`[CLIMATE] 🕐 TZ offset: GMT${timezoneOffset >= 0 ? '+' : ''}${timezoneOffset / 3600}`);

      // v5.5.184: CRITICAL - Force Tuya epoch for LCD display devices
      await syncDeviceTimeTuya(this, {
        logPrefix: '[CLIMATE]',
        useTuyaEpoch: true  // Force Tuya epoch (2000) for LCD devices
      });

      this.log('[CLIMATE] ✅ Time sync sent!');
    } catch (err) {
      this.log('[CLIMATE] ⚠️ Time sync failed:', err.message);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // v5.5.188: EXPLICIT ZCL CLUSTER SETUP (like v5.5.165)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * v5.5.188: Setup explicit ZCL clusters with bind + configure reporting
   * This is CRITICAL for battery, temperature, and humidity on ZCL devices
   */
  async _setupExplicitZCLClusters(zclNode) {
    const ep1 = zclNode?.endpoints?.[1];
    if (!ep1) {
      this.log('[ZCL-SETUP] ⚠️ No endpoint 1');
      return;
    }

    this.log('[ZCL-SETUP] 🔧 Setting up explicit ZCL clusters...');

    // ─────────────────────────────────────────────────────────────────────
    // POWER CONFIGURATION (Battery) - Cluster 0x0001
    // ─────────────────────────────────────────────────────────────────────
    const powerCfg = ep1.clusters?.powerConfiguration;
    if (powerCfg) {
      this.log('[ZCL-SETUP] 🔋 PowerConfiguration cluster found');
      try {
        // Step 1: Bind cluster to coordinator
        if (typeof powerCfg.bind === 'function') {
          await powerCfg.bind().catch(() => { });
          this.log('[ZCL-SETUP] ✅ PowerConfiguration bound');
        }

        // Step 2: Configure reporting for battery
        if (typeof powerCfg.configureReporting === 'function') {
          await powerCfg.configureReporting({
            batteryPercentageRemaining: {
              minInterval: 3600,    // 1 hour min
              maxInterval: 21600,   // 6 hours max
              minChange: 2          // Report on 1% change
            }
          }).catch(() => { });
          this.log('[ZCL-SETUP] ✅ Battery reporting configured');
        }

        // Step 3: Setup attribute listener
        if (typeof powerCfg.on === 'function') {
          powerCfg.on('attr.batteryPercentageRemaining', (value) => {
            const battery = Math.round(value / 2);
            this.log(`[ZCL] 🔋 Battery: ${battery}%`);
            this.setCapabilityValue('measure_battery', Math.max(0, Math.min(100, battery))).catch(() => { });
          });
          this.log('[ZCL-SETUP] ✅ Battery listener active');
        }
      } catch (e) {
        this.log('[ZCL-SETUP] PowerConfiguration setup error:', e.message);
      }
    } else {
      this.log('[ZCL-SETUP] ⚠️ No PowerConfiguration cluster');
    }

    // ─────────────────────────────────────────────────────────────────────
    // TEMPERATURE MEASUREMENT - Cluster 0x0402
    // ─────────────────────────────────────────────────────────────────────
    const tempCluster = ep1.clusters?.temperatureMeasurement || ep1.clusters?.msTemperatureMeasurement;
    if (tempCluster) {
      this.log('[ZCL-SETUP] 🌡️ TemperatureMeasurement cluster found');
      try {
        if (typeof tempCluster.bind === 'function') {
          await tempCluster.bind().catch(() => { });
          this.log('[ZCL-SETUP] ✅ Temperature bound');
        }

        if (typeof tempCluster.configureReporting === 'function') {
          await tempCluster.configureReporting({
            measuredValue: {
              minInterval: 60,      // 1 min
              maxInterval: 3600,    // 1 hour
              minChange: 10         // 0.1°C
            }
          }).catch(() => { });
          this.log('[ZCL-SETUP] ✅ Temperature reporting configured');
        }

        if (typeof tempCluster.on === 'function') {
          tempCluster.on('attr.measuredValue', (value) => {
            const temp = value / 100;
            if (temp >= -40 && temp <= 80) {
              this.log(`[ZCL] 🌡️ Temperature: ${temp}°C`);
              this.setCapabilityValue('measure_temperature', temp).catch(() => { });
            }
          });
          this.log('[ZCL-SETUP] ✅ Temperature listener active');
        }
      } catch (e) {
        this.log('[ZCL-SETUP] Temperature setup error:', e.message);
      }
    } else {
      this.log('[ZCL-SETUP] ⚠️ No TemperatureMeasurement cluster');
    }

    // ─────────────────────────────────────────────────────────────────────
    // RELATIVE HUMIDITY - Cluster 0x0405
    // ─────────────────────────────────────────────────────────────────────
    const humCluster = ep1.clusters?.relativeHumidity || ep1.clusters?.msRelativeHumidity;
    if (humCluster) {
      this.log('[ZCL-SETUP] 💧 RelativeHumidity cluster found');
      try {
        if (typeof humCluster.bind === 'function') {
          await humCluster.bind().catch(() => { });
          this.log('[ZCL-SETUP] ✅ Humidity bound');
        }

        if (typeof humCluster.configureReporting === 'function') {
          await humCluster.configureReporting({
            measuredValue: {
              minInterval: 60,
              maxInterval: 3600,
              minChange: 100        // 1%
            }
          }).catch(() => { });
          this.log('[ZCL-SETUP] ✅ Humidity reporting configured');
        }

        if (typeof humCluster.on === 'function') {
          humCluster.on('attr.measuredValue', (value) => {
            const hum = value / 100;
            if (hum >= 0 && hum <= 100) {
              this.log(`[ZCL] 💧 Humidity: ${hum}%`);
              this.setCapabilityValue('measure_humidity', hum).catch(() => { });
            }
          });
          this.log('[ZCL-SETUP] ✅ Humidity listener active');
        }
      } catch (e) {
        this.log('[ZCL-SETUP] Humidity setup error:', e.message);
      }
    } else {
      this.log('[ZCL-SETUP] ⚠️ No RelativeHumidity cluster');
    }

    this.log('[ZCL-SETUP] ✅ Explicit ZCL setup complete');
  }

  /**
   * v5.5.188: Read ZCL attributes immediately after init
   * Try to get initial values for temp, humidity, battery
   */
  async _readZCLAttributesNow(zclNode) {
    const ep1 = zclNode?.endpoints?.[1];
    if (!ep1) return;

    this.log('[ZCL-READ] 📖 Reading ZCL attributes...');

    // Read battery
    const powerCfg = ep1.clusters?.powerConfiguration;
    if (powerCfg && typeof powerCfg.readAttributes === 'function') {
      try {
        const attrs = await powerCfg.readAttributes(['batteryPercentageRemaining', 'batteryVoltage']).catch(() => ({}));
        if (attrs.batteryPercentageRemaining !== undefined) {
          const battery = Math.round(attrs.batteryPercentageRemaining / 2);
          this.log(`[ZCL-READ] 🔋 Battery: ${battery}%`);
          await this.setCapabilityValue('measure_battery', Math.max(0, Math.min(100, battery))).catch(() => { });
        }
      } catch (e) {
        this.log('[ZCL-READ] Battery read failed:', e.message);
      }
    }

    // Read temperature
    const tempCluster = ep1.clusters?.temperatureMeasurement || ep1.clusters?.msTemperatureMeasurement;
    if (tempCluster && typeof tempCluster.readAttributes === 'function') {
      try {
        const attrs = await tempCluster.readAttributes(['measuredValue']).catch(() => ({}));
        if (attrs.measuredValue !== undefined) {
          const temp = attrs.measuredValue / 100;
          if (temp >= -40 && temp <= 80) {
            this.log(`[ZCL-READ] 🌡️ Temperature: ${temp}°C`);
            await this.setCapabilityValue('measure_temperature', temp).catch(() => { });
          }
        }
      } catch (e) {
        this.log('[ZCL-READ] Temperature read failed:', e.message);
      }
    }

    // Read humidity
    const humCluster = ep1.clusters?.relativeHumidity || ep1.clusters?.msRelativeHumidity;
    if (humCluster && typeof humCluster.readAttributes === 'function') {
      try {
        const attrs = await humCluster.readAttributes(['measuredValue']).catch(() => ({}));
        if (attrs.measuredValue !== undefined) {
          const hum = attrs.measuredValue / 100;
          if (hum >= 0 && hum <= 100) {
            this.log(`[ZCL-READ] 💧 Humidity: ${hum}%`);
            await this.setCapabilityValue('measure_humidity', hum).catch(() => { });
          }
        }
      } catch (e) {
        this.log('[ZCL-READ] Humidity read failed:', e.message);
      }
    }

    this.log('[ZCL-READ] ✅ ZCL attribute read complete');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DP REQUEST SCHEDULING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * v5.5.180: Schedule initial DP requests for sleepy devices
   */
  _scheduleInitialDPRequests() {
    const intervals = [10000, 30000, 120000, 300000, 600000]; // 10s, 30s, 2m, 5m, 10m
    const dpIds = [1, 2, 4, 18]; // temp, humidity, battery, alt temp

    this._aggressiveTimers = [];

    intervals.forEach((delay, index) => {
      const timer = this.homey.setTimeout(async () => {
        this.log(`[CLIMATE] ⏰ DP request attempt ${index + 1}/${intervals.length}`);

        const zclNode = this._zclNode;
        if (!zclNode) return;

        if (this._hasTuyaCluster) {
          await this._sendTuyaMagicPacket(zclNode).catch(() => { });

          if (this.safeTuyaDataQuery) {
            await this.safeTuyaDataQuery(dpIds, {
              logPrefix: '[CLIMATE-WAKE]',
              delayBetweenQueries: 100
            }).catch(() => { });
          }
        }

        // Trigger time sync on wake
        await this._sendTimeSync().catch(() => { });
      }, delay);

      this._aggressiveTimers.push(timer);
    });

    this.log('[CLIMATE] 📅 Scheduled DP requests at: 10s, 30s, 2m, 5m, 10m');
  }

  /**
   * v5.5.89: Send Tuya Magic Packet to configure TZE284 devices
   * Source: https://github.com/Koenkk/zigbee2mqtt/issues/26078
   *
   * Z2M does: tuya.configureMagicPacket + dataQuery
   * This tells the device to start reporting data!
   */
  async _sendTuyaMagicPacket(zclNode) {
    const endpoint = zclNode?.endpoints?.[1];
    if (!endpoint) {
      this.log('[MAGIC-PACKET] ⚠️ No endpoint 1');
      return;
    }

    // v5.5.89: Try multiple cluster name variations
    const tuyaCluster = endpoint.clusters?.['tuya'] ||
      endpoint.clusters?.[61184] ||
      endpoint.clusters?.['manuSpecificTuya'] ||
      endpoint.clusters?.[0xEF00];

    this.log('[MAGIC-PACKET] 🔍 Available clusters:', Object.keys(endpoint.clusters || {}));

    if (!tuyaCluster) {
      this.log('[MAGIC-PACKET] ⚠️ No Tuya cluster (0xEF00) found - trying raw');
      await this._sendMagicPacketRaw(zclNode);
      return;
    }

    try {
      // v5.5.89: Use the new sendMagicPacket method if available
      if (typeof tuyaCluster.sendMagicPacket === 'function') {
        this.log('[MAGIC-PACKET] 📤 Using cluster sendMagicPacket()...');
        await tuyaCluster.sendMagicPacket();
        this.log('[MAGIC-PACKET] ✅ Magic packet sent via cluster method');
      } else {
        // Fallback: Send commands individually
        this.log('[MAGIC-PACKET] 📤 Sending MCU Version Request (0x10)...');
        if (typeof tuyaCluster.mcuVersionRequest === 'function') {
          await tuyaCluster.mcuVersionRequest({});
          this.log('[MAGIC-PACKET] ✅ MCU Version Request sent');
        } else {
          this.log('[MAGIC-PACKET] ⚠️ mcuVersionRequest not available');
        }

        await new Promise(r => setTimeout(r, 200));

        this.log('[MAGIC-PACKET] 📤 Sending Data Query (0x03)...');
        if (typeof tuyaCluster.dataQuery === 'function') {
          await tuyaCluster.dataQuery({});
          this.log('[MAGIC-PACKET] ✅ Data Query sent');
        } else {
          this.log('[MAGIC-PACKET] ⚠️ dataQuery not available');
        }
      }

      // Step 3: Also send time sync immediately
      this.log('[MAGIC-PACKET] 🕐 Sending time sync...');
      await syncDeviceTimeTuya(this, { logPrefix: '[MAGIC-PACKET]' }).catch(() => { });

      this.log('[MAGIC-PACKET] ✅ Magic packet sequence complete!');
    } catch (err) {
      this.log('[MAGIC-PACKET] ⚠️ Error:', err.message);
      // Try raw fallback
      await this._sendMagicPacketRaw(zclNode).catch(() => { });
    }
  }

  /**
   * v5.5.89: Send magic packet via raw ZCL frame
   * This is a fallback when cluster methods aren't available
   */
  async _sendMagicPacketRaw(zclNode) {
    try {
      this.log('[MAGIC-PACKET-RAW] 📤 Sending via raw ZCL command...');

      const endpoint = zclNode?.endpoints?.[1];
      if (!endpoint) {
        this.log('[MAGIC-PACKET-RAW] ⚠️ No endpoint 1');
        return;
      }

      // Try to get the raw cluster and send commands
      const cluster = endpoint.clusters?.tuya || endpoint.clusters?.[61184];

      if (cluster) {
        // Send MCU Version Request (Command 0x10)
        try {
          await cluster.command('mcuVersionRequest', {});
          this.log('[MAGIC-PACKET-RAW] ✅ MCU Version Request sent');
        } catch (e) {
          this.log('[MAGIC-PACKET-RAW] MCU Version via command failed:', e.message);
        }

        await new Promise(r => setTimeout(r, 200));

        // Send Data Query (Command 0x03)
        try {
          await cluster.command('dataQuery', {});
          this.log('[MAGIC-PACKET-RAW] ✅ Data Query sent');
        } catch (e) {
          this.log('[MAGIC-PACKET-RAW] Data Query via command failed:', e.message);
        }
      } else {
        this.log('[MAGIC-PACKET-RAW] ⚠️ No Tuya cluster available');
      }
    } catch (err) {
      this.log('[MAGIC-PACKET-RAW] ⚠️ Error:', err.message);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // REFRESH AND CLEANUP
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * v5.5.180: Refresh all DPs + time sync
   */
  async refreshAll() {
    this.log('[CLIMATE-REFRESH] Refreshing all DPs + time sync...');

    const allDPs = [1, 2, 4, 18]; // temp, humidity, battery, alt temp

    if (this.safeTuyaDataQuery) {
      await this.safeTuyaDataQuery(allDPs, {
        logPrefix: '[CLIMATE-REFRESH]',
        delayBetweenQueries: 150,
      });
    }

    // Trigger time sync
    await this._sendTimeSync().catch(() => { });

    return true;
  }

  /**
   * v5.5.189: Override _handleDP to trigger time sync on data reception
   * Merged from climate_box_vvmbj46n - LCD devices need time sync when they wake
   */
  async _handleDP(dp, value, dataType) {
    // Device is awake! Trigger time sync for LCD displays
    if (this._manufacturerName?.includes('_TZE284')) {
      this._sendTimeSync().catch(() => { });
    }

    // Apply calibration offsets before passing to parent
    let processedValue = value;

    if (dp === 1 || dp === 6 || dp === 18) {
      // Temperature DPs - apply offset after division
      const rawTemp = value / 10;
      processedValue = this._applyTempOffset(rawTemp) * 10; // Scale back for parent processing
    } else if (dp === 2 || dp === 7 || dp === 103) {
      // Humidity DPs - apply offset
      processedValue = this._applyHumOffset(value);
    }

    // Call parent handler
    if (super._handleDP) {
      return super._handleDP(dp, processedValue, dataType);
    }
  }

  /**
   * v5.5.189: Enhanced logging for DP data with calibration support
   * Shows raw + converted values for each DP
   *
   * CRITICAL DP MAPPING for _TZE284_vvmbj46n (TH05Z):
   * - DP1: temperature ÷10
   * - DP2: humidity %
   * - DP4: battery × 2 (device reports half)
   */
  onTuyaStatus(status) {
    if (!status) {
      super.onTuyaStatus(status);
      return;
    }

    const dp = status.dp;
    const rawValue = status.data || status.value;

    // v5.5.189: Log with calibration info
    switch (dp) {
      case 1: // Temperature (standard) ÷10
        const temp1 = this._applyTempOffset(rawValue / 10);
        this.log(`[CLIMATE-DP] DP1 temperature raw=${rawValue} calibrated=${temp1}°C`);
        break;
      case 18: // Temperature (alt) ÷10
      case 6: // Temperature (some _TZE204 models)
        const tempAlt = this._applyTempOffset(rawValue / 10);
        this.log(`[CLIMATE-DP] DP${dp} temperature_alt raw=${rawValue} calibrated=${tempAlt}°C`);
        break;
      case 2: // Humidity (standard)
        const hum2 = this._applyHumOffset(rawValue);
        this.log(`[CLIMATE-DP] DP2 humidity raw=${rawValue} calibrated=${hum2}%`);
        break;
      case 7: // Humidity (some _TZE204 models)
      case 103: // Humidity (alt)
        const humAlt = this._applyHumOffset(rawValue);
        this.log(`[CLIMATE-DP] DP${dp} humidity_alt raw=${rawValue} calibrated=${humAlt}%`);
        break;
      case 4: // Battery (standard with ×2 multiplier)
        const batConverted = Math.min(rawValue * 2, 100);
        this.log(`[CLIMATE-DP] DP4 battery raw=${rawValue} converted=${batConverted}% (×2 multiplier)`);
        break;
      case 9: // Temperature unit setting
        this.log(`[CLIMATE-DP] DP9 temp_unit raw=${rawValue} (0=C, 1=F)`);
        break;
      case 101:
      case 102: // Button press
        this.log(`[CLIMATE-DP] DP${dp} button_press raw=${rawValue}`);
        break;
      default:
        if (dp !== undefined) {
          this.log(`[CLIMATE-DP] DP${dp} UNKNOWN raw=${rawValue}`);
        }
    }

    // Call parent handler to set capabilities
    super.onTuyaStatus(status);

    // Log final capability values after processing
    this.homey.setTimeout(() => {
      const temp = this.getCapabilityValue('measure_temperature');
      const hum = this.getCapabilityValue('measure_humidity');
      const bat = this.getCapabilityValue('measure_battery');
      if (temp !== null || hum !== null || bat !== null) {
        this.log(`[CLIMATE] ✅ CAPABILITIES: temp=${temp}°C humidity=${hum}% battery=${bat}%`);
      }
    }, 100);
  }

  /**
   * v5.5.183: Cleanup on uninit
   */
  async onUninit() {
    this.log('[CLIMATE] onUninit - cleaning up...');

    // Clear hourly time sync interval
    if (this._hourlySyncInterval) {
      this.homey.clearInterval(this._hourlySyncInterval);
      this._hourlySyncInterval = null;
    }

    // Clear DP request timers
    if (this._aggressiveTimers) {
      this._aggressiveTimers.forEach(t => this.homey.clearTimeout(t));
      this._aggressiveTimers = null;
    }

    if (super.onUninit) {
      await super.onUninit();
    }

    this.log('[CLIMATE] ✅ Cleanup complete');
  }

  async onDeleted() {
    this.log('[CLIMATE] Device deleted');
    await this.onUninit();
    if (super.onDeleted) {
      await super.onDeleted().catch(() => { });
    }
  }
}

module.exports = ClimateSensorDevice;
