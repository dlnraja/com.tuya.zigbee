'use strict';

const TuyaDpProfileDevice = require('../../lib/devices/TuyaDpProfileDevice');

// DP layout from zigbee-herdsman-converters automaton.ts CH8Z (_TZE284_1oft6qso) (Koen Kanters and contributors); own implementation, credited in CREDITS.md.
// Nothing is written to the Tuya cluster (0xEF00) at pairing; the endpoint declares only Basic/Groups/Scenes.

class UfhControllerCh8zDevice extends TuyaDpProfileDevice {
  get mainsPowered() { return true; }

  profileFor() {
    return {
      capabilities: ['onoff.l1', 'onoff.l2', 'onoff.l3', 'onoff.l4', 'onoff.l5', 'onoff.l6', 'onoff.l7', 'onoff.l8', 'child_lock'],
      dps: {
        1: { cap: 'onoff.l1', kind: 'bool' },
        2: { cap: 'onoff.l2', kind: 'bool' },
        3: { cap: 'onoff.l3', kind: 'bool' },
        4: { cap: 'onoff.l4', kind: 'bool' },
        5: { cap: 'onoff.l5', kind: 'bool' },
        6: { cap: 'onoff.l6', kind: 'bool' },
        7: { cap: 'onoff.l7', kind: 'bool' },
        8: { cap: 'onoff.l8', kind: 'bool' },
        29: { cap: 'child_lock', kind: 'bool' },
      },
    };
  }
}

module.exports = UfhControllerCh8zDevice;
