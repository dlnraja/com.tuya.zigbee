'use strict';

// Exact-pair driver for zbeacon|TH01 and Zbeacon|TH01 (two separate Homey interviews, JohanBendz #797
// related threads): EP1 [0,1,3,32,1026,1029] = standard ZCL temperature + humidity + battery.
// Same runtime as temphumidsensor3 (native ZCL; extra capabilities only added when reported).
module.exports = require('../temphumidsensor3/device');
