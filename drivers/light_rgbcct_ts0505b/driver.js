'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

// Spec 007 T4: dedicated driver — _TZ3210_p9ao60da TS0505B conflicts with every existing light driver (constitution M4).
class LightRgbcctTs0505bDriver extends ZigBeeDriver {}

module.exports = LightRgbcctTs0505bDriver;
