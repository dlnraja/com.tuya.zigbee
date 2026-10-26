'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

// P2962: dedicated variant driver so each exact manufacturerName+productId couple lives on one driver only.
// Couples: _TZ3000_imdfhhud | TS0207. Runtime reused from rain_sensor.
// Source (facts only, our own wording): deCONZ devices/tuya/_TZ3000_TS0207_rain_sensor.json
// https://github.com/dresden-elektronik/deconz-rest-plugin/blob/a4c17adfa04abc63637ad17de7f85256a825a2cb/devices/tuya/_TZ3000_TS0207_rain_sensor.json
class RainSensorTs0207V2Driver extends ZigBeeDriver {}

module.exports = RainSensorTs0207V2Driver;
