'use strict';

// Spec 007 T4: same runtime as bulb_rgb (native ZCL first, Tuya DP fallback via UnifiedLightBase);
// dedicated only so the _TZ3210_p9ao60da + TS0505B couple lives on exactly one driver (D3).
// Source: JohanBendz/com.tuya.zigbee#935 (canonical #209).
module.exports = require('../bulb_rgb/device');
