'use strict';

// Same runtime as wall_switch_1gang_1way (native ZCL OnOff first; optional Tuya 0xE000/0xE001 layers
// are never required for pairing). Hardware identity, our summary of public reports:
//   Koenkk/zigbee-herdsman-converters#6160 (alray31) — TS000F/_TZ3000_skueekg3 is the WHD02 wall switch module;
//   Koenkk/zigbee-herdsman-converters#6552 (pannal) — same unit can also report TS0001;
//   zigpy/zha-device-handlers#3252 — mains router, clusters 0,3,4,5,6,0x000a,0x1000,0xE000,0xE001.
// The TS0001 report stays on wall_switch_1gang_1way, which already lists this mfr with TS0001.
module.exports = require('../wall_switch_1gang_1way/device');
