'use strict';

const { HybridSensorBase } = require('../../lib/devices');
const { TuyaGatewayEmulator, WakeStrategies } = require('../../lib/tuya/TuyaGatewayEmulator');
const { UniversalTimeSync, setupTimeSync } = require('../../lib/tuya/UniversalTimeSync');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║     CLIMATE SENSOR - v5.5.124 UNIVERSAL TIME SYNC FIX                       ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                              ║
 * ║  🔥 v5.5.124 FIX: LISTEN FOR TIME REQUESTS FROM DEVICE                      ║
 * ║  The Time cluster (0x000A) is an OUTPUT cluster = device ASKS for time      ║
 * ║  We must LISTEN for time requests and RESPOND with current time             ║
 * ║                                                                              ║
 * ║  SUPPORTED PROTOCOLS:                                                        ║
 * ║  ┌─────────────┬──────────────────────────────────────────────────────┐      ║
 * ║  │ Type        │ Protocol                                             │      ║
 * ║  ├─────────────┼──────────────────────────────────────────────────────┤      ║
 * ║  │ _TZE200_*   │ Tuya DP + cmd 0x24 (timeRequest → timeResponse)      │      ║
 * ║  │ _TZE284_*   │ Tuya DP + cmd 0x24 + LCD clock                       │      ║
 * ║  │ _TZ3000_*   │ ZCL standard (0x0402, 0x0405, 0x0001)                │      ║
 * ║  │ TS0201      │ ZCL standard (temperature, humidity, battery)        │      ║
 * ║  └─────────────┴──────────────────────────────────────────────────────┘      ║
 * ║                                                                              ║
 * ║  TIME SYNC STRATEGY:                                                         ║
 * ║  1. Setup listener for device time requests (0x24)                           ║
 * ║  2. Respond IMMEDIATELY when device asks for time                            ║
 * ║  3. Also push time proactively every hour                                    ║
 * ║                                                                              ║
 * ║  DYNAMIC DISCOVERY:                                                          ║
 * ║  - Unknown DPs logged and tracked                                            ║
 * ║  - Capabilities auto-added when data received                                ║
 * ║                                                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

// Learning period duration (15 minutes)
const LEARNING_PERIOD_MS = 15 * 60 * 1000;
class ClimateSensorDevice extends HybridSensorBase {

  /** Battery powered */
  get mainsPowered() { return false; }

  // v5.5.35: Skip ZCL battery polling - use Tuya DP 4 only
  get usesTuyaDPBattery() { return true; }
  get skipZclBatteryPolling() { return true; }

  // v5.5.54: FORCE ACTIVE MODE - Do NOT block DP requests in passive mode
  // Climate sensors need active queries even if cluster 0xEF00 not visible
  get forceActiveTuyaMode() { return true; }

  // v5.5.54: Enable TRUE HYBRID mode - listen to BOTH ZCL AND Tuya DP
  get hybridModeEnabled() { return true; }

