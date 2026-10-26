'use strict';

const TuyaDpProfileDevice = require('../../lib/devices/TuyaDpProfileDevice');

// DP layout from zigbee-herdsman-converters (tuya.ts, Koen Kanters and contributors); own implementation.
class PanelSwitchCoverTuyaDevice extends TuyaDpProfileDevice {
  profileFor(mfr) {
    // P3067-covers: _TZE204_pxbjch8m = Z2M TS0601_cover_with_1_switch_limited (cover without
    // position + one relay): DP1 open/stop/close, DP7 relay l1. DP8 (motor direction) is left
    // to the device, no write at pairing. Exact couple only; the 2+2 panel profile is unchanged.
    if (String(mfr || '').toLowerCase() === '_tze204_pxbjch8m') {
      return {
        capabilities: ['windowcoverings_state', 'onoff'],
        dps: {
          1: { cap: 'windowcoverings_state', kind: 'coverState' },
          7: { cap: 'onoff', kind: 'bool' },
        },
      };
    }
    return {
      capabilities: ['windowcoverings_state.c1', 'windowcoverings_set.c1', 'windowcoverings_state.c2', 'windowcoverings_set.c2', 'onoff', 'onoff.s2',
        'windowcoverings_state', 'windowcoverings_set'],
      // #95: ecosystems read only exact capability ids, so shutter 1 is also exposed as the
      // standard windowcoverings_set/state (additive mirror; the .c1 capabilities stay).
      mirrors: { windowcoverings_set: 'windowcoverings_set.c1', windowcoverings_state: 'windowcoverings_state.c1' },
      dps: {
        1: { cap: 'windowcoverings_state.c1', kind: 'coverState' },
        2: { cap: 'windowcoverings_set.c1', kind: 'coverPos' },
        4: { cap: 'windowcoverings_state.c2', kind: 'coverState' },
        5: { cap: 'windowcoverings_set.c2', kind: 'coverPos' },
        101: { cap: 'onoff', kind: 'bool' },
        102: { cap: 'onoff.s2', kind: 'bool' },
      },
    };
  }
}

module.exports = PanelSwitchCoverTuyaDevice;
