'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

// P2962: dedicated variant driver so each exact manufacturerName+productId couple lives on one driver only.
// Couples: _TZ1800_akzvkzqq | TS0211. Runtime reused from doorbell.
// Source (facts only, our own wording): Z2M lidl.ts HG06668
// https://github.com/Koenkk/zigbee-herdsman-converters/blob/cff1de4731a14a84094a8568d8bbf92aa5feb0db/src/devices/lidl.ts#L300
class DoorbellLidlHg06668Driver extends ZigBeeDriver {}

module.exports = DoorbellLidlHg06668Driver;
