'use strict';
const { HybridPlugBase } = require('../../lib/devices/HybridPlugBase');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      SIREN / ALARM - v5.5.130 ENRICHED (Zigbee2MQTT features)               ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Source: https://www.zigbee2mqtt.io/devices/TS0216.html                     ║
 * ║  Features: alarm, volume, duration, melody, strobe                           ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class SirenDevice extends HybridPlugBase {

  get plugCapabilities() {
    return ['onoff', 'measure_battery', 'measure_temperature', 'measure_humidity'];
  }

  /**
   * v5.5.130: ENRICHED dpMappings from Zigbee2MQTT TS0216/TS0224
   */
  get dpMappings() {
    return {
      // ═══════════════════════════════════════════════════════════════════
      // ALARM CONTROL
      // ═══════════════════════════════════════════════════════════════════
      1: { capability: 'onoff', transform: (v) => v === 1 || v === true },
      13: { capability: 'onoff', transform: (v) => v === 1 || v === true },

      // ═══════════════════════════════════════════════════════════════════
      // v5.5.130: VOLUME & SOUND from Zigbee2MQTT
      // ═══════════════════════════════════════════════════════════════════
      // Volume (0=low, 1=medium, 2=high or 0-100)
      5: { capability: 'volume_set', transform: (v) => ({ 0: 0.33, 1: 0.66, 2: 1.0 }[v] ?? (v / 100)) },
      // Duration (60-3600 seconds)
      7: { capability: null, setting: 'duration', writable: true },
      // Melody/Ringtone (melody_1 to melody_5)
      21: { capability: null, setting: 'melody', writable: true },
      // Alarm type (sound, light, sound+light, normal)
      16: { capability: null, setting: 'alarm_type', writable: true },

      // ═══════════════════════════════════════════════════════════════════
      // BATTERY
      // ═══════════════════════════════════════════════════════════════════
      14: { capability: null, internal: 'battery_low', transform: (v) => v === 1 || v === 'low' }, // SDK3: alarm_battery obsolète
      15: { capability: 'measure_battery', divisor: 1 },

      // ═══════════════════════════════════════════════════════════════════
      // ENVIRONMENTAL (some sirens have T/H sensors)
      // ═══════════════════════════════════════════════════════════════════
      101: { capability: 'measure_temperature', divisor: 10 },
      102: { capability: 'measure_humidity', divisor: 1 },

      // ═══════════════════════════════════════════════════════════════════
      // v5.5.130: ADDITIONAL FEATURES
      // ═══════════════════════════════════════════════════════════════════
      // Strobe light control
      6: { capability: null, setting: 'strobe' },
      // Tamper alarm
      4: { capability: 'alarm_tamper', transform: (v) => v === 1 || v === true },
    };
  }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[SIREN] v5.5.129 - DPs: 1,5,7,13-15,21,101,102 | ZCL: 6,1282,EF00');

    // Setup IAS WD cluster (parent doesn't have this)
    await this._setupIasWD(zclNode);

    // Register volume listener ONLY (parent handles onoff)
    if (this.hasCapability('volume_set')) {
      this.registerCapabilityListener('volume_set', async (v) => {
        const volume = v < 0.4 ? 0 : (v < 0.7 ? 1 : 2);
        await this._sendTuyaDP(5, volume, 'enum');
      });
    }

    this.log('[SIREN] ✅ Ready');
  }

  async _setupIasWD(zclNode) {
    const ep1 = zclNode?.endpoints?.[1];
    try {
      this._iasWd = ep1?.clusters?.ssIasWd || ep1?.clusters?.iasWd;
      if (this._iasWd) this.log('[SIREN] ✅ IAS WD cluster available');
    } catch (e) { /* ignore */ }
  }

  /**
   * Override parent _setOnOff to add IAS WD support
   */
  async _setOnOff(value) {
    this.log(`[SIREN] 🔔 Alarm: ${value ? 'ON' : 'OFF'}`);

    // Call parent implementation for Tuya DP / ZCL On/Off
    await super._setOnOff?.(value);

    // Also trigger IAS WD if available
    if (this._iasWd?.startWarning) {
      try {
        await this._iasWd.startWarning({
          warningMode: value ? 1 : 0,
          warningDuration: value ? 30 : 0,
          strobeDutyCycle: value ? 50 : 0,
          strobeLevel: value ? 1 : 0
        });
      } catch (e) { /* ignore */ }
    }
  }

  async _sendTuyaDP(dp, value, type) {
    const tuya = this.zclNode?.endpoints?.[1]?.clusters?.tuya;
    if (tuya?.datapoint) await tuya.datapoint({ dp, value, type });
  }
}

module.exports = SirenDevice;
