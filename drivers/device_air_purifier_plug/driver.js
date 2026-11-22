'use strict';
const { ZigBeeDriver } = require('homey-zigbeedriver');

class GenericAirPurifierDriver extends ZigBeeDriver {
  // P3360: already-shipped 7bztmfm1+TS0601 stays on this driver id but gets the CO sensor class.
  onMapDeviceClass(device) {
    return require('../../lib/drivers/PublishedHostClassMap').mappedDeviceClass('device_air_purifier_plug', device) || require('./device');
  }

  getDeviceById(id) { try { return super.getDeviceById(id); } catch (err) { this.error(`[CRASH-PREVENTION] Could not get device by id: ${id} - ${err.message}`); return null; } }

  onInit() {
    super.onInit();
  }
}

module.exports = GenericAirPurifierDriver;
