'use strict';

// P3330: moved from drivers/wall_switch_rf_ews1154z/device.js (which re-exports it) so the published driver wall_switch_1gang_1way can
// run it for these exact couples while wall_switch_rf_ews1154z stays held out of the Athom payload.

const TuyaDpProfileDevice = require('../TuyaDpProfileDevice');

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
