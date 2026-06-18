'use strict';
const TuyaLocalDevice = require('../../lib/tuya-local/TuyaLocalDevice');

class WiFiGarageDoorDevice extends TuyaLocalDevice {
  get dpMappings() {
    return {
      '1':  { capability: 'garagedoor_closed', writable: true,
        transform: (v) => !v,
        reverseTransform: (v) => !v },
      '2':  { capability: 'alarm_contact', transform: (v) => !!v },
      '3':  { capability: 'unknown' },
      '11': { capability: 'unknown' },
      '12': { capability: 'unknown' },
    };
  }

  async onInit() {
    await super.onInit();
    if (!this.hasCapability('alarm_contact')) {
      try { await this.addCapability('alarm_contact'); } catch (e) { /* optional */ }
    }
    this.log('[WIFI-GARAGE] Ready');
  }


  async onDeleted() {
    if (this._destroyed) return;
    this._destroyed = true;
    this.log('Device deleted, cleaning up');
    await super.onDeleted();
  }
}

module.exports = WiFiGarageDoorDevice;
