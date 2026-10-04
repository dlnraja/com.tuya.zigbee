'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

// #109 exact-pair driver for _TZE200_rgeapp2c (2 relays + 2 shutters). curtain_motor keeps the couple (never remove); reviewed in data/native-matrix-reviewed-duals.json.
class PanelSwitchCoverTuyaDriver extends ZigBeeDriver {}

module.exports = PanelSwitchCoverTuyaDriver;
