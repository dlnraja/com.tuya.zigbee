'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

// Exact-pair driver for the Gledopto GL-SPI-206P SPI pixel controller (colour is sent on DP61, which no other driver speaks).
class LedControllerSpiTuyaDriver extends ZigBeeDriver {}

module.exports = LedControllerSpiTuyaDriver;
