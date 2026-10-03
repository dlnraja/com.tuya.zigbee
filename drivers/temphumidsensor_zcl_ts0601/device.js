'use strict';

// Spec 009: same standard ZCL runtime as temphumidsensor3 (Temperature 0x0402 /100, RH 0x0405 /100,
// battery 0x0001 percentage /2). No Tuya DP parsing is assumed from the TS0601 model id alone.
// Battery cell type unconfirmed on the physical unit → energy.batteries OTHER.
module.exports = require('../temphumidsensor3/device');
