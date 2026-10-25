'use strict';

// P3057: TS0601 family of presence_sensor_radar. Same driver class: the radar flow cards are
// app-level (filter driver_id=presence_sensor_radar|presence_sensor_radar_ts0601), so both drivers
// register the same run listeners (idempotent; the listener only reads args.device).
module.exports = require('../presence_sensor_radar/driver');
