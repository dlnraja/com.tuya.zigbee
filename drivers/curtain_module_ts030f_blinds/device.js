'use strict';

// P2962: dedicated variant driver so each exact manufacturerName+productId couple lives on one driver only.
// Couples: _TZB000_yqjaollc | TS030F. Runtime reused from curtain_module.
// Source (facts only, our own wording): deCONZ devices/tuya/_TZB000_42ha4rsc_window_blinds.json
// https://github.com/dresden-elektronik/deconz-rest-plugin/blob/a4c17adfa04abc63637ad17de7f85256a825a2cb/devices/tuya/_TZB000_42ha4rsc_window_blinds.json
module.exports = require('../curtain_module/device');
