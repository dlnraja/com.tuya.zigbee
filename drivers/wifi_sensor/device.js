'use strict';
const TuyaLocalDevice = require('../../lib/tuya-local/TuyaLocalDevice');

class WiFiSensorDevice extends TuyaLocalDevice {
  get dpMappings() {
    return {
      '1':  { capability: 'measure_temperature', divisor: 10 },
      '2':  { capability: 'measure_humidity' },
      '3':  { capability: null },
      '4':  { capability: 'measure_battery' },
      '7':  { capability: null },
      '9':  { capability: null },
      '10': { capability: null },
      '14': { capability: 'alarm_generic',
        transform: (v) => v !== 'normal' && v !== 0 },
      '15': { capability: 'alarm_generic.humidity',
        transform: (v) => v !== 'normal' && v !== 0 },
      '18': { capability: null },
      '19': { capability: null },
      '20': { capability: null },
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
