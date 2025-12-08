'use strict';

const { HybridSensorBase } = require('../../lib/devices');
const { TuyaGatewayEmulator, WakeStrategies } = require('../../lib/tuya/TuyaGatewayEmulator');

/**
 * Climate Sensor Device - v5.5.35 AGGRESSIVE RECOVERY + GATEWAY EMULATION
 *
 * Sources:
 * - Z2M: Temperature & humidity sensor with clock (TH05Z)
 * - ZHA: Quirk for _TZE284_vvmbj46n with time sync
 * - Homey Community: https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test
 *
 * Uses HybridSensorBase for:
 * - Anti-double init
 * - MaxListeners bump
 * - Protocol auto-detection
 * - Phantom sub-device rejection
 * - Automatic ZCL/Tuya DP handling via onTuyaStatus()
 *
 * Supports: Temperature, Humidity, Battery, Time Sync
 *
 * KNOWN MODELS:
 * - TS0601 / _TZE200_* : Standard Tuya climate sensors (DP1/2/4)
 * - TS0601 / _TZE204_* : Newer Tuya climate sensors (DP1/2/4)
 * - TS0601 / _TZE284_vvmbj46n : TH05Z LCD climate monitor (DP1/2/4 + config DP9-20)
 * - TS0601 / _TZE200_vvmbj46n : ONENUO TH05Z (same as above)
 * - TS0201 / _TZ3000_* : ZCL-based sensors (handled via ZCL mode)
 *
 * ⚠️  IMPORTANT: DP3/5/15 are for SOIL SENSORS, NOT climate sensors!
 * Climate sensors use: DP1=temp, DP2=humidity, DP4=battery (x2 multiplier)
 *
 * v5.5.26: Enhanced time sync (every 6h) for clock devices
 * v5.5.29: Gateway emulation for time broadcast + advanced wake strategies
 *          Homey now acts as Tuya Gateway - pushes time proactively!
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
            this.log(`[ZCL] 🌡️ Temperature: ${temp}°C`);
            this._registerZigbeeHit?.();
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
            this.log(`[ZCL] 💧 Humidity: ${humidity}%`);
            this._registerZigbeeHit?.();
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
            const battery = Math.round(data.batteryPercentageRemaining / 2);
            this.log(`[ZCL] 🔋 Battery: ${battery}%`);
            this._registerZigbeeHit?.();
            this.setCapabilityValue('measure_battery', battery).catch(() => { });
          }
        }
      }
    };
  }

  async onNodeInit({ zclNode }) {
    // Call base class - handles everything!
    await super.onNodeInit({ zclNode });

    // Log sensor-specific info with model details
    const settings = this.getSettings() || {};
    const modelId = settings.zb_modelId || 'unknown';
    const mfr = settings.zb_manufacturerName || 'unknown';

    this.log('[CLIMATE] ════════════════════════════════════════════════════');
    this.log(`[CLIMATE] ✅ Climate sensor ready`);
    this.log(`[CLIMATE] Model: ${modelId}`);
    this.log(`[CLIMATE] Manufacturer: ${mfr}`);
    this.log('[CLIMATE] ════════════════════════════════════════════════════');

    // ═══════════════════════════════════════════════════════════════════════
    // v5.5.86: CRITICAL - Send Tuya Magic Packet for _TZE284 devices
    // Source: https://github.com/Koenkk/zigbee2mqtt/issues/26078
    // This tells the device to start reporting data!
    // ═══════════════════════════════════════════════════════════════════════
    const isTZE284 = mfr && mfr.startsWith('_TZE284');
    if (isTZE284) {
      this.log('[CLIMATE] 🔮 TZE284 detected - sending Tuya Magic Packet...');
      await this._sendTuyaMagicPacket(zclNode).catch(e => {
        this.log('[CLIMATE] Magic packet failed:', e.message);
      });
    }

    // v5.5.29: Initialize Gateway Emulator for devices with LCD clocks
    // This makes Homey act as a Tuya Gateway - pushing time proactively
    const hasLCD = mfr && (
      mfr.includes('_TZE284_') ||
      mfr.includes('_TZE200_vvmbj46n') ||
      modelId.includes('TH05')
    );

    if (hasLCD) {
      this.log('[CLIMATE] 🖥️ LCD device detected - initializing Gateway Emulation...');
      await this._setupGatewayEmulation();
    } else {
      // Fallback to simple time sync for non-LCD devices
      await this._setupTimeSync().catch(err => {
        this.log('[CLIMATE] Time sync setup skipped:', err.message);
      });
    }

    // v5.5.29: Setup advanced wake strategies to get data from sleepy devices
    await this._setupWakeStrategies();

    // v5.5.35: Schedule aggressive DP requests for sleepy devices
    this._scheduleAggressiveDPRequest();

    this.log('[CLIMATE] 👀 Watching for temperature/humidity data...');
    this.log('[CLIMATE] ⚠️ BATTERY DEVICE - First data may take 10-60 minutes after pairing');
  }

  /**
   * v5.5.35: Schedule aggressive DP requests at typical wake intervals
   * Climate sensors wake up every 10-30 minutes typically
   */
  _scheduleAggressiveDPRequest() {
    const intervals = [
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
        this.log(`[CLIMATE] ⏰ Aggressive DP request attempt ${index + 1}/${intervals.length}`);

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
      }, delay);

      this._aggressiveTimers = this._aggressiveTimers || [];
      this._aggressiveTimers.push(timer);
    });

    this.log('[CLIMATE] 📅 Scheduled aggressive DP requests at: 30s, 2m, 5m, 10m, 20m, 30m');
  }

  /**
   * v5.5.29: Setup Tuya Gateway Emulation
   * Makes Homey act as a real Tuya gateway for time broadcast
   */
  async _setupGatewayEmulation() {
    try {
      this.log('[CLIMATE] 🌐 Starting Gateway Emulation...');

      // Create gateway emulator instance
      this._gatewayEmulator = new TuyaGatewayEmulator(this, {
        broadcastInterval: 6 * 60 * 60 * 1000, // 6 hours
        autoStart: true,
        verbose: true,
      });

      // Initialize - this will:
      // 1. Setup time request handler (responds to device time requests)
      // 2. Push time immediately
      // 3. Start periodic time broadcast
      await this._gatewayEmulator.initialize();

      this.log('[CLIMATE] ✅ Gateway Emulation active - Homey is now a Tuya Gateway!');
    } catch (err) {
      this.error('[CLIMATE] Gateway emulation failed:', err.message);
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

      // v5.5.26: Schedule time sync every 6 hours (improved from 24h)
      // More frequent sync ensures clock stays accurate on LCD devices
      this._timeSyncInterval = setInterval(() => {
        this._syncDeviceTime(timeCluster).catch(err => {
          this.error('[CLIMATE] Time sync failed:', err.message);
        });
      }, 6 * 60 * 60 * 1000); // 6 hours

      this.log('[CLIMATE] ✅ Time sync enabled (every 6 hours)');
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
   * v5.5.86: Send Tuya time sync with Paris timezone (GMT+1/+2)
   * Format: Command 0x24 with UTC timestamp + timezone offset
   */
  async _sendTuyaTimeSync(endpoint) {
    try {
      const now = new Date();

      // Paris timezone: CET (GMT+1) or CEST (GMT+2 in summer)
      // JavaScript gives us the correct offset automatically
      const parisOffset = -now.getTimezoneOffset() * 60; // In seconds

      // Tuya time format: seconds since 1970 (Unix epoch)
      const utcSeconds = Math.floor(now.getTime() / 1000);
      const localSeconds = utcSeconds + parisOffset;

      this.log(`[TIME-SYNC] 🕐 UTC: ${new Date(utcSeconds * 1000).toISOString()}`);
      this.log(`[TIME-SYNC] 🕐 Local (Paris): ${new Date(localSeconds * 1000).toISOString()}`);
      this.log(`[TIME-SYNC] 🕐 Offset: ${parisOffset / 3600}h`);

      // Build time sync frame: Command 0x24
      // Format: [seq:2][cmd:1][len:2][utc:4][local:4]
      const frame = Buffer.alloc(13);
      frame.writeUInt16BE(0x0000, 0);  // seq
      frame.writeUInt8(0x24, 2);        // cmd = time sync
      frame.writeUInt16BE(8, 3);        // len = 8 bytes
      frame.writeUInt32BE(utcSeconds, 5);
      frame.writeUInt32BE(localSeconds, 9);

      const tuyaCluster = endpoint.clusters?.['tuya'] ||
        endpoint.clusters?.[61184];

      if (tuyaCluster && typeof tuyaCluster.timeSync === 'function') {
        await tuyaCluster.timeSync({
          utcTime: utcSeconds,
          localTime: localSeconds
        });
        this.log('[TIME-SYNC] ✅ Time synced via cluster method');
      } else {
        this.log('[TIME-SYNC] ℹ️ No timeSync method - will use gateway emulator');
      }
    } catch (err) {
      this.log('[TIME-SYNC] ⚠️ Error:', err.message);
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
