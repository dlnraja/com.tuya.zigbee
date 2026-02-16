'use strict';
const TuyaLocalDevice = require('../../lib/tuya-local/TuyaLocalDevice');

class WiFiRobotVacuumDevice extends TuyaLocalDevice {
  get dpMappings() {
    return {
      '1':  { capability: 'onoff', writable: true, transform: (v) => !!v, reverseTransform: (v) => !!v },
      '2':  { capability: null },
      '3':  { capability: 'vacuumcleaner_state',
        transform: (v) => {
          const map = { standby: 'stopped', cleaning: 'cleaning', paused: 'stopped',
            goto_charge: 'docked', charging: 'docked', charged: 'docked',
            sleep: 'stopped', fault: 'stopped' };
          return map[v] || 'stopped';
        } },
      '4':  { capability: null },
      '5':  { capability: null },
      '6':  { capability: 'measure_battery' },
      '11': { capability: null },
      '14': { capability: null },
      '15': { capability: null },
      '16': { capability: null },
      '17': { capability: null },
      '25': { capability: null },
      '26': { capability: null },
      '27': { capability: null },
      '28': { capability: null },
    };
  }

  async onInit() {
    await super.onInit();
    if (!this.hasCapability('measure_battery')) {
      try { await this.addCapability('measure_battery'); } catch (e) { /* optional */ }
    }
    this.log('[WIFI-ROBOT-VACUUM] Ready');
  }
}

module.exports = WiFiRobotVacuumDevice;
