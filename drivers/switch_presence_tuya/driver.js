'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

// #108 exact-pair driver: Tuya wall switches with a built-in presence radar (1, 2 or 3 gangs). No existing driver carries both relays and presence.
class SwitchPresenceTuyaDriver extends ZigBeeDriver {}

module.exports = SwitchPresenceTuyaDriver;
