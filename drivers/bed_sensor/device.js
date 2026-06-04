'use strict';

const { UnifiedSensorBase } = require('../../lib/devices/UnifiedSensorBase');

class BedSensorDevice extends UnifiedSensorBase {

  get dpMappings() {
    return {
      1: { capability: 'alarm_contact', transform: (v) => v === 0 },
      4: { capability: 'measure_battery', transform: (v) => Math.min(100, Math.max(0, v)) },
      104: { capability: 'alarm_contact', transform: (v) => {
        // DP104: Binary occupancy sensor → true/1 = occupied (alarm ON), false/0 = unoccupied
        if (v === 1 || v === true) return true;
        if (v === 0 || v === false) return false;
        return !!v;
      }},
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
    
    const dpWrites = {
      sensitivity: { dp: 9 },
      sampling_interval: { dp: 101 },
      delay_unoccupied: { dp: 102 },
      delay_occupied: { dp: 103 }
    };

    for (const key of changedKeys) {
      const mapping = dpWrites[key];
      if (!mapping) continue;
      
      const value = parseInt(newSettings[key], 10);
      this.log(`[BED] Setting ${key} (DP${mapping.dp}) to`, value);
      if (this.tuyaEF00Manager) {
        await this.tuyaEF00Manager.sendDP(mapping.dp, value, 'value');
      } else {
        this.log(`[BED] WARNING: tuyaEF00Manager not available for DP${mapping.dp} write`);
      }
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
