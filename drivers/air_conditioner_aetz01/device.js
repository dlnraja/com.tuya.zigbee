'use strict';

const TuyaDpProfileDevice = require('../../lib/devices/TuyaDpProfileDevice');
const { sendEf00DpMaxFallback } = require('../../lib/zigbee/Ef00OnlyInterview');

// DP layout from zigbee-herdsman-converters tuya.ts AETZ01_AC (_TZE200_snfdqllf, Tuya smart air conditioner)
// (Koen Kanters and contributors); own implementation, credited in CREDITS.md.
// Nothing is written to the Tuya cluster (0xEF00) at pairing (no time sync either: the AC does not ask for it).
// Swing / sleep / turbo / quiet are settings: written only when the user changes them, read back from reports.

const OPTION_DPS = { 30: 'aetz01_swing', 25: 'aetz01_sleep', 102: 'aetz01_turbo', 103: 'aetz01_quiet' };

class AirConditionerAetz01Device extends TuyaDpProfileDevice {
  profileFor() {
    return {
      capabilities: ['onoff', 'target_temperature', 'measure_temperature', 'hvac_system_mode', 'fan_mode', 'measure_power', 'meter_power'],
      dps: {
        1: { cap: 'onoff', kind: 'bool' },
        2: { cap: 'target_temperature', kind: 'value' },
        3: { cap: 'measure_temperature', kind: 'value', readOnly: true },
        4: { cap: 'hvac_system_mode', kind: 'enum', map: { 0: 'cool', 1: 'dry', 2: 'fan_only' } },
        5: { cap: 'fan_mode', kind: 'enum', map: { 0: 'low', 1: 'medium', 2: 'high', 3: 'auto' } },
        // zhc tuya.ts AETZ01_AC: power W and energy kWh are raw values (explicit divisor 1).
        116: { cap: 'measure_power', kind: 'value', divisor: 1, readOnly: true },
        117: { cap: 'meter_power', kind: 'value', divisor: 1, readOnly: true },
      },
    };
  }

  _onProfileDP(dp, raw) {
    const key = OPTION_DPS[dp];
    if (!key) { return super._onProfileDP(dp, raw); }
    if (this._destroyed) { return undefined; }
    const v = raw === true || raw === 1 || (Buffer.isBuffer(raw) && raw.length > 0 && raw[raw.length - 1] === 1);
    if (this.getSetting?.(key) === v) { return undefined; }
    // WHY: never block the Zigbee receive path on the settings UI
    Promise.resolve().then(() => this._destroyed ? null : this.setSettings?.({ [key]: v })).catch(() => {});
    return undefined;
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    if (typeof super.onSettings === 'function') { await super.onSettings({ oldSettings, newSettings, changedKeys }); }
    for (const [dp, key] of Object.entries(OPTION_DPS)) {
      if (!(changedKeys || []).includes(key)) { continue; }
      // Non-blocking: the settings dialog must not wait for the radio.
      sendEf00DpMaxFallback(this, Number(dp), Boolean(newSettings[key]), 'bool').catch(() => {});
    }
  }
}

module.exports = AirConditionerAetz01Device;
