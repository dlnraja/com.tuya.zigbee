'use strict';

const TuyaDpProfileDevice = require('../../lib/devices/TuyaDpProfileDevice');

// DP layout from zigbee-herdsman-converters (tuya.ts, Koen Kanters and contributors); own implementation.
const GANGS = { jlbsptkl: 1, jaunkx9g: 2, usmqzgdm: 3 };

class SwitchPresenceTuyaDevice extends TuyaDpProfileDevice {
  profileFor(mfr) {
    const key = Object.keys(GANGS).find((k) => mfr.endsWith(`_${k}`));
    const n = GANGS[key] || 3;
    const relayCaps = ['onoff', 'onoff.gang2', 'onoff.gang3'].slice(0, n);
    const dps = { 101: { cap: 'alarm_motion', kind: 'presence' } };
    relayCaps.forEach((cap, i) => { dps[i + 1] = { cap, kind: 'bool' }; });
    return { capabilities: [...relayCaps, 'alarm_motion'], dps };
  }
}

module.exports = SwitchPresenceTuyaDevice;
