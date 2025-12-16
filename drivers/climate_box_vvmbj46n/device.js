'use strict';

const { HybridSensorBase } = require('../../lib/devices');
const { syncDeviceTimeTuya } = require('../../lib/tuya/TuyaTimeSync');

/**
 * v5.5.183: DEDICATED DRIVER FOR _TZE284_vvmbj46n - REVERTED TO v5.5.165 STYLE
 *
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  CLIMATE BOX TH05Z LCD - _TZE284_vvmbj46n                                   ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  v5.5.183: Reverted to HybridSensorBase (TuyaTimeSyncMixin broke data)      ║
 * ║  - Tuya DP (0xEF00) for proprietary data                                    ║
 * ║  - ZCL standard clusters for temp/humidity/battery                          ║
 * ║  - Hourly time sync + responds to device requests                           ║
 * ║  - Paris timezone support (GMT+1/+2 DST)                                    ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 *
 * TECHNICAL FACTS (from Zigbee interview + Z2M):
 * - Tuya proprietary TS0601 device
 * - Battery powered end device (sleepy)
 * - Time cluster (0x000A) is OUTPUT ONLY - we RESPOND to time requests
 * - LCD display shows date/time - requires proper time sync
 *
 * DP MAPPINGS (from Z2M TH05Z - verified):
 * - DP 1: Temperature (value/10 = °C)
 * - DP 2: Humidity (direct %)
 * - DP 4: Battery (value*2, capped at 100)
 * - DP 9: Temperature unit (0=C, 1=F)
 * - DP 10-13: Alarm thresholds
 * - DP 14-15: Alarm status (NOT battery!)
 * - DP 17-20: Reporting config
 *
 * ZCL CLUSTERS (also available as fallback):
 * - temperatureMeasurement (0x0402): measuredValue/100 = °C
 * - relativeHumidity (0x0405): measuredValue/100 = %
 * - powerConfiguration (0x0001): batteryPercentageRemaining/2 = %
 *
 * TIME SYNC PROTOCOL:
 * - Device sends mcuSyncTime (cmd 0x24) when it needs time
 * - v5.5.184: CRITICAL - Use TUYA epoch (2000) NOT Unix epoch (1970)!
 * - LCD devices interpret timestamps as seconds since 2000-01-01
 * - We respond with [UTC:4bytes][Local:4bytes] in Tuya epoch
 * - Also proactively sync every 6 hours
 */

// v5.5.183: Reverted to HybridSensorBase directly (TuyaTimeSyncMixin broke temp/humidity)
class ClimateBoxVvmbj46nDevice extends HybridSensorBase {

  // ═══════════════════════════════════════════════════════════════════════════
  // CONFIGURATION
  // ═══════════════════════════════════════════════════════════════════════════

  /** Battery powered */
  get mainsPowered() { return false; }

  /** Use Tuya DP for battery (DP4) */
  get usesTuyaDPBattery() { return true; }
  get skipZclBatteryPolling() { return false; } // Try both!

  /** FORCE ACTIVE MODE - query DPs even if cluster not visible */
  get forceActiveTuyaMode() { return true; }

  /** TRUE HYBRID mode - listen to BOTH ZCL AND Tuya DP */
  get hybridModeEnabled() { return true; }

