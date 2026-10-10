'use strict';

const TuyaDpProfileDevice = require('../../lib/devices/TuyaDpProfileDevice');

// DP layout from zigbee-herdsman-converters (tuya.ts, Koen Kanters and contributors); own implementation.
class PanelSwitchCoverTuyaDevice extends TuyaDpProfileDevice {
  profileFor() {
    return {
      capabilities: ['windowcoverings_state.c1', 'windowcoverings_set.c1', 'windowcoverings_state.c2', 'windowcoverings_set.c2', 'onoff', 'onoff.s2'],
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
