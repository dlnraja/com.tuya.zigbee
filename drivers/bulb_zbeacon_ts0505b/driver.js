'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

// Exact-pair driver for Zbeacon|TS0505B (brand-wide manufacturerName). Same runtime as bulb_rgbw (ZCL on/off, level, color control).
class BulbZbeaconTs0505bDriver extends ZigBeeDriver {}

module.exports = BulbZbeaconTs0505bDriver;
