'use strict';
// P3389 lazy device class (P3389: body runs on first use; see lib/utils/LazyDeviceClass.js)
require('../../lib/utils/LazyDeviceClass').lazyDeviceClass(module, () => {
// P3228/P3236: continuation of climate_sensor (DRIVER_CONTINUATIONS.md) - same code; own flow card ids aliased.
module.exports = require('../../lib/drivers/ContinuationFlowAlias').continuationOf(require('../climate_sensor/device'), 'climate_sensor', 'climate_sensor_2');
return module.exports;
});
