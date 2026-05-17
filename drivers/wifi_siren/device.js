'use strict';
// A8: NaN Safety - use safeDivide/safeMultiply
  require('../../lib/tuya-local/TuyaLocalDevice');

class WiFiSirenDevice extends TuyaLocalDevice {
  get dpMappings() {
    return {
      '1':   { capability: 'onoff', writable: true, transform: (v) => !!v, reverseTransform: (v) => !!v },
      '4':   { capability: 'unknown' },
      '5':   { capability: 'unknown' },
      '6':   { capability: 'alarm_generic', transform: (v) => !!v },
      '7':   { capability: 'unknown' },
      '9':   { capability: 'measure_temperature', divisor: 10 },
      '10':  { capability: 'measure_humidity' },
      '13':  { capability: 'measure_battery' },
      '15':  { capability: 'unknown' },
      '101': { capability: 'unknown' },
      '102': { capability: 'unknown' },
      '103': { capability: 'unknown' },
      '104': { capability: 'unknown' },
    };
  }

  async onInit() {
    await super.onInit();
    for (const cap of ['measure_temperature', 'measure_humidity', 'measure_battery']) {
      if (!this.hasCapability(cap)) {
        try { await this.addCapability(cap); } catch (e) { /* optional */ }
      }
    }
    this.log('[WIFI-SIREN] Ready');
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

module.exports = WiFiSirenDevice;
