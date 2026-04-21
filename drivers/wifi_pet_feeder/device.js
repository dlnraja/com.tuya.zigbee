'use strict';
const TuyaLocalDevice = require('../../lib/tuya-local/TuyaLocalDevice');

class WiFiPetFeederDevice extends TuyaLocalDevice {
  get dpMappings() {
    return {
      '1':   { capability: 'onoff', writable: true, transform: (v) => !!v, reverseTransform: (v) => !!v },
      '3':   { capability },
      '4':   { capability },
      '6':   { capability },
      '12':  { capability },
      '15':  { capability: 'measure_battery' },
      '101': { capability },
      '102': { capability },
    };
  }

  async onInit() {
    await super.onInit();
    if (!this.hasCapability('measure_battery')) {
      try { await this.addCapability('measure_battery'); } catch (e) { /* optional */ }
    }
    this.log('[WIFI-PET-FEEDER] Ready');
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

module.exports = WiFiPetFeederDevice;
