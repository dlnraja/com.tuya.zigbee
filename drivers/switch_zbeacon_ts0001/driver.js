'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

// Exact-pair driver for Zbeacon|TS0001 (brand-wide manufacturerName, so it cannot join a multi-pid driver without cartesian collisions). Same runtime as switch_1gang.
class SwitchZbeaconTs0001Driver extends ZigBeeDriver {}

module.exports = SwitchZbeaconTs0001Driver;
