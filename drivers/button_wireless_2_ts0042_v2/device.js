'use strict';

// P2962: dedicated variant driver so each exact manufacturerName+productId couple lives on one driver only.
// Couples: _TZ3000_i3rjdrwu | TS0042. Runtime reused from button_wireless_2.
// Source (facts only, our own wording): deCONZ devices/tuya/_TZ3000_TS0042_2gang_remote.json
// https://github.com/dresden-elektronik/deconz-rest-plugin/blob/a4c17adfa04abc63637ad17de7f85256a825a2cb/devices/tuya/_TZ3000_TS0042_2gang_remote.json
module.exports = require('../button_wireless_2/device');
