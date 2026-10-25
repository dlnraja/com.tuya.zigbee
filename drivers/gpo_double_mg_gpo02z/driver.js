'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

// P3039 exact-pair driver (_TZE200_lq0ffndf | TS0601). No existing driver carried this datapoint layout.
class GpoDoubleMgGpo02zDriver extends ZigBeeDriver {}

module.exports = GpoDoubleMgGpo02zDriver;
