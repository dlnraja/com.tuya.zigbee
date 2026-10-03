'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

// Spec 007 T4: dedicated driver — _TZ3000_7dcddnye TS0501A conflicts with every existing light driver (constitution M4).
class LightDimmableTs0501aDriver extends ZigBeeDriver {}

module.exports = LightDimmableTs0501aDriver;
