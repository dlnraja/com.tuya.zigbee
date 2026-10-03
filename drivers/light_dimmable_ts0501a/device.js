'use strict';

// Spec 007 T4: same runtime as bulb_dimmable (native ZCL first, Tuya DP fallback via UnifiedLightBase);
// dedicated only so the _TZ3000_7dcddnye + TS0501A couple lives on exactly one driver (D3).
// Source: JohanBendz/com.tuya.zigbee#273 (canonical #271).
module.exports = require('../bulb_dimmable/device');
