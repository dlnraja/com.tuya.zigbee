'use strict';

const { UnifiedSensorBase } = require('../../lib/devices/UnifiedSensorBase');

class BedSensorDevice extends UnifiedSensorBase {

  get dpMappings() {
    return {
      1: { capability: 'alarm_contact', transform: (v) => v === 0 },
      4: { capability: 'measure_battery', transform: (v) => v },
      104: { capability: 'measure_battery', transform: (v) => v === 1 ? 100 : 0 },
      12: { capability: 'measure_pressure', transform: (v) => v },
      9: { capability: null, internal: 'sensitivity', writable: true },
      101: { capability: null, internal: 'sampling_interval', writable: true },
      102: { capability: null, internal: 'delay_unoccupied', writable: true },
      103: { capability: null, internal: 'delay_occupied', writable: true }
    };
  }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[BED] Bed Sensor initializing...');
    
    if (this.hasCapability('measure_temperature')) {
      await this.removeCapability('measure_temperature').catch(() => {});
      this.log('[BED] Removed bogus measure_temperature capability');
    }
    if (this.hasCapability('measure_humidity')) {
      await this.removeCapability('measure_humidity').catch(() => {});
      this.log('[BED] Removed bogus measure_humidity capability');
    }
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    await super.onSettings({ oldSettings, newSettings, changedKeys });
    
    if (changedKeys.includes('sensitivity')) {
      const value = parseInt(newSettings.sensitivity, 10);
      this.log('[BED] Setting sensitivity to', value);
      await this.writeDataPoint(9, value);
    }
  }

  async onUninit() {
    this.log('[BED] Bed Sensor uninitialized');
    await super.onUninit();
  }

  async onDeleted() {
    this.log('[BED] Bed Sensor deleted');
    await super.onDeleted();
  }
}

module.exports = BedSensorDevice;
