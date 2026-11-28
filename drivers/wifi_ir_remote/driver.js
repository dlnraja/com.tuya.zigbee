'use strict';

const TuyaLocalDriver = require('../../lib/tuya-local/TuyaLocalDriver');

class WiFiIrRemoteDriver extends TuyaLocalDriver {
  /** P3404: Prioritize Tuya Universal IR Remote categories during SmartLife / IoT pairing. */
  getExpectedTuyaCategories() {
    return new Set([
      'wnykq',
      'infrared_ac',
      'infrared_tv',
      'infrared_stb',
      'infrared_box',
      'infrared_fan',
      'infrared_light',
      'qt',
      'ir',
    ]);
  }

  async onInit() {
    await super.onInit();
    this.log('[WIFI-IR-REMOTE-DRV] Driver initialized');
  }
}

module.exports = WiFiIrRemoteDriver;
