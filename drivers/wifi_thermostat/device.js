'use strict';
const TuyaLocalDevice = require('../../lib/tuya-local/TuyaLocalDevice');
const { climateModeFromValue, climateValueFromMode } = require('../../lib/tuya-local/TuyaDeviceTemplates');

const MODE_MAP = { 0: 'off', 1: 'heat', 2: 'auto', 3: 'eco' };
const MODE_REV = { off: 0, heat: 1, auto: 2, eco: 3 };
// WHY(2026-10-10): string firmwares (tuya-local hvac_mode vocabularies: hot/cold/auto, manual/program…) were
// passed through untouched, which is not a valid thermostat_mode value. Learn the vocabulary per device and
// convert both ways; integer firmwares keep MODE_MAP/MODE_REV unchanged.
const STRING_MODE_SETS = ['auto_cold_hot', 'cool_heat_fan', 'manual_auto', 'manual_program'];
const HOMEY_MODES = new Set(['auto', 'heat', 'cool', 'off']);
function homeyModeFromToken(v) {
  for (const set of STRING_MODE_SETS) {
    const m = climateModeFromValue(v, set);
    if (m) {return { set, mode: HOMEY_MODES.has(m) ? m : (m === 'heat_cool' ? 'auto' : null) };}
  }
  return null;
}

class WiFiThermostatDevice extends TuyaLocalDevice {

  // v9.0.74: This device is mains-powered. Declare it so UnifiedBatteryHandler
  // does not add a false measure_battery capability (fixes false-battery reports).
  get mainsPowered() { return true; }

  get dpMappings() {
    return {
      '1':  { capability: 'onoff', writable: true, transform: (v) => !!v, reverseTransform: (v) => !!v },
      '2':  { capability: 'target_temperature', writable: true, smartDivisor: true },
      '3':  { capability: 'measure_temperature', smartDivisor: true },
      '4':  { capability: 'thermostat_mode', writable: true,
        transform: (v) => {
          if (typeof v === 'string') {
            const hit = homeyModeFromToken(v);
            if (hit) { this._modeTokenSet = hit.set; if (hit.mode) {return hit.mode;} }
            return MODE_MAP[Object.keys(MODE_REV).indexOf(v)] || v;
          }
          this._modeTokenSet = null;
          return MODE_MAP[v] || 'heat';
        },
        reverseTransform: (v) => {
          if (this._modeTokenSet) {
            const token = climateValueFromMode(v, this._modeTokenSet);
            if (token !== null) {return token;}
          }
          return MODE_REV[v] !== undefined ? MODE_REV[v] : 1;
        } },
      '5':  { capability: 'unknown' }, // system mode | tuya-local: "fan_mode" (x24/68 devices)
      '7':  { capability: 'child_lock', writable: true, transform: (v) => v === true || v === 1, reverseTransform: (v) => v === true }, // tuya-local: "lock" (x20/68 devices)
      '12': { capability: 'unknown' }, // child_lock
      '13': { capability: 'unknown' }, // fault
      '14': { capability: 'measure_temperature.floor', smartDivisor: true },
      '15': { capability: 'unknown' }, // max_temp | tuya-local: "max_temperature" (x15/68 devices)
      '19': { capability: 'unknown' }, // temp_correction
      '24': { capability: 'measure_humidity' },
      '36': { capability: 'unknown' }, // schedule | tuya-local: "hvac_action" (x13/68 devices)
      '40': { capability: 'unknown' }, // valve state | tuya-local: "lock" (x22/68 devices)
      '45': { capability: 'unknown' }, // sensor type
      '101': { capability: 'unknown' }, // tuya-local: "hvac_mode" (x51/68 devices)
      '102': { capability: 'unknown' },
    };
  }

  async onInit() {
    await super.onInit();
    for (const cap of ['measure_humidity', 'thermostat_mode']) {
      if (!this.hasCapability(cap)) {
        try { await this.addCapability(cap); } catch (e) { /* optional */ }
      }
    }
    this.log('[WIFI-THERMOSTAT] Ready (with modes: off/heat/auto/eco)');
  }


  async onDeleted() {
    if (this._destroyed) {return;}
    this._destroyed = true;
    this.log('Device deleted, cleaning up');
    await super.onDeleted();
  }
}

module.exports = WiFiThermostatDevice;
