'use strict';

const BaseDriver = require('../soil_sensor/driver');

// P2962: dedicated variant driver so each exact manufacturerName+productId couple lives on one driver only.
// Couples: _TZE204_myd45weu | TS0222. Runtime reused from soil_sensor.
// Source (facts only, our own wording): Z2M tuya.ts TS0601_soil, whiteLabel Tuya QT-07S
// https://github.com/Koenkk/zigbee-herdsman-converters/blob/cff1de4731a14a84094a8568d8bbf92aa5feb0db/src/devices/tuya.ts#L15194
class SoilSensorQt07sTs0222Driver extends BaseDriver {} // inherits pair/repair session handlers and flow registration

module.exports = SoilSensorQt07sTs0222Driver;
