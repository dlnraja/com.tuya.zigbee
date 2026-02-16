'use strict';

const TuyaLocalDriver = require('../../lib/tuya-local/TuyaLocalDriver');

class WiFiPetFeederDriver extends TuyaLocalDriver {
  async onInit() {
    await super.onInit();
    this.log('[WIFI-PET-FEEDER-DRV] Driver initialized');
  }
}

module.exports = WiFiPetFeederDriver;
