'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

// Spec 007 T4: dedicated driver — _TZ3210_jtifm80b TS0502B conflicts with every existing light driver (constitution M4).
class LightCctTs0502bDriver extends ZigBeeDriver {}

module.exports = LightCctTs0502bDriver;
