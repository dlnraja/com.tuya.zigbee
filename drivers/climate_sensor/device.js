'use strict';

const { HybridSensorBase } = require('../../lib/devices');
const { syncDeviceTimeTuya } = require('../../lib/tuya/TuyaTimeSync');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║     CLIMATE SENSOR - v5.5.183 REVERTED TO v5.5.165 STYLE                    ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                              ║
 * ║  🔥 v5.5.183: REVERTED to HybridSensorBase (like v5.5.165)                  ║
 * ║  - TuyaTimeSyncMixin was causing temp/humidity to stop working              ║
 * ║  - Hourly time sync + responds to device time requests (cmd 0x24)           ║
 * ║  - HYBRID mode: Both Tuya DP and ZCL clusters                               ║
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
 * ║  DP MAPPINGS (verified from Z2M):                                            ║
 * ║  - DP1: Temperature (÷10 = °C)                                               ║
 * ║  - DP2: Humidity (direct %)                                                  ║
 * ║  - DP4: Battery (×2, capped at 100%)                                         ║
 * ║  - DP9-20: Config settings (unit, alarms, intervals, sensitivity)            ║
 * ║                                                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
/**
 * v5.5.183: REVERTED to HybridSensorBase directly (like v5.5.165)
 * TuyaTimeSyncMixin was causing issues with data reception
 * Time sync is now handled manually with inline methods
 */
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

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIALIZATION - v5.5.180 SIMPLIFIED
  // ═══════════════════════════════════════════════════════════════════════════

  async onNodeInit({ zclNode }) {
    this.log('');
    this.log('╔══════════════════════════════════════════════════════════════════════════════╗');
    this.log('║  CLIMATE SENSOR - v5.5.183 REVERTED TO v5.5.165 STYLE                       ║');
    this.log('║  HybridSensorBase + inline time sync (hourly + on device request)           ║');
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

    this.log('[CLIMATE] ✅ Climate sensor ready - HYBRID mode');
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
   * v5.5.183: Send time sync to device (like v5.5.165 _hybridTimeSync)
   * Uses Tuya epoch (seconds since 2000-01-01) for LCD clock
   */
  async _sendTimeSync() {
    try {
      const now = new Date();
      const timezoneOffset = -now.getTimezoneOffset() * 60;

      this.log('[CLIMATE] 🕐 Sending time sync...');
      this.log(`[CLIMATE] 🕐 Local: ${now.toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}`);
      this.log(`[CLIMATE] 🕐 TZ offset: GMT${timezoneOffset >= 0 ? '+' : ''}${timezoneOffset / 3600}`);

      await syncDeviceTimeTuya(this, { logPrefix: '[CLIMATE]' });

      this.log('[CLIMATE] ✅ Time sync sent!');
    } catch (err) {
      this.log('[CLIMATE] ⚠️ Time sync failed:', err.message);
    }
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
   * v5.5.36: Enhanced logging for DP data
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
