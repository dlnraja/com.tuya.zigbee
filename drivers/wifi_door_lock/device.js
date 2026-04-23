'use strict';
const TuyaLocalDevice = require('../../lib/tuya-local/TuyaLocalDevice');

class WiFiDoorLockDevice extends TuyaLocalDevice {
  get dpMappings() {
    return {
      '1':  { capability: 'locked', writable: true,
        transform: (v) => !!v,
        reverseTransform: (v) => !!v },
      '2':  { capability: 'unknown' },
      '3':  { capability: 'unknown' },
      '4':  { capability: 'measure_battery' },
      '8':  { capability: 'locked',
        transform: (v) => v === 'locked' || v === true },
      '10': { capability: 'unknown' },
      '12': { capability: 'alarm_generic',
        transform: (v) => v !== 0 && v !== 'normal' },
      '15': { capability: 'alarm_contact',
        transform: (v) => !!v },
      '16': { capability: 'unknown' },
      '19': { capability: 'unknown' },
      '20': { capability: 'unknown' },
      '21': { capability: 'unknown' },
      '25': { capability: 'unknown' },
      '36': { capability: 'unknown' },
      '46': { capability: 'unknown' },
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

  /**
   * v7.4.6: Refresh state when device announces itself (rejoin/wakeup)
   */
  async onEndDeviceAnnounce() {
    this.log('[REJOIN] Device announced itself, refreshing state...');
    if (typeof this._updateLastSeen === 'function') this._updateLastSeen();
    // Proactive data recovery if supported
    if (this._dataRecoveryManager) {
       this._dataRecoveryManager.triggerRecovery();
    }
  }
}

module.exports = WiFiDoorLockDevice;
