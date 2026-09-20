'use strict';

/**
 * P2621 MASTER_ONLY — WiFi EV Charger (Tuya Local).
 * WHY: Dedicated driver for Tuya category qccdz (Vevor/Nine/Aimiler/… rebrands).
 * HOW: Core DPs from tuya-local EV configs; optional electricals via smartDivisor.
 * AGAINST: Treating chargers as wifi_plug (missing charge state / wrong DPs).
 */
const TuyaLocalDevice = require('../../lib/tuya-local/TuyaLocalDevice');

class WiFiEvChargerDevice extends TuyaLocalDevice {
  get mainsPowered() { return true; }

  get dpMappings() {
    // Core qccdz map (verified against make-all/tuya-local EV YAMLs):
    // DP18 switch, DP1 lifetime energy, DP9/5 power, DP24 temp, DP10 fault
    return {
      18: {
        capability: 'onoff',
        writable: true,
        transform: (v) => v === true || v === 1,
        reverseTransform: (v) => v === true,
      },
      1: { capability: 'meter_power', smartDivisor: true },
      5: { capability: 'measure_power', smartDivisor: true },
      9: { capability: 'measure_power', smartDivisor: true },
      24: { capability: 'measure_temperature', divisor: 1 },
      25: { capability: 'meter_power', smartDivisor: true },
      10: {
        capability: 'alarm_generic',
        transform: (v) => !!(v && Number(v) !== 0),
      },
      // Portable / Aimiler variants often use DP18 + power on 114 family
      114: {
        capability: 'onoff',
        writable: true,
        transform: (v) => v === true || v === 1,
        reverseTransform: (v) => v === true,
      },
      27: {
        capability: 'onoff',
        writable: true,
        transform: (v) => v === true || v === 1 || v === 'online',
        reverseTransform: (v) => v === true,
      },
    };
  }

  async onInit() {
    await super.onInit();
    for (const c of ['measure_current', 'measure_voltage', 'measure_temperature']) {
      if (!this.hasCapability(c)) {
        try { await this.addCapability(c); } catch (_e) { /* optional */ }
      }
    }
    this.log('[WIFI-EV-CHARGER] Ready');
  }

  async onDeleted() {
    if (this._destroyed) return;
    this._destroyed = true;
    await super.onDeleted();
  }
}

module.exports = WiFiEvChargerDevice;
