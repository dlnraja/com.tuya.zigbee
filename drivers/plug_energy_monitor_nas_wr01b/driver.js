'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

// P2962: dedicated variant driver so each exact manufacturerName+productId couple lives on one driver only.
// Couples: _TZ3000_xzhnra8x | TS011F. Runtime reused from plug_energy_monitor.
// Source (facts only, our own wording): deCONZ devices/neo/nas-wr01B_ts011f.json
// https://github.com/dresden-elektronik/deconz-rest-plugin/blob/a4c17adfa04abc63637ad17de7f85256a825a2cb/devices/neo/nas-wr01B_ts011f.json
class PlugEnergyMonitorNasWr01bDriver extends ZigBeeDriver {}

module.exports = PlugEnergyMonitorNasWr01bDriver;
