'use strict';
const TuyaLocalDevice = require('../../lib/tuya-local/TuyaLocalDevice');

class WiFiRobotVacuumDevice extends TuyaLocalDevice {
  get dpMappings() {
    return {
      '1':  { capability: 'onoff', writable: true, transform: (v) => !!v, reverseTransform: (v) => !!v },
      '2':  { capability: 'unknown' },
      '3':  { capability: 'vacuumcleaner_state',
        transform: (v) => {
          const map = { standby: 'stopped', cleaning: 'cleaning', paused: 'stopped',
            goto_charge: 'docked', charging: 'docked', charged: 'docked',
            sleep: 'stopped', fault: 'stopped' };
          return map[v] || 'stopped';
        } },
      '4':  { capability: 'unknown' },
      '5':  { capability: 'unknown' },
      '6':  { capability: 'measure_battery' },
      '11': { capability: 'unknown' },
      '14': { capability: 'unknown' },
      '15': { capability: 'unknown' },
      '16': { capability: 'unknown' },
      '17': { capability: 'unknown' },
      '25': { capability: 'unknown' },
      '26': { capability: 'unknown' },
      '27': { capability: 'unknown' },
      '28': { capability: 'unknown' },
    };
  }

  async onInit() {
    await super.onInit();
    if (!this.hasCapability('measure_battery')) {
      try { await this.addCapability('measure_battery'); } catch (e) { /* optional */ }
    }
    this.log('[WIFI-ROBOT-VACUUM] Ready');
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

module.exports = WiFiRobotVacuumDevice;
