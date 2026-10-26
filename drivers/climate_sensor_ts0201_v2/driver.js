'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

// P2962: dedicated variant driver so each exact manufacturerName+productId couple lives on one driver only.
// Couples: _TZ3000_lfa05ajd, _TZ3000_5nrcorgu, _TZ3000_ena8vgqb, _TZ3000_j5fbnjeh | TS0201. Runtime reused from climate_sensor.
// Source (facts only, our own wording): ZHA zhaquirks/tuya/ts0201.py (lfa05ajd); deCONZ devices/tuya/_TZ3000_TS0201_temp_hum_sensor.json (5nrcorgu, ena8vgqb); deCONZ devices/tesla/tsl-sen-tah_multi_sensor.json (j5fbnjeh)
// https://github.com/zigpy/zha-device-handlers/blob/1d6598c32a8b4f054438f63f08fc36ff3d6b4930/zhaquirks/tuya/ts0201.py
class ClimateSensorTs0201V2Driver extends ZigBeeDriver {}

module.exports = ClimateSensorTs0201V2Driver;
