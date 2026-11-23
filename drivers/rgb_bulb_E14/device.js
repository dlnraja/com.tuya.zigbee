'use strict';
// P3389 lazy device class (P3389: body runs on first use; see lib/utils/LazyDeviceClass.js)
require('../../lib/utils/LazyDeviceClass').lazyDeviceClass(module, () => {

const TuyaZigBeeLightDevice = require('../../lib/TuyaZigBeeLightDevice');

class rgb_bulb_E14 extends TuyaZigBeeLightDevice {}

module.exports = rgb_bulb_E14;
return module.exports;
});
