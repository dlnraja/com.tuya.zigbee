'use strict';
// P3389 lazy device class (P3389: body runs on first use; see lib/utils/LazyDeviceClass.js)
require('../../lib/utils/LazyDeviceClass').lazyDeviceClass(module, () => {

const TuyaZigBeeLightDevice = require('../../lib/TuyaZigBeeLightDevice');

class rgb_spot_GardenLight extends TuyaZigBeeLightDevice {}

module.exports = rgb_spot_GardenLight;
return module.exports;
});
