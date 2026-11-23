'use strict';
// P3389 lazy device class (P3389: body runs on first use; see lib/utils/LazyDeviceClass.js)
require('../../lib/utils/LazyDeviceClass').lazyDeviceClass(module, () => {
// P3233: continuation of curtain_motor (DRIVER_CONTINUATIONS.md) - same code; own flow card ids aliased.
module.exports = require('../../lib/drivers/ContinuationFlowAlias').continuationOf(require('../curtain_motor/device'), 'curtain_motor', 'curtain_motor_2');
return module.exports;
});
