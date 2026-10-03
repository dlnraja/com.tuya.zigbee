'use strict';

// Spec 007 T4: same runtime as light_bulb_tunable_white (native ZCL first, Tuya DP fallback via UnifiedLightBase);
// dedicated only so the _TZ3210_jtifm80b + TS0502B couple lives on exactly one driver (D3).
// Source: JohanBendz/com.tuya.zigbee#403 (canonical #178).
module.exports = require('../light_bulb_tunable_white/device');
