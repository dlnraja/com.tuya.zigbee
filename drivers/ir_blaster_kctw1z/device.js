'use strict';

// P2962: dedicated variant driver so each exact manufacturerName+productId couple lives on one driver only.
// Couples: _TZ3290_8xzb2ghn, _TZ3290_uc8lwbi2, _TZ3290_jxvzqatwgsaqzx1u, _TZ3290_lypnqvlem5eq1ree, _TZ3290_rlkmy85q4pzoxobl, _TZ3290_yac64inudpovoaba | TS1201. Runtime reused from ir_blaster.
// Source (facts only, our own wording): Z2M tuya.ts KCTW1Z
// https://github.com/Koenkk/zigbee-herdsman-converters/blob/cff1de4731a14a84094a8568d8bbf92aa5feb0db/src/devices/tuya.ts#L16535
module.exports = require('../ir_blaster/device');
