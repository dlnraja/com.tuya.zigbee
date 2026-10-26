'use strict';

// P2962: dedicated variant driver so each exact manufacturerName+productId couple lives on one driver only.
// Couples: _TYZB01_o63ssaah, _TZ3000_abaplimj, _TZ3000_amis43tj, _TZ3000_arw23zcs, _TZ3000_it1hm1cr, _TZ3000_c8bqthpo | TS0207. Runtime reused from water_leak_sensor.
// Source (facts only, our own wording): deCONZ devices/tuya/_TZ3000_TS0207_water_leak_sensor.json; Z2M tuya.ts whiteLabel HOBEIAN ZG-222ZA (abaplimj); Z2M sber.ts SBDV-00154 (c8bqthpo)
// https://github.com/dresden-elektronik/deconz-rest-plugin/blob/a4c17adfa04abc63637ad17de7f85256a825a2cb/devices/tuya/_TZ3000_TS0207_water_leak_sensor.json
module.exports = require('../water_leak_sensor/device');
