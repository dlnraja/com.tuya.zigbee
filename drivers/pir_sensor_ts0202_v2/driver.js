'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

// P2962: dedicated variant driver so each exact manufacturerName+productId couple lives on one driver only.
// Couples: _TZ3000_mnlsbthu, _TZD200_sjjp9bti | TS0202. Runtime reused from pirsensor.
// Source (facts only, our own wording): deCONZ devices/tuya/_TZ3000_mnlsbthu_presence_sensor.json (Luminea ZX5241); Z2M tuya.ts HS208Z (HYSYIOT, IAS occupancy)
// https://github.com/Koenkk/zigbee-herdsman-converters/blob/cff1de4731a14a84094a8568d8bbf92aa5feb0db/src/devices/tuya.ts#L25695
class PirSensorTs0202V2Driver extends ZigBeeDriver {}

module.exports = PirSensorTs0202V2Driver;
