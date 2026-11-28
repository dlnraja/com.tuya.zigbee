'use strict';

// P3422: exact-pair driver for the Zemismart/Moes ZS06 IR blaster (Z2M tuya.ts, model ZS06, TS1201:
// https://www.zigbee2mqtt.io/devices/ZS06.html). Only _TZ3290_8xzb2ghn and _TZ3290_uc8lwbi2 x TS1201, so
// these mfrs no longer cross ir_blaster / button_wireless_2 pids (P3039d). Same runtime as ir_blaster.
module.exports = require('../ir_blaster/device');
