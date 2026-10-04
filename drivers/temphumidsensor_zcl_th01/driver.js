'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

// Dedicated so zbeacon/Zbeacon + TH01 live on one temperature driver instead of doorwindowsensor_4.
class TemphumidsensorZclTh01Driver extends ZigBeeDriver {}

module.exports = TemphumidsensorZclTh01Driver;
