'use strict';

// P2962: dedicated variant driver so each exact manufacturerName+productId couple lives on one driver only.
// Couples: _TZ3000_n0lphcok, _TZ3000_hgm6k8ku, _TZ3000_piuensvr | TS0207. Runtime reused from zigbee_repeater.
// Source (facts only, our own wording): Z2M tuya.ts TS0207_repeater (n0lphcok); Z2M ewelink.ts CK-BL702-ROUTER-01(7018) / HOBEIAN ZG-807Z USB repeater (hgm6k8ku, piuensvr)
// https://github.com/Koenkk/zigbee-herdsman-converters/blob/cff1de4731a14a84094a8568d8bbf92aa5feb0db/src/devices/ewelink.ts#L140
module.exports = require('../zigbee_repeater/device');
