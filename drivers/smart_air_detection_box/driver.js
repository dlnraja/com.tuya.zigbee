'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SmartAirDetectionBoxDriver extends ZigBeeDriver {
  // P3360: already-shipped 7bztmfm1+TS0601 stays on this driver id but gets the CO sensor class.
  onMapDeviceClass(device) {
    return require('../../lib/drivers/PublishedHostClassMap').mappedDeviceClass('smart_air_detection_box', device) || require('./device');
  }
}

module.exports = SmartAirDetectionBoxDriver;
