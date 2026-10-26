'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

// P2962: dedicated variant driver so each exact manufacturerName+productId couple lives on one driver only.
// Couples: _TZ3000_bmhwnl7s, _TZ3000_esynmmox, _TZ3000_xdo0hj1k | TS130F. Runtime reused from curtain_module_2_gang.
// Source (facts only, our own wording): Z2M lonsonho.ts TS130F_dual
// https://github.com/Koenkk/zigbee-herdsman-converters/blob/cff1de4731a14a84094a8568d8bbf92aa5feb0db/src/devices/lonsonho.ts#L59
class CurtainModule2GangTs130fDualDriver extends ZigBeeDriver {}

module.exports = CurtainModule2GangTs130fDualDriver;
