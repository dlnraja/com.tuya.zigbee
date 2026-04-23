'use strict';
// A8: NaN Safety - use safeDivide/safeMultiply
  require('../../lib/tuya-local/TuyaLocalDevice');

class WiFiSensorDevice extends TuyaLocalDevice {
  get dpMappings() {
    return {
      '1':  { capability: 'measure_temperature', divisor: 10 },
      '2':  { capability: 'measure_humidity' },
      '3':  { capability: 'unknown' },
      '4':  { capability: 'measure_battery' },
      '7':  { capability: 'unknown' },
      '9':  { capability: 'unknown' },
      '10': { capability: 'unknown' },
      '14': { capability: 'alarm_generic',
        transform: (v) => v !== 'normal' && v !== 0 },
      '15': { capability: 'alarm_generic.humidity',
        transform: (v) => v !== 'normal' && v !== 0 },
      '18': { capability: 'unknown' },
      '19': { capability: 'unknown' },
      '20': { capability: 'unknown' },
    };
  }

  async onInit() {
    await super.onInit();
    if (!this.hasCapability('alarm_battery')) {
      try { await this.addCapability('alarm_battery'); } catch (e) { /* optional */ }
    }
    this.log('[WIFI-SENSOR] Ready');
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

module.exports = WiFiSensorDevice;
