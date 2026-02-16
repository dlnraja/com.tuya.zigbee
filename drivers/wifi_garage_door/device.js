'use strict';
const TuyaLocalDevice = require('../../lib/tuya-local/TuyaLocalDevice');

class WiFiGarageDoorDevice extends TuyaLocalDevice {
  get dpMappings() {
    return {
      '1':  { capability: 'garagedoor_closed', writable: true,
        transform: (v) => !v,
        reverseTransform: (v) => !v },
      '2':  { capability: 'alarm_contact', transform: (v) => !!v },
      '3':  { capability: null },
      '11': { capability: null },
      '12': { capability: null },
    };
  }

  async onInit() {
    await super.onInit();
    if (!this.hasCapability('alarm_contact')) {
      try { await this.addCapability('alarm_contact'); } catch (e) { /* optional */ }
    }
    this.log('[WIFI-GARAGE] Ready');
  }
}

module.exports = WiFiGarageDoorDevice;
