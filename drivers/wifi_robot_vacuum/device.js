'use strict';
const TuyaLocalDevice = require('../../lib/tuya-local/TuyaLocalDevice');

class WiFiRobotVacuumDevice extends TuyaLocalDevice {
  get dpMappings() {
    return {
      '1':  { capability: 'onoff', writable: true, transform: (v) => !!v, reverseTransform: (v) => !!v },
      '2':  { capability },
      '3':  { capability: 'vacuumcleaner_state',
        transform: (v) => {
          const map = { standby: 'stopped', cleaning: 'cleaning', paused: 'stopped',
            goto_charge: 'docked', charging: 'docked', charged: 'docked',
            sleep: 'stopped', fault: 'stopped' };
          return map[v] || 'stopped';
        } },
      '4':  { capability },
      '5':  { capability },
      '6':  { capability: 'measure_battery' },
      '11': { capability },
      '14': { capability },
      '15': { capability },
      '16': { capability },
      '17': { capability },
      '25': { capability },
      '26': { capability },
      '27': { capability },
      '28': { capability },
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
