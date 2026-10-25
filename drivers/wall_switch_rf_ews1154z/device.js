'use strict';

const TuyaDpProfileDevice = require('../../lib/devices/TuyaDpProfileDevice');

// DP layout from zigbee-herdsman-converters box.ts EWS1154-Z (_TZE200_yp5tsi3y) (Koen Kanters and contributors); own implementation, credited in CREDITS.md.
// Nothing is written to the Tuya cluster (0xEF00) at pairing; the endpoint declares only Basic/Groups/Scenes.

class WallSwitchRfEws1154zDevice extends TuyaDpProfileDevice {
  get mainsPowered() { return true; }

  profileFor() {
    return {
      capabilities: ['onoff'],
      dps: {
        19: { cap: 'onoff', kind: 'bool' },
      },
    };
  }
}

module.exports = WallSwitchRfEws1154zDevice;