  /** Capabilities for this sensor */
  get sensorCapabilities() {
    return ['measure_temperature', 'measure_humidity', 'measure_battery'];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DP MAPPINGS - Verified from Z2M TH05Z converter
  // Source: https://github.com/Koenkk/zigbee2mqtt/issues/26078
  // ═══════════════════════════════════════════════════════════════════════════

  get dpMappings() {
    return {
      // ═══════════════════════════════════════════════════════════════════════
      // PRIMARY DATA DPs
      // ═══════════════════════════════════════════════════════════════════════

      // Temperature: DP1, value/10 = °C (e.g., 215 → 21.5°C)
      1: {
        capability: 'measure_temperature',
        divisor: 10,
        transform: (v) => {
          const temp = v / 10;
          const offset = parseFloat(this.getSetting('temperature_offset')) || 0;
          return Math.round((temp + offset) * 10) / 10;
        }
      },

      // Humidity: DP2, direct % (e.g., 65 → 65%)
      2: {
        capability: 'measure_humidity',
        divisor: 1,
        transform: (v) => {
          const hum = v;
          const offset = parseFloat(this.getSetting('humidity_offset')) || 0;
          return Math.max(0, Math.min(100, Math.round(hum + offset)));
        }
      },

      // Battery: DP4, value*2 (device reports half, e.g., 50 → 100%)
      // Source: ZHA quirk for TH05Z shows x2 multiplier
      4: {
        capability: 'measure_battery',
        divisor: 1,
        transform: (v) => Math.max(0, Math.min(100, v * 2))
      },

      // ═══════════════════════════════════════════════════════════════════════
      // CONFIGURATION DPs (stored in settings, not capabilities)
      // ═══════════════════════════════════════════════════════════════════════

      // Temperature unit: 0=Celsius, 1=Fahrenheit
      9: { capability: null, setting: 'temperature_unit' },

      // Alarm thresholds
      10: { capability: null, setting: 'max_temp_alarm', divisor: 10 },
      11: { capability: null, setting: 'min_temp_alarm', divisor: 10 },
      12: { capability: null, setting: 'max_humidity_alarm' },
      13: { capability: null, setting: 'min_humidity_alarm' },

      // Alarm status (enum: cancel/lower/upper) - NOT capabilities
      14: { capability: null }, // Temp alarm status
      15: { capability: null }, // Humidity alarm status (NOT battery!)

      // Reporting intervals
      17: { capability: null, setting: 'temp_report_interval' },
      18: { capability: 'measure_temperature', divisor: 10 }, // Alt temp DP on some firmware
      19: { capability: null, setting: 'temp_sensitivity', divisor: 10 },
      20: { capability: null, setting: 'humidity_sensitivity' },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ZCL CLUSTER HANDLERS - Fallback for devices that also report via ZCL
  // ═══════════════════════════════════════════════════════════════════════════

  get clusterHandlers() {
    return {
      // Temperature - ZCL cluster (0x0402), value/100 = °C
      temperatureMeasurement: {
        attributeReport: (data) => {
          if (data.measuredValue !== undefined && data.measuredValue !== 0xFFFF) {
            const temp = data.measuredValue / 100;
            const offset = parseFloat(this.getSetting('temperature_offset')) || 0;
            const finalTemp = Math.round((temp + offset) * 10) / 10;

            if (finalTemp >= -40 && finalTemp <= 80) {
              this.log(`[ZCL] 🌡️ Temperature: ${finalTemp}°C (raw: ${data.measuredValue})`);
              this.setCapabilityValue('measure_temperature', finalTemp).catch(() => { });
              this._sendTimeSync().catch(() => { }); // Trigger time sync on data reception
            }
          }
        }
      },

      // Humidity - ZCL cluster (0x0405), value/100 = %
      relativeHumidity: {
        attributeReport: (data) => {
          if (data.measuredValue !== undefined && data.measuredValue !== 0xFFFF) {
            const humidity = data.measuredValue / 100;
            const offset = parseFloat(this.getSetting('humidity_offset')) || 0;
            const finalHum = Math.max(0, Math.min(100, Math.round(humidity + offset)));

            if (finalHum >= 0 && finalHum <= 100) {
              this.log(`[ZCL] 💧 Humidity: ${finalHum}% (raw: ${data.measuredValue})`);
              this.setCapabilityValue('measure_humidity', finalHum).catch(() => { });
            }
          }
        }
      },

      // Battery - ZCL cluster (0x0001), value/2 = %
      powerConfiguration: {
        attributeReport: (data) => {
          if (data.batteryPercentageRemaining !== undefined && data.batteryPercentageRemaining !== 255) {
            let battery = Math.round(data.batteryPercentageRemaining / 2);
            battery = Math.max(0, Math.min(100, battery));
            this.log(`[ZCL] 🔋 Battery: ${battery}% (raw: ${data.batteryPercentageRemaining})`);
            this.setCapabilityValue('measure_battery', battery).catch(() => { });
          }
        }
      }
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════

  async onNodeInit({ zclNode }) {
    this.log('');
    this.log('╔══════════════════════════════════════════════════════════════════════════════╗');
    this.log('║  CLIMATE BOX _TZE284_vvmbj46n - v5.5.183 REVERTED TO v5.5.165 STYLE         ║');
    this.log('║  HybridSensorBase + inline hourly time sync (like v5.5.165)                 ║');
    this.log('╚══════════════════════════════════════════════════════════════════════════════╝');
    this.log('');

    // Store zclNode for time sync
    this._zclNode = zclNode;

    // Call parent initialization (HybridSensorBase sets up ALL listeners)
    await super.onNodeInit({ zclNode });

    // Store device info
    await this.setSettings({
      device_manufacturer: '_TZE284_vvmbj46n',
      device_model: 'TS0601'
    }).catch(() => { });

    // ═══════════════════════════════════════════════════════════════════════
    // TIME SYNC SETUP - Critical for LCD clock display
    // v5.5.183: Inline hourly sync (like v5.5.165)
    // ═══════════════════════════════════════════════════════════════════════
    this.log('[TIME] Setting up hourly time sync (v5.5.165 style)...');

    // Hourly time sync interval
    this._hourlySyncInterval = this.homey.setInterval(async () => {
      this.log('[TIME] 🕐 Hourly time sync...');
      await this._sendTimeSync().catch(e => this.log('[TIME] Sync failed:', e.message));
    }, 60 * 60 * 1000); // 1 hour

    // Setup listener for mcuSyncTime requests from device
    await this._setupTimeSyncListener(zclNode);

    this.log('[INIT] ✅ Climate Box ready - FULL HYBRID mode');
    this.log('[INIT] 📡 Listening for: Tuya DP + ZCL clusters + Time requests');
    this.log('');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TIME SYNC LISTENER - Respond to device time requests
  // ═══════════════════════════════════════════════════════════════════════════

  async _setupTimeSyncListener(zclNode) {
    try {
      const ep1 = zclNode?.endpoints?.[1];
      if (!ep1) return;

      // Find Tuya cluster
      const tuyaCluster = ep1.clusters?.tuya ||
        ep1.clusters?.manuSpecificTuya ||
        ep1.clusters?.[61184] ||
        ep1.clusters?.[0xEF00];

      if (!tuyaCluster) {
        this.log('[TIME] ⚠️ Tuya cluster not found for time sync listener');
        return;
      }

      // Listen for mcuSyncTime requests (command 0x24)
      if (typeof tuyaCluster.on === 'function') {
        tuyaCluster.on('mcuSyncTime', async () => {
          this.log('[TIME] 🕐 Device requested time sync (mcuSyncTime)');
          await this._respondToTimeRequest();
        });

        // Also listen for command events
        tuyaCluster.on('command', async (cmdName, payload) => {
          if (cmdName === 'mcuSyncTime' || cmdName === 'timeSyncRequest' || cmdName === '0x24') {
            this.log(`[TIME] 🕐 Time sync request via command: ${cmdName}`);
            await this._respondToTimeRequest();
          }
        });

        this.log('[TIME] ✅ Time sync listener active');
      }
    } catch (err) {
      this.log('[TIME] ⚠️ Time sync listener setup failed:', err.message);
    }
  }

  /**
   * Respond to device time request
   * Uses Unix epoch (seconds since 1970) as per Tuya protocol
   */
  async _respondToTimeRequest() {
    try {
      const now = new Date();
      const utcTimestamp = Math.floor(now.getTime() / 1000);
      const timezoneOffset = -now.getTimezoneOffset() * 60; // Paris = +3600 or +7200 (DST)
      const localTimestamp = utcTimestamp + timezoneOffset;

      this.log('[TIME] 🕐 ════════════════════════════════════════════════════');
      this.log(`[TIME] 🕐 Responding to time request`);
      this.log(`[TIME] 🕐 UTC: ${new Date(utcTimestamp * 1000).toISOString()}`);
      this.log(`[TIME] 🕐 Local: ${now.toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}`);
      this.log(`[TIME] 🕐 TZ offset: ${timezoneOffset}s (GMT${timezoneOffset >= 0 ? '+' : ''}${timezoneOffset / 3600})`);

      // Use the TuyaTimeSync module
      await syncDeviceTimeTuya(this, { logPrefix: '[TIME]' });

      this.log('[TIME] 🕐 ════════════════════════════════════════════════════');
    } catch (err) {
      this.log('[TIME] ⚠️ Time response failed:', err.message);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DP HANDLING - Override to add wake detection
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Override _handleDP to trigger time sync on data reception
   */
  _handleDP(dpId, value) {
    // Call parent DP handler
    if (super._handleDP) {
      super._handleDP(dpId, value);
    }

    // Log for debugging
    this.log(`[DP] 📥 DP${dpId} = ${value}`);

    // Device is awake - trigger time sync
    this._sendTimeSync().catch(() => { });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SETTINGS
  // ═══════════════════════════════════════════════════════════════════════════

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('[SETTINGS] Changed:', changedKeys);

    // Offsets will be applied on next data reception
    if (changedKeys.includes('temperature_offset') || changedKeys.includes('humidity_offset')) {
      this.log('[SETTINGS] Offsets updated - will apply on next data');
    }

    // Force time sync if user changed time-related settings
    if (changedKeys.some(k => k.includes('time'))) {
      this.log('[SETTINGS] Time setting changed - forcing sync');
      await this._sendTimeSync().catch(() => { });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CLEANUP
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * v5.5.184: Send time sync to device using TUYA epoch (2000)
   * CRITICAL: LCD devices expect Tuya epoch, NOT Unix epoch!
   * Reference: https://github.com/Koenkk/zigbee2mqtt/issues/30054
   */
  async _sendTimeSync() {
    try {
      const now = new Date();
      this.log('[TIME] 🕐 Sending time sync (TUYA EPOCH 2000)...');
      this.log(`[TIME] 🕐 Local: ${now.toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}`);
      // v5.5.184: CRITICAL - Force Tuya epoch for LCD display
      await syncDeviceTimeTuya(this, {
        logPrefix: '[TIME]',
        useTuyaEpoch: true  // Force Tuya epoch (2000) for LCD devices
      });
      this.log('[TIME] ✅ Time sync sent!');
    } catch (err) {
      this.log('[TIME] ⚠️ Time sync failed:', err.message);
    }
  }

  async onDeleted() {
    this.log('[DELETED] Climate Box device removed');

    // Clear hourly time sync interval
    if (this._hourlySyncInterval) {
      this.homey.clearInterval(this._hourlySyncInterval);
      this._hourlySyncInterval = null;
    }

    if (super.onDeleted) {
      await super.onDeleted();
    }
  }
}

module.exports = ClimateBoxVvmbj46nDevice;
