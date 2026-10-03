'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

// Spec 009: dedicated exact-pair driver for _TZE200_qoy0ekbd + TS0601 (standard ZCL temp/RH despite the
// TS0601 model id). temphumidsensor3 cannot take TS0601 without crossing its 20 manufacturer names.
class TemphumidsensorZclTs0601Driver extends ZigBeeDriver {}

module.exports = TemphumidsensorZclTs0601Driver;
