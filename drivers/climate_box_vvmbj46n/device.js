'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

/**
 * v5.5.174: DEDICATED DRIVER FOR _TZE284_vvmbj46n
 *
 * CRITICAL TECHNICAL FACTS (from Zigbee interview):
 * - Tuya proprietary TS0601 device
 * - Battery powered end device (sleepy)
 * - Uses Tuya private clusters 0xEF00 / 0xED00
 * - Time cluster (0x000A) is OUTPUT ONLY - cannot receive time sync!
 * - Must be handled 100% via Tuya DP parsing
 * - NO button, NO switch, NO listener capabilities
 *
 * DP MAPPINGS (typical for Tuya climate boxes):
 * - DP 1: Temperature (value, scale 0.1 or 10)
 * - DP 2: Humidity (value, scale 1)
 * - DP 4 or 15: Battery percentage
 * - DP 9: Temperature unit (0=C, 1=F)
 * - DP 17-20: Config/thresholds
 */
class ClimateBoxVvmbj46nDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('╔═══════════════════════════════════════════════════════════════════╗');
    this.log('║  CLIMATE BOX _TZE284_vvmbj46n - DEDICATED DRIVER v5.5.174        ║');
    this.log('║  100% Tuya DP - NO Zigbee Time Sync (firmware limitation)        ║');
    this.log('╚═══════════════════════════════════════════════════════════════════╝');

    this._zclNode = zclNode;

    // Store device info
    await this.setSettings({
      device_manufacturer: '_TZE284_vvmbj46n',
      device_model: 'TS0601'
    }).catch(() => { });

    // ═══════════════════════════════════════════════════════════════════════
    // CRITICAL: Do NOT attempt Time cluster sync - it's OUTPUT only!
    // ═══════════════════════════════════════════════════════════════════════
    this.log('[INIT] ⚠️ Time cluster is OUTPUT only - sync NOT possible');
    this.log('[INIT] ⚠️ Date/Time/GMT Paris cannot be set via Zigbee');

    // Setup Tuya DP listener
    await this._setupTuyaDPListener(zclNode);

    // Initial DP query (device may be asleep)
    this._scheduleInitialQuery();

    this.log('[INIT] ✅ Climate Box ready - listening for Tuya DP reports');
  }

  /**
   * Setup Tuya DP cluster listener (0xEF00)
   * This is the ONLY way to get data from this device
   */
  async _setupTuyaDPListener(zclNode) {
    const ep1 = zclNode.endpoints[1];
    if (!ep1) {
      this.error('[TUYA-DP] No endpoint 1 found!');
      return;
    }

    // Find Tuya cluster
    const tuyaCluster = ep1.clusters?.tuya ||
      ep1.clusters?.[61184] ||
      ep1.clusters?.['manuSpecificTuya'] ||
      ep1.clusters?.[0xEF00];

    if (!tuyaCluster) {
      this.error('[TUYA-DP] ❌ Tuya cluster (0xEF00) not found!');
      this.log('[TUYA-DP] Available clusters:', Object.keys(ep1.clusters || {}));
      return;
    }

    this.log('[TUYA-DP] ✅ Tuya cluster found - setting up listeners');
    this._tuyaCluster = tuyaCluster;

    // Listen for dataReport (main data channel)
    if (typeof tuyaCluster.on === 'function') {
      tuyaCluster.on('dataReport', (data) => {
        this.log('[TUYA-DP] 📥 dataReport received:', JSON.stringify(data));
        this._handleTuyaDP(data);
      });

      tuyaCluster.on('response', (status, transId, dp, dataType, data) => {
        this.log(`[TUYA-DP] 📥 response: status=${status} dp=${dp} type=${dataType}`);
        this._handleTuyaDP({ dp, dataType, data });
      });

      // Also listen for raw commands
      tuyaCluster.on('command', (commandName, payload) => {
        this.log(`[TUYA-DP] 📥 command: ${commandName}`, payload);
        if (payload?.dp !== undefined) {
          this._handleTuyaDP(payload);
        }
      });
    }

    // Listen for attribute reports
    tuyaCluster.on('attr', (attrName, attrValue) => {
      this.log(`[TUYA-DP] 📥 attr: ${attrName} =`, attrValue);
    });

    this.log('[TUYA-DP] ✅ Listeners configured');
  }

  /**
   * Handle Tuya DP data
   * Maps DPs to Homey capabilities
   */
  _handleTuyaDP(data) {
    if (!data) return;

    const dp = data.dp ?? data.dpId ?? data.datapoint;
    const value = data.data ?? data.value ?? data.dpValue;
    const dataType = data.dataType ?? data.type;

    if (dp === undefined) {
      this.log('[TUYA-DP] ⚠️ No DP in data:', JSON.stringify(data));
      return;
    }

    this.log(`[TUYA-DP] Processing DP ${dp} = ${value} (type: ${dataType})`);

    // Get settings for offsets
    const settings = this.getSettings() || {};
    const tempOffset = parseFloat(settings.temperature_offset) || 0;
    const humOffset = parseFloat(settings.humidity_offset) || 0;

    switch (dp) {
      // ═══════════════════════════════════════════════════════════════════
      // DP 1: Temperature (most common)
      // ═══════════════════════════════════════════════════════════════════
      case 1:
      case 18: // Alternative DP for temperature
        let temp = this._parseValue(value, dataType);

        // Auto-detect scale: if > 1000, divide by 100; if > 100, divide by 10
        if (temp > 1000) temp = temp / 100;
        else if (temp > 100) temp = temp / 10;

        // Apply offset
        temp += tempOffset;

        // Sanity check
        if (temp >= -40 && temp <= 80) {
          this.log(`[TEMP] 🌡️ Temperature: ${temp}°C`);
          this.setCapabilityValue('measure_temperature', temp).catch(this.error);
        } else {
          this.log(`[TEMP] ⚠️ Invalid temperature: ${temp}°C (raw: ${value})`);
        }
        break;

      // ═══════════════════════════════════════════════════════════════════
      // DP 2: Humidity
      // ═══════════════════════════════════════════════════════════════════
      case 2:
        let hum = this._parseValue(value, dataType);

        // Some devices report 0-1000 instead of 0-100
        if (hum > 100) hum = hum / 10;

        // Apply offset
        hum += humOffset;

        // Clamp to valid range
        hum = Math.max(0, Math.min(100, hum));

        if (hum >= 0 && hum <= 100) {
          this.log(`[HUM] 💧 Humidity: ${hum}%`);
          this.setCapabilityValue('measure_humidity', hum).catch(this.error);
        } else {
          this.log(`[HUM] ⚠️ Invalid humidity: ${hum}% (raw: ${value})`);
        }
        break;

      // ═══════════════════════════════════════════════════════════════════
      // DP 4, 15, 21: Battery (varies by device)
      // ═══════════════════════════════════════════════════════════════════
      case 4:
      case 15:
      case 21:
        let battery = this._parseValue(value, dataType);

        // Clamp to 0-100
        battery = Math.max(0, Math.min(100, battery));

        this.log(`[BATTERY] 🔋 Battery: ${battery}%`);
        this.setCapabilityValue('measure_battery', battery).catch(this.error);
        break;

      // ═══════════════════════════════════════════════════════════════════
      // DP 9: Temperature unit (0=Celsius, 1=Fahrenheit)
      // ═══════════════════════════════════════════════════════════════════
      case 9:
        const unit = this._parseValue(value, dataType);
        this.log(`[CONFIG] Temperature unit: ${unit === 0 ? 'Celsius' : 'Fahrenheit'}`);
        break;

      // ═══════════════════════════════════════════════════════════════════
      // Other DPs - log for discovery
      // ═══════════════════════════════════════════════════════════════════
      default:
        this.log(`[TUYA-DP] ℹ️ Unknown DP ${dp} = ${value} (type: ${dataType})`);
        this.log(`[TUYA-DP] ℹ️ Raw data:`, JSON.stringify(data));
    }
  }

  /**
   * Parse Tuya value from various formats
   */
  _parseValue(value, dataType) {
    if (typeof value === 'number') return value;

    if (Buffer.isBuffer(value)) {
      if (value.length === 1) return value.readUInt8(0);
      if (value.length === 2) return value.readUInt16BE(0);
      if (value.length === 4) return value.readUInt32BE(0);
      return value.readUInt32BE(0);
    }

    if (Array.isArray(value)) {
      if (value.length === 1) return value[0];
      if (value.length === 2) return (value[0] << 8) | value[1];
      if (value.length === 4) return (value[0] << 24) | (value[1] << 16) | (value[2] << 8) | value[3];
      return value[0];
    }

    if (typeof value === 'string') {
      return parseInt(value, 10) || 0;
    }

    return 0;
  }

  /**
   * Schedule initial DP query
   * Device is battery-powered and sleepy, so we try multiple times
   */
  _scheduleInitialQuery() {
    const delays = [5000, 30000, 60000, 300000]; // 5s, 30s, 1m, 5m

    delays.forEach((delay, index) => {
      this.homey.setTimeout(async () => {
        this.log(`[INIT] 📡 Query attempt ${index + 1}/${delays.length}...`);
        await this._queryAllDPs();
      }, delay);
    });
  }

  /**
   * Query all known DPs
   */
  async _queryAllDPs() {
    if (!this._tuyaCluster) return;

    const dpIds = [1, 2, 4, 9, 15, 18, 21]; // Common climate DPs

    for (const dp of dpIds) {
      try {
        if (typeof this._tuyaCluster.dataQuery === 'function') {
          await this._tuyaCluster.dataQuery({ dp });
          this.log(`[QUERY] DP ${dp} queried`);
        }
      } catch (err) {
        // Sleepy device may not respond - normal
      }

      // Small delay between queries
      await new Promise(r => this.homey.setTimeout(r, 100));
    }
  }

  /**
   * Handle settings change
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('[SETTINGS] Changed:', changedKeys);

    // Offsets will be applied on next data reception
    if (changedKeys.includes('temperature_offset') || changedKeys.includes('humidity_offset')) {
      this.log('[SETTINGS] Offsets updated - will apply on next data');
    }
  }

  /**
   * Cleanup on delete
   */
  async onDeleted() {
    this.log('[DELETED] Climate Box device removed');
  }
}

module.exports = ClimateBoxVvmbj46nDevice;
