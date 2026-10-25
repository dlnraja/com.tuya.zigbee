'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

// P3039 exact-pair driver (_TZE200_4jvmbiph | TS0601). No existing driver carried this datapoint layout.
class GpoDoubleLightMgAu03Driver extends ZigBeeDriver {}

module.exports = GpoDoubleLightMgAu03Driver;
