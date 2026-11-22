'use strict';
// P3389 lazy device class (P3389: body runs on first use; see lib/utils/LazyDeviceClass.js)
require('../../lib/utils/LazyDeviceClass').lazyDeviceClass(module, () => {

const TuyaZigBeeLightDevice = require('../../lib/TuyaZigBeeLightDevice');

class tunable_bulb_E27 extends TuyaZigBeeLightDevice {}

module.exports = tunable_bulb_E27;
return module.exports;
});
