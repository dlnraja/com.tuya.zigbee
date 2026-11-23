'use strict';
// P3389 lazy device class (P3389: body runs on first use; see lib/utils/LazyDeviceClass.js)
require('../../lib/utils/LazyDeviceClass').lazyDeviceClass(module, () => {

const { ZigBeeLightDevice } = require('homey-zigbeedriver');

class rgb_led_strip_controller extends ZigBeeLightDevice {}

module.exports = rgb_led_strip_controller;
return module.exports;
});
