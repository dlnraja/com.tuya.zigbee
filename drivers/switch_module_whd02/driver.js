'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

// Exact-pair driver for _TZ3000_skueekg3 + TS000F (Tuya WHD02 in-wall relay module).
// Same-class drivers conflict: wall_switch_1gang_1way already lists the mfr without TS000F (adding the
// productId there would pair all of its 44 mfrs with TS000F), and the only other TS000F relay driver
// with a matching class adds a temperature sensor this module does not have. One couple = one driver.
class SwitchModuleWhd02Driver extends ZigBeeDriver {}

module.exports = SwitchModuleWhd02Driver;
