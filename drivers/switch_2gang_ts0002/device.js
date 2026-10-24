'use strict';

// P3021c: same runtime as wall_switch_2gang_1way (UnifiedSwitchBase, ZCL onOff on EP1/EP2,
// onoff + onoff.gang2, no button tiles). Dedicated only so _TZ3000_amal63is + TS0002 lives on
// exactly one driver: every other TS0002 driver also lists TS0012 (or other pids) that
// switch_1gang already pairs with this manufacturerName, which would create a dual couple.
// Source: JohanBendz/com.tuya.zigbee#128 (reporter, batch 105).
module.exports = require('../wall_switch_2gang_1way/device');
