'use strict';

const { UnifiedSensorBase } = require('../../lib/devices/UnifiedSensorBase');

class BedSensorDevice extends UnifiedSensorBase {

  get dpMappings() {
    // v8.1.117: FIX #371 - Corrected DP mapping for _TZE200_seq9cm6u bed sensor
    // - DP101 was incorrectly mapped to measure_battery (caused DP104/DP4 collision → battery stuck at 1%)
    // - DP104 mapped to alarm_battery instead of measure_battery to avoid collision with DP4
    // - DP1 alarm_contact logic: sensor sends 1=occupied, 0=unoccupied
    //   Homey alarm_contact=true means "contact open" (unoccupied), so we invert
    return {
      1: { capability: 'alarm_contact', transform: (v) => (v === 0 || v === false) },
      4: { capability: 'measure_battery', transform: (v) => Math.min(100, Math.max(0, v)) },
      104: { capability: 'alarm_battery', transform: (v) => (v === 0 || v === false) },
      12: { capability: 'measure_pressure', transform: (v) => v },
      9: { capability: null, internal: 'sensitivity', writable: true },
      101: { capability: null, internal: 'delay_unoccupied', writable: true },
      102: { capability: null, internal: 'delay_occupied', writable: true },
      103: { capability: null, internal: 'config', writable: true }
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
    
    // v8.1.117: FIX #371 - Corrected DP numbers per Z2M reference
    // DP9 = sensitivity (enum), DP101 = pir_delay (unoccupied), DP102 = presence_time (occupied)
    const dpWrites = {
      sensitivity: { dp: 9 },
      delay_unoccupied: { dp: 101 },
      delay_occupied: { dp: 102 }
    };

    for (const key of changedKeys) {
      const mapping = dpWrites[key];
      if (!mapping) continue;
      
      let value = newSettings[key];
      if (key === 'sensitivity') {
        const valMap = { low: 0, middle: 1, high: 2, '0': 0, '1': 1, '2': 2 };
        value = valMap[value] !== undefined ? valMap[value] : parseInt(value, 10);
      } else {
        value = parseInt(value, 10);
      }

      this.log(`[BED] Setting ${key} (DP${mapping.dp}) to`, value);
      if (this.tuyaEF00Manager) {
        const type = key === 'sensitivity' ? 'enum' : 'value';
        await this.tuyaEF00Manager.sendDP(mapping.dp, value, type);
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
