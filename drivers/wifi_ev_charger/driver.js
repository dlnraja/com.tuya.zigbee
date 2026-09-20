'use strict';

const TuyaLocalDriver = require('../../lib/tuya-local/TuyaLocalDriver');

/** Tuya category qccdz = EV charger family. */
const EV_CATEGORIES = new Set(['qccdz', 'qccd']);

class WiFiEvChargerDriver extends TuyaLocalDriver {
  getExpectedTuyaCategories() {
    return EV_CATEGORIES;
  }

  async onInit() {
    await super.onInit();
    this.log('[WIFI-EV-CHARGER-DRV] initialized');
  }
}

module.exports = WiFiEvChargerDriver;
