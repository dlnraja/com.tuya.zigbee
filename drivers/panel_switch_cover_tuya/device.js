'use strict';

const TuyaDpProfileDevice = require('../../lib/devices/TuyaDpProfileDevice');

// DP layout from zigbee-herdsman-converters (tuya.ts, Koen Kanters and contributors); own implementation.
class PanelSwitchCoverTuyaDevice extends TuyaDpProfileDevice {
  profileFor() {
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
