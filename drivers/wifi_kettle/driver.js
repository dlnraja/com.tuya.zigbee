'use strict';

const TuyaLocalDriver = require('../../lib/tuya-local/TuyaLocalDriver');

/** Tuya category bh = smart kettle (com.tuyalocal / tuya-local). */
const KETTLE_CATEGORIES = new Set(['bh', 'bhj']);

class WiFiKettleDriver extends TuyaLocalDriver {
  getExpectedTuyaCategories() {
    return KETTLE_CATEGORIES;
  }

  async onInit() {
    await super.onInit();
    this.log('[WIFI-KETTLE-DRV] initialized');
  }
}

module.exports = WiFiKettleDriver;
