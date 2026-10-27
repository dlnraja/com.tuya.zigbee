'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

// Exact-pair driver for SONOFF|MINI-ZBRBS (brand-wide manufacturerName, so it cannot join curtain_module without cartesian collisions).
class CurtainSonoffMiniZbrbsDriver extends ZigBeeDriver {}

module.exports = CurtainSonoffMiniZbrbsDriver;