  /** Capabilities for climate sensors */
  get sensorCapabilities() {
    return ['measure_temperature', 'measure_humidity', 'measure_battery'];
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
            const temp = data.measuredValue / 100;
            // v5.5.108: Sanity check
            if (temp < -40 || temp > 80) {
              this.log(`[ZCL] ⚠️ Temperature out of range: ${temp}°C - IGNORED`);
              return;
            }
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
            const humidity = data.measuredValue / 100;
            // v5.5.108: Sanity check
            if (humidity < 0 || humidity > 100) {
              this.log(`[ZCL] ⚠️ Humidity out of range: ${humidity}% - IGNORED`);
              return;
            }
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

  /**
   * v5.5.108: Register ZCL data received for learning period
   */
  _registerZclData() {
    if (this._protocolStats) {
      this._protocolStats.zcl.dataReceived++;
      this._protocolStats.zcl.lastTime = Date.now();
    }
  }

  /**
   * v5.5.108: Register Tuya data received for learning period
   * Called from HybridSensorBase when DP data arrives
   */
  _registerTuyaData() {
    if (this._protocolStats) {
      this._protocolStats.tuya.dataReceived++;
      this._protocolStats.tuya.lastTime = Date.now();
    }
  }

  /**
   * v5.5.108: Override onTuyaStatus to track Tuya data for learning
   */
  onTuyaStatus(status) {
    // Track Tuya data reception
    this._registerTuyaData();
    // Call parent implementation
    return super.onTuyaStatus(status);
  }

  async onNodeInit({ zclNode }) {
    // Call base class - handles everything!
    await super.onNodeInit({ zclNode });

    // v5.5.92: CRITICAL - Store zclNode for later use in timers!
    this._zclNode = zclNode;

    // ═══════════════════════════════════════════════════════════════════════
    // v5.5.93: CRITICAL FIX - Read basic cluster FIRST to get manufacturerName
    // Source: Zigbee2MQTT tuya.ts configureMagicPacket implementation
    // Settings may be empty at init, so we read from device directly!
    // ═══════════════════════════════════════════════════════════════════════
    let mfr = 'unknown';
    let modelId = 'unknown';

    try {
      const endpoint = zclNode?.endpoints?.[1];
      const basicCluster = endpoint?.clusters?.basic;
      if (basicCluster && typeof basicCluster.readAttributes === 'function') {
        this.log('[CLIMATE] 📖 Reading basic cluster to get device info...');
        const attrs = await basicCluster.readAttributes(['manufacturerName', 'modelId', 'powerSource']).catch(() => ({}));
        mfr = attrs.manufacturerName || 'unknown';
        modelId = attrs.modelId || 'unknown';
        this.log(`[CLIMATE] 📖 Device info: mfr="${mfr}" model="${modelId}"`);
      }
    } catch (e) {
      this.log('[CLIMATE] Basic cluster read failed:', e.message);
    }

    // Fallback to settings if basic read failed
    if (mfr === 'unknown') {
      const settings = this.getSettings() || {};
      mfr = settings.zb_manufacturerName || 'unknown';
      modelId = settings.zb_modelId || 'unknown';
    }

    this.log('[CLIMATE] ════════════════════════════════════════════════════');
    this.log(`[CLIMATE] ✅ Climate sensor ready`);
    this.log(`[CLIMATE] Model: ${modelId}`);
    this.log(`[CLIMATE] Manufacturer: ${mfr}`);
    this.log('[CLIMATE] ════════════════════════════════════════════════════');

    // v5.5.91: Store manufacturer for later use (settings may not be available in timers)
    this._manufacturerName = mfr;
    this._modelId = modelId;

    // ═══════════════════════════════════════════════════════════════════════
    // v5.5.93: CRITICAL - ALWAYS send Tuya Magic Packet for ALL climate sensors!
    // Source: https://github.com/Koenkk/zigbee2mqtt/issues/26078
    // ALL climate sensors are TS0601/Tuya - they ALL need this!
    // Don't wait for TZE284 detection - just send it!
    // ═══════════════════════════════════════════════════════════════════════
    this.log('[CLIMATE] 🔮 Sending Tuya Magic Packet (Z2M configureMagicPacket + dataQuery)...');
    await this._sendTuyaMagicPacket(zclNode).catch(e => {
      this.log('[CLIMATE] Magic packet failed:', e.message);
    });

    // ═══════════════════════════════════════════════════════════════════════
    // v5.5.108: INTELLIGENT HYBRID PROTOCOL DETECTION
    // Detect available clusters and capabilities
    // ═══════════════════════════════════════════════════════════════════════
    const ep1 = zclNode?.endpoints?.[1];
    const clusters = ep1?.clusters || {};
    const clusterNames = Object.keys(clusters);

    this.log(`[CLIMATE] 📡 Available clusters: ${clusterNames.join(', ')}`);

    // Check for Tuya cluster (0xEF00)
    this._hasTuyaCluster = !!(
      clusters.tuya || clusters.tuyaSpecific ||
      clusters[0xEF00] || clusters['61184'] || clusters['0xEF00']
    );

    // Check for ZCL Time cluster (0x000A)
    this._hasZclTimeCluster = !!(
      clusters.time || clusters.genTime ||
      clusters[0x000A] || clusters['10'] || clusters['0x000A']
    );

    // Check for ZCL temperature/humidity clusters
    this._hasZclTempCluster = !!(clusters.temperatureMeasurement || clusters.msTemperatureMeasurement);
    this._hasZclHumCluster = !!(clusters.relativeHumidity || clusters.msRelativeHumidity);

    // Device type detection
    const isLCDDevice = mfr && (
      mfr.includes('_TZE284_') || mfr.includes('_TZE200_vvmbj46n') ||
      modelId.includes('TH05') || modelId.includes('TS0601')
    );

    this.log('[CLIMATE] ════════════════════════════════════════════════════');
    this.log(`[CLIMATE] 🔍 Protocol Detection:`);
    this.log(`[CLIMATE]    Tuya cluster (0xEF00): ${this._hasTuyaCluster ? '✅' : '❌'}`);
    this.log(`[CLIMATE]    ZCL Time (0x000A): ${this._hasZclTimeCluster ? '✅' : '❌'}`);
    this.log(`[CLIMATE]    ZCL Temp (0x0402): ${this._hasZclTempCluster ? '✅' : '❌'}`);
    this.log(`[CLIMATE]    ZCL Humidity (0x0405): ${this._hasZclHumCluster ? '✅' : '❌'}`);
    this.log(`[CLIMATE]    LCD Device: ${isLCDDevice ? '✅' : '❌'}`);
    this.log('[CLIMATE] ════════════════════════════════════════════════════');

    // ═══════════════════════════════════════════════════════════════════════
    // v5.5.108: INITIALIZE PROTOCOL STATS FOR LEARNING
    // Track which protocol actually delivers data during learning period
    // ═══════════════════════════════════════════════════════════════════════
    this._protocolStats = {
      tuya: { dataReceived: 0, lastTime: 0 },
      zcl: { dataReceived: 0, lastTime: 0 },
      learningStarted: Date.now(),
      learningComplete: false,
      preferredProtocol: null
    };

    // ═══════════════════════════════════════════════════════════════════════
    // ═══════════════════════════════════════════════════════════════════════
    // v5.5.124: CRITICAL FIX - Setup TIME REQUEST LISTENER
    // The device ASKS for time via cmd 0x24 - we must RESPOND!
    // ═══════════════════════════════════════════════════════════════════════
    await this._setupTimeRequestListener(zclNode);

    // v5.5.108: SETUP HYBRID TIME SYNC (PHASE 1 - IMMEDIATE)
    // Try both Tuya and ZCL methods at init
    // ═══════════════════════════════════════════════════════════════════════
    this.log('[CLIMATE] 🕐 PHASE 1: Immediate time sync...');
    await this._hybridTimeSync(zclNode);

    // ═══════════════════════════════════════════════════════════════════════
    // v5.5.108: SCHEDULE LEARNING PERIOD END (15 min)
    // After 15 min, analyze which protocol works best and optimize
    // ═══════════════════════════════════════════════════════════════════════
    this._learningTimer = this.homey.setTimeout(async () => {
      await this._completeLearningPeriod(zclNode);
    }, LEARNING_PERIOD_MS);
    this.log(`[CLIMATE] 📚 Learning period started (15 min) - will optimize at ${new Date(Date.now() + LEARNING_PERIOD_MS).toLocaleTimeString()}`);

    // ═══════════════════════════════════════════════════════════════════════
    // v5.5.108: SETUP HOURLY TIME SYNC (PHASE 3)
    // Continuous sync every hour
    // ═══════════════════════════════════════════════════════════════════════
    this._hourlySyncInterval = this.homey.setInterval(async () => {
      this.log('[CLIMATE] 🕐 PHASE 3: Hourly time sync...');
      await this._hybridTimeSync(zclNode);
    }, 60 * 60 * 1000); // 1 hour

    // v5.5.29: Setup advanced wake strategies
    await this._setupWakeStrategies();

    // v5.5.35: Schedule initial data requests
    this._scheduleAggressiveDPRequest();

    this.log('[CLIMATE] 👀 Watching for temperature/humidity data (hybrid mode)...');
    this.log('[CLIMATE] ⚠️ BATTERY DEVICE - First data may take 10-60 minutes after pairing');
  }

  /**
   * v5.5.124: CRITICAL - Listen for TIME REQUESTS from device
   * The Time cluster (0x000A) is an OUTPUT cluster on the device
   * This means the device ASKS for time, we don't push it
   *
   * Tuya devices use cmd 0x24 (timeRequest) on cluster 0xEF00
   */
  async _setupTimeRequestListener(zclNode) {
    const ep1 = zclNode?.endpoints?.[1];
    if (!ep1) return;

    this.log('[CLIMATE] 🕐 Setting up TIME REQUEST listener...');

    // Find Tuya cluster
    const tuyaCluster = ep1.clusters?.tuya ||
      ep1.clusters?.manuSpecificTuya ||
      ep1.clusters?.[61184] ||
      ep1.clusters?.['0xEF00'];

    if (tuyaCluster && typeof tuyaCluster.on === 'function') {
      // Listen for ALL commands and filter for time requests
      tuyaCluster.on('command', async (cmd, payload) => {
        this.log(`[CLIMATE] 📥 Tuya command received: 0x${cmd.toString(16)} (${cmd})`);

        // Time request commands: 0x24 (36), 0x28 (40)
        if (cmd === 0x24 || cmd === 36 || cmd === 0x28 || cmd === 40) {
          this.log('[CLIMATE] ⏰ DEVICE ASKED FOR TIME! Responding immediately...');
          await this._respondToTimeRequest(ep1);
        }
      });

      // Also listen for specific time request method if available
      if (typeof tuyaCluster.onTimeRequest === 'undefined') {
        tuyaCluster.onTimeRequest = async () => {
          this.log('[CLIMATE] ⏰ onTimeRequest triggered! Responding...');
          await this._respondToTimeRequest(ep1);
        };
      }

      // Listen for 'response' events too
      tuyaCluster.on('response', async (status, transId, cmd) => {
        if (cmd === 0x24 || cmd === 0x28) {
          this.log('[CLIMATE] ⏰ Time request via response event! Responding...');
          await this._respondToTimeRequest(ep1);
        }
      });

      this.log('[CLIMATE] ✅ Time request listener configured');
    } else {
      this.log('[CLIMATE] ⚠️ Tuya cluster not found or .on() not available');
    }
  }

  /**
   * v5.5.124: Respond to device time request
   * Sends current time in Tuya format
   */
  async _respondToTimeRequest(endpoint) {
    try {
      const now = new Date();
      const utcSeconds = Math.floor(now.getTime() / 1000);
      const timezoneOffset = -now.getTimezoneOffset() * 60;
      const localSeconds = utcSeconds + timezoneOffset;

      this.log('[CLIMATE] 🕐 ════════════════════════════════════════════');
      this.log(`[CLIMATE] 🕐 Responding to time request`);
      this.log(`[CLIMATE] 🕐 Local: ${now.toLocaleString()}`);
      this.log(`[CLIMATE] 🕐 UTC: ${utcSeconds}s`);
      this.log(`[CLIMATE] 🕐 Local: ${localSeconds}s`);
      this.log(`[CLIMATE] 🕐 TZ: GMT${timezoneOffset >= 0 ? '+' : ''}${timezoneOffset / 3600}`);

      // Try all methods to send time response
      await this._sendTuyaTimeSync(endpoint);

      this.log('[CLIMATE] ✅ Time response sent!');
      this.log('[CLIMATE] 🕐 ════════════════════════════════════════════');
    } catch (e) {
      this.log('[CLIMATE] ⚠️ Time response failed:', e.message);
    }
  }

  /**
   * v5.5.108: HYBRID TIME SYNC - Try both Tuya DP and ZCL Time cluster
   * Sends time via all available methods for maximum compatibility
   */
  async _hybridTimeSync(zclNode) {
    const now = new Date();
    const results = { tuya: false, zclTime: false };

    // Calculate time values
    const unixTimestamp = Math.floor(now.getTime() / 1000);
    const zigbeeEpoch = new Date(Date.UTC(2000, 0, 1, 0, 0, 0));
    const secondsSince2000 = Math.floor((now.getTime() - zigbeeEpoch.getTime()) / 1000);
    const timezoneOffsetSeconds = -now.getTimezoneOffset() * 60;
    const localTime = secondsSince2000 + timezoneOffsetSeconds;

    this.log('[CLIMATE] 🕒 Sending time via all available methods...');
    this.log(`[CLIMATE]    Local: ${now.toLocaleString()}`);
    this.log(`[CLIMATE]    Unix: ${unixTimestamp}`);
    this.log(`[CLIMATE]    Zigbee: ${secondsSince2000}s since 2000`);

    // ═══════════════════════════════════════════════════════════════════════
    // METHOD 1: Tuya DP Time Sync (for _TZE284_vvmbj46n and similar)
    // Uses the robust _sendTuyaTimeSync method
    // ═══════════════════════════════════════════════════════════════════════
    if (this._hasTuyaCluster || this._manufacturerName?.includes('_TZE')) {
      try {
        const ep1 = zclNode?.endpoints?.[1];
        if (ep1) {
          // v5.5.109: Use the existing robust _sendTuyaTimeSync method
          await this._sendTuyaTimeSync(ep1);
          results.tuya = true;
        }
      } catch (e) {
        this.log('[CLIMATE] ⚠️ Tuya time sync via _sendTuyaTimeSync failed:', e.message);

        // Fallback to other methods
        try {
          if (this._universalTimeSync) {
            await this._universalTimeSync.syncNow();
            results.tuya = true;
            this.log('[CLIMATE] ✅ Tuya time sync via UniversalTimeSync');
          } else if (this.tuyaEF00Manager?.sendTimeSync) {
            await this.tuyaEF00Manager.sendTimeSync();
            results.tuya = true;
            this.log('[CLIMATE] ✅ Tuya time sync via tuyaEF00Manager');
          } else if (this._gatewayEmulator) {
            await this._gatewayEmulator.pushTime();
            results.tuya = true;
            this.log('[CLIMATE] ✅ Tuya time sync via GatewayEmulator');
          }
        } catch (e2) {
          this.log('[CLIMATE] ⚠️ All Tuya time sync methods failed');
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // METHOD 2: ZCL Time Cluster (0x000A) - Standard Zigbee
    // ═══════════════════════════════════════════════════════════════════════
    if (this._hasZclTimeCluster) {
      try {
        const ep1 = zclNode?.endpoints?.[1];
        const timeCluster = ep1?.clusters?.time || ep1?.clusters?.genTime;

        if (timeCluster?.writeAttributes) {
          await timeCluster.writeAttributes({
            time: secondsSince2000,
            localTime: localTime,
            timeZone: timezoneOffsetSeconds,
            timeStatus: 0x02 // Synchronized
          });
          results.zclTime = true;
          this.log('[CLIMATE] ✅ ZCL Time cluster sync successful');
        }
      } catch (e) {
        this.log('[CLIMATE] ⚠️ ZCL Time sync failed:', e.message);
      }
    }

    // Log results
    const successCount = Object.values(results).filter(v => v).length;
    if (successCount > 0) {
      this.log(`[CLIMATE] 🕐 Time sync complete (${successCount} method(s) succeeded)`);
    } else {
      this.log('[CLIMATE] ⚠️ No time sync method succeeded - device may not support time sync');
    }

    return results;
  }

  /**
   * v5.5.108: Complete learning period and optimize protocol
   * Analyzes which protocol delivered the most data and optimizes settings
   */
  async _completeLearningPeriod(zclNode) {
    this.log('[CLIMATE] ════════════════════════════════════════════════════');
    this.log('[CLIMATE] 📚 LEARNING PERIOD COMPLETE (15 min)');
    this.log('[CLIMATE] ════════════════════════════════════════════════════');

    const stats = this._protocolStats;
    stats.learningComplete = true;

    this.log(`[CLIMATE] 📊 Protocol stats:`);
    this.log(`[CLIMATE]    Tuya DP: ${stats.tuya.dataReceived} data points`);
    this.log(`[CLIMATE]    ZCL: ${stats.zcl.dataReceived} data points`);

    // Determine preferred protocol
    if (stats.tuya.dataReceived > stats.zcl.dataReceived) {
      stats.preferredProtocol = 'tuya';
      this.log('[CLIMATE] 🎯 Preferred protocol: TUYA DP');
    } else if (stats.zcl.dataReceived > 0) {
      stats.preferredProtocol = 'zcl';
      this.log('[CLIMATE] 🎯 Preferred protocol: ZCL');
    } else {
      stats.preferredProtocol = 'both';
      this.log('[CLIMATE] 🎯 Preferred protocol: BOTH (no data received yet)');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 2: Post-learning time sync
    // ═══════════════════════════════════════════════════════════════════════
    this.log('[CLIMATE] 🕐 PHASE 2: Post-learning time sync...');
    await this._hybridTimeSync(zclNode);

    // Optimize based on protocol
    if (stats.preferredProtocol === 'tuya' && !this._universalTimeSync) {
      // Setup dedicated Tuya time sync
      this.log('[CLIMATE] 🔧 Optimizing for Tuya protocol...');
      await this._setupGatewayEmulation();
    }

    this.log('[CLIMATE] ✅ Protocol optimization complete');
  }

  /**
   * v5.5.90: Schedule aggressive Magic Packet + DP requests at typical wake intervals
   * Climate sensors wake up every 10-30 minutes typically
   *
   * CRITICAL: TZE284 devices need Magic Packet BEFORE they will report data!
   */
  _scheduleAggressiveDPRequest() {
    const intervals = [
      10 * 1000,      // 10 seconds - FIRST TRY IMMEDIATELY
      30 * 1000,      // 30 seconds
      2 * 60 * 1000,  // 2 minutes
      5 * 60 * 1000,  // 5 minutes
      10 * 60 * 1000, // 10 minutes
      20 * 60 * 1000, // 20 minutes
      30 * 60 * 1000, // 30 minutes
    ];

    const dpIds = [1, 2, 4, 18]; // temp, humidity, battery, alt temp

    intervals.forEach((delay, index) => {
      const timer = this.homey.setTimeout(async () => {
        this.log(`[CLIMATE] ⏰ Aggressive request attempt ${index + 1}/${intervals.length}`);

        // v5.5.93: Get zclNode from stored reference
        const zclNode = this._zclNode || this.zclNode;
        if (!zclNode) {
          this.log('[CLIMATE] ⚠️ No zclNode available - skipping');
          return;
        }

        // v5.5.107: Only send Magic Packet if device has Tuya cluster
        if (this._hasTuyaCluster) {
          this.log(`[CLIMATE] 🔮 Sending Magic Packet...`);
          await this._sendTuyaMagicPacket(zclNode).catch(e => {
            this.log('[CLIMATE] Magic packet error:', e.message);
          });

          // Try Tuya DP query
          if (this.safeTuyaDataQuery) {
            await this.safeTuyaDataQuery(dpIds, {
              logPrefix: '[CLIMATE-WAKE]',
              delayBetweenQueries: 100
            }).catch(() => { });
          }

          // Also push time if gateway emulator is active
          if (this._gatewayEmulator) {
            await this._gatewayEmulator.pushTime().catch(() => { });
          }
        } else {
          // v5.5.107: ZCL device - just wait for attribute reports
          this.log('[CLIMATE] ℹ️ ZCL device - waiting for attribute reports');
        }
      }, delay);

      this._aggressiveTimers = this._aggressiveTimers || [];
      this._aggressiveTimers.push(timer);
    });

    this.log('[CLIMATE] 📅 Scheduled data requests at: 10s, 30s, 2m, 5m, 10m, 20m, 30m');
  }

  /**
   * v5.5.106: Setup Universal Time Sync (HOURLY)
   * Uses UniversalTimeSync for reliable hourly synchronization
   */
  async _setupGatewayEmulation() {
    try {
      this.log('[CLIMATE] 🕐 Setting up HOURLY Time Sync (v5.5.106)...');

      // v5.5.106: Use UniversalTimeSync with 1 HOUR interval
      this._universalTimeSync = new UniversalTimeSync(this, {
        syncInterval: 60 * 60 * 1000, // 1 HOUR (was 6 hours)
        useUnixEpoch: true,  // Most Tuya devices expect Unix epoch
        verbose: true,
        retryOnFail: true,
        maxRetries: 3,
      });

      await this._universalTimeSync.initialize();

      // Also keep gateway emulator for backward compatibility
      this._gatewayEmulator = new TuyaGatewayEmulator(this, {
        broadcastInterval: 60 * 60 * 1000, // 1 HOUR
        autoStart: true,
        verbose: true,
      });
      await this._gatewayEmulator.initialize();

      this.log('[CLIMATE] ✅ HOURLY Time Sync active - syncing every hour!');
    } catch (err) {
      this.error('[CLIMATE] Time sync setup failed:', err.message);
      // Fallback to simple time sync
      await this._setupTimeSync().catch(() => { });
    }
  }

  /**
   * v5.5.29: Setup advanced wake strategies
   * Multiple methods to get data from sleepy devices
   */
  async _setupWakeStrategies() {
    try {
      this.log('[CLIMATE] ⏰ Setting up wake strategies...');

      // Strategy 1: Query all DPs when ANY data is received (device is awake)
      const dpIds = [1, 2, 4, 18]; // temp, hum, battery, alt temp
      await WakeStrategies.onAnyDataReceived(this, dpIds, async (dps) => {
        // When we receive any data, the device is awake - query everything!
        if (this.safeTuyaDataQuery) {
          await this.safeTuyaDataQuery(dps, {
            logPrefix: '[CLIMATE-WAKE]',
            delayBetweenQueries: 100
          });
        }
        // Also push time while device is awake
        if (this._gatewayEmulator) {
          await this._gatewayEmulator.pushTime().catch(() => { });
        }
      });

      // Strategy 2: Configure ZCL attribute reporting
      await WakeStrategies.configureReporting(this).catch(() => { });

      // Strategy 3: Refresh bindings
      await WakeStrategies.refreshBindings(this).catch(() => { });

      this.log('[CLIMATE] ✅ Wake strategies configured');
    } catch (err) {
      this.log('[CLIMATE] Wake strategies setup error:', err.message);
    }
  }

  /**
   * v5.4.7: Setup time synchronization for _TZE284_vvmbj46n climate monitor
   * Syncs device clock with Homey using Zigbee Time cluster (0x000A)
   */
  async _setupTimeSync() {
    try {
      const endpoint = this.zclNode?.endpoints?.[1];
      if (!endpoint) {
        this.log('[CLIMATE] ⚠️ No endpoint 1 available for time sync');
        return;
      }

      // Check if time cluster is available
      const timeCluster = endpoint.clusters?.time || endpoint.clusters?.[0x000A];
      if (!timeCluster) {
        this.log('[CLIMATE] ℹ️ Time cluster not available on this device');
        return;
      }

      // Sync time now
      await this._syncDeviceTime(timeCluster);

      // v5.5.106: Schedule time sync every 1 HOUR (was 6 hours)
      // Hourly sync ensures LCD clock stays accurate
      this._timeSyncInterval = setInterval(() => {
        this._syncDeviceTime(timeCluster).catch(err => {
          this.error('[CLIMATE] Time sync failed:', err.message);
        });
      }, 60 * 60 * 1000); // 1 HOUR

      this.log('[CLIMATE] ✅ Time sync enabled (every HOUR)');
    } catch (err) {
      this.error('[CLIMATE] Time sync setup error:', err.message);
    }
  }

  /**
   * v5.4.7: Sync device time with Homey
   * Zigbee time = seconds since 2000-01-01 00:00:00 UTC
   */
  async _syncDeviceTime(timeCluster) {
    try {
      const now = new Date();
      const epochStart = new Date(Date.UTC(2000, 0, 1, 0, 0, 0));
      const secondsSince2000 = Math.floor((now.getTime() - epochStart.getTime()) / 1000);

      // Get timezone offset in seconds (for localTime attribute)
      const timezoneOffsetSeconds = -now.getTimezoneOffset() * 60;

      this.log('[CLIMATE] 🕒 Syncing device time...');
      this.log(`[CLIMATE]    UTC time: ${secondsSince2000}s since 2000`);
      this.log(`[CLIMATE]    Timezone: ${timezoneOffsetSeconds / 3600}h offset`);

      await timeCluster.writeAttributes({
        time: secondsSince2000,
        localTime: secondsSince2000 + timezoneOffsetSeconds,
        timeZone: timezoneOffsetSeconds,
      });

      this.log('[CLIMATE] ✅ Device time synchronized');
    } catch (err) {
      // Non-critical error - device might be sleeping
      this.log('[CLIMATE] ⚠️ Time sync failed (device may be sleeping):', err.message);
    }
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

      // Step 3: Also send time sync immediately (Paris GMT+1/+2)
      this.log('[MAGIC-PACKET] 🕐 Sending time with Paris timezone...');
      await this._sendTuyaTimeSync(endpoint);

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

  /**
   * v5.5.95: ENHANCED Tuya time sync for TZE284 LCD devices
   * Uses TuyaSpecificCluster.timeSync() which sends command 0x24 (timeResponse)
   *
   * CRITICAL FOR: _TZE284_vvmbj46n (TH05Z) LCD clock display
   *
   * The device expects Unix timestamps:
   * - utcTime: seconds since 1970-01-01 00:00:00 UTC
   * - localTime: utcTime + timezone offset (for LCD display)
   */
  async _sendTuyaTimeSync(endpoint) {
    try {
      const now = new Date();
      const utcSeconds = Math.floor(now.getTime() / 1000);
      const timezoneOffset = -now.getTimezoneOffset() * 60; // In seconds
      const localSeconds = utcSeconds + timezoneOffset;

      this.log('[TIME-SYNC] 🕐 ════════════════════════════════════════════');
      this.log(`[TIME-SYNC] 🕐 UTC: ${now.toISOString()}`);
      this.log(`[TIME-SYNC] 🕐 Local: ${new Date(localSeconds * 1000).toLocaleString()}`);
      this.log(`[TIME-SYNC] 🕐 Timezone: GMT${timezoneOffset >= 0 ? '+' : ''}${timezoneOffset / 3600}`);
      this.log(`[TIME-SYNC] 🕐 UTC seconds: ${utcSeconds}`);
      this.log(`[TIME-SYNC] 🕐 Local seconds: ${localSeconds}`);

      const tuyaCluster = endpoint.clusters?.['tuya'] ||
        endpoint.clusters?.[61184] ||
        endpoint.clusters?.['manuSpecificTuya'] ||
        endpoint.clusters?.[0xEF00];

      if (tuyaCluster && typeof tuyaCluster.timeSync === 'function') {
        // v5.5.95: Use the new timeSync method
        const result = await tuyaCluster.timeSync({
          utcTime: utcSeconds,
          localTime: localSeconds
        });
        this.log('[TIME-SYNC] ✅ Time synced via TuyaSpecificCluster.timeSync()');
        this.log(`[TIME-SYNC] ✅ Sent: utc=${result.utcTime} local=${result.localTime}`);
      } else if (tuyaCluster && typeof tuyaCluster.timeResponse === 'function') {
        // Fallback: use timeResponse directly
        await tuyaCluster.timeResponse({
          utcTime: utcSeconds,
          localTime: localSeconds
        });
        this.log('[TIME-SYNC] ✅ Time synced via timeResponse()');
      } else {
        this.log('[TIME-SYNC] ⚠️ No timeSync/timeResponse method available');
        this.log('[TIME-SYNC] ℹ️ Available methods:', Object.keys(tuyaCluster || {}));
      }
      this.log('[TIME-SYNC] 🕐 ════════════════════════════════════════════');
    } catch (err) {
      this.log('[TIME-SYNC] ⚠️ Error:', err.message);
      // Don't throw - time sync failure is non-critical
    }
  }

  /**
   * v5.5.27: Refresh all DPs + time sync - called by Flow Card or manual refresh
   */
  async refreshAll() {
    this.log('[CLIMATE-REFRESH] Refreshing all DPs + time sync...');

    // DPs based on DP mappings for climate sensors
    const DPS_TEMP = [1, 18];            // Temperature
    const DPS_HUM = [2];                 // Humidity
    const DPS_BATTERY = [4, 15];         // Battery
    const DPS_CONFIG = [9, 17, 19, 20];  // Config settings

    const allDPs = [...DPS_TEMP, ...DPS_HUM, ...DPS_BATTERY];

    // Query DPs
    await this.safeTuyaDataQuery(allDPs, {
      logPrefix: '[CLIMATE-REFRESH]',
      delayBetweenQueries: 150,
    });

    // v5.5.29: Push time via gateway emulator while device is awake
    if (this._gatewayEmulator) {
      await this._gatewayEmulator.pushTime().catch(() => { });
    } else {
      // Fallback to ZCL time sync
      const endpoint = this.zclNode?.endpoints?.[1];
      const timeCluster = endpoint?.clusters?.time || endpoint?.clusters?.[0x000A];
      if (timeCluster) {
        await this._syncDeviceTime(timeCluster).catch(() => { });
      }
    }

    return true;
  }

  async onDeleted() {
    // v5.5.35: Clean up aggressive timers
    if (this._aggressiveTimers) {
      this._aggressiveTimers.forEach(t => this.homey.clearTimeout(t));
      this._aggressiveTimers = null;
    }

    // v5.5.106: Clean up universal time sync
    if (this._universalTimeSync) {
      this._universalTimeSync.destroy();
      this._universalTimeSync = null;
    }

    // v5.5.29: Clean up gateway emulator
    if (this._gatewayEmulator) {
      this._gatewayEmulator.destroy();
      this._gatewayEmulator = null;
    }

    // v5.4.7: Clear time sync interval
    if (this._timeSyncInterval) {
      clearInterval(this._timeSyncInterval);
      this._timeSyncInterval = null;
    }

    await super.onDeleted();
  }

  /**
   * v5.5.36: FIXED - Enhanced logging per MASTER BLOCK specs
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

    // v5.5.36: FIXED - Correct DP logging for climate sensors
    switch (dp) {
      case 1: // Temperature (standard) ÷10
        this.log(`[CLIMATE-DP] DP1 temperature raw=${rawValue} converted=${rawValue / 10}°C`);
        break;
      case 18: // Temperature (alt) ÷10
      case 6: // Temperature (some _TZE204 models)
        this.log(`[CLIMATE-DP] DP${dp} temperature_alt raw=${rawValue} converted=${rawValue / 10}°C`);
        break;
      case 2: // Humidity (standard)
        this.log(`[CLIMATE-DP] DP2 humidity raw=${rawValue} converted=${rawValue}%`);
        break;
      case 7: // Humidity (some _TZE204 models)
      case 103: // Humidity (alt)
        this.log(`[CLIMATE-DP] DP${dp} humidity_alt raw=${rawValue} converted=${rawValue}%`);
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
   * v5.5.54: Proper cleanup on uninit (app restart/device removal)
   * Stops all timers to prevent "Missing Zigbee Node" errors
   */
  async onUninit() {
    this.log('[CLIMATE] onUninit - cleaning up timers...');

    // Clear aggressive DP request timers
    if (this._aggressiveTimers && Array.isArray(this._aggressiveTimers)) {
      this._aggressiveTimers.forEach(timer => {
        this.homey.clearTimeout(timer);
      });
      this._aggressiveTimers = [];
    }

    // Clear gateway emulator
    if (this._gatewayEmulator) {
      try {
        this._gatewayEmulator.stop();
      } catch (e) { /* ignore */ }
      this._gatewayEmulator = null;
    }

    // v5.5.108: Clear learning timer
    if (this._learningTimer) {
      this.homey.clearTimeout(this._learningTimer);
      this._learningTimer = null;
    }

    // v5.5.108: Clear hourly sync interval
    if (this._hourlySyncInterval) {
      this.homey.clearInterval(this._hourlySyncInterval);
      this._hourlySyncInterval = null;
    }

    // v5.5.108: Clear universal time sync
    if (this._universalTimeSync) {
      try {
        this._universalTimeSync.destroy?.();
      } catch (e) { /* ignore */ }
      this._universalTimeSync = null;
    }

    // Clear optimization timer
    if (this._optimizationTimer) {
      this.homey.clearTimeout(this._optimizationTimer);
      this._optimizationTimer = null;
    }

    // Clear capability status timer
    if (this._capabilityStatusTimer) {
      this.homey.clearTimeout(this._capabilityStatusTimer);
      this._capabilityStatusTimer = null;
    }

    this.log('[CLIMATE] ✅ All timers cleared');

    // Call parent onUninit if exists
    if (super.onUninit) {
      await super.onUninit();
    }
  }

  async onDeleted() {
    this.log('[CLIMATE] Device deleted - cleanup');
    await this.onUninit();
    if (super.onDeleted) {
      await super.onDeleted().catch(err => this.error(err));
    }
  }
}

module.exports = ClimateSensorDevice;
