'use strict';
// P3389 lazy device class (P3389: body runs on first use; see lib/utils/LazyDeviceClass.js)
require('../../lib/utils/LazyDeviceClass').lazyDeviceClass(module, () => {

const TuyaZigBeeLightDevice = require('../../lib/TuyaZigBeeLightDevice');

class dimmable_recessed_led extends TuyaZigBeeLightDevice {}

module.exports = dimmable_recessed_led;
return module.exports;
});
