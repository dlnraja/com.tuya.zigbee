'use strict';
const TuyaLocalDevice = require('../../lib/tuya-local/TuyaLocalDevice');

class WiFiDoorLockDevice extends TuyaLocalDevice {
  get dpMappings() {
    return {
      '1':  { capability: 'locked', writable: true,
        transform: (v) => !!v,
        reverseTransform: (v) => !!v },
      '2':  { capability: null },
      '3':  { capability: null },
      '4':  { capability: 'measure_battery' },
      '8':  { capability: 'locked',
        transform: (v) => v === 'locked' || v === true },
      '10': { capability: null },
      '12': { capability: 'alarm_generic',
        transform: (v) => v !== 0 && v !== 'normal' },
      '15': { capability: 'alarm_contact',
        transform: (v) => !!v },
      '16': { capability: null },
      '19': { capability: null },
      '20': { capability: null },
      '21': { capability: null },
      '25': { capability: null },
      '36': { capability: null },
      '46': { capability: null },
    };
  }

  async onInit() {
    await super.onInit();
    for (const cap of ['alarm_generic', 'alarm_contact']) {
      if (!this.hasCapability(cap)) {
        try { await this.addCapability(cap); } catch (e) { /* optional */ }
      }
    }
    this.log('[WIFI-DOOR-LOCK] Ready');
  }


  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}

module.exports = WiFiDoorLockDevice;
