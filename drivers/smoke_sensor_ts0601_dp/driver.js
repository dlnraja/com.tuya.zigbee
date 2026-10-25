'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

// P3039 exact-pair driver (_TZE200_yh7aoahi, _TZE200_t5p1vj8r, _TZE200_uebojraa, _TZE200_vzekyi4c, _TZE200_dq1mfjug, _TZE204_ntcy3xu1 | TS0601). No existing driver carried this datapoint layout.
class SmokeSensorTs0601DpDriver extends ZigBeeDriver {}

module.exports = SmokeSensorTs0601DpDriver;
