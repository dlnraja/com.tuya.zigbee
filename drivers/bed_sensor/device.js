'use strict';

const { UnifiedSensorBase } = require('../../lib/devices/UnifiedSensorBase');

class BedSensorDevice extends UnifiedSensorBase {

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[BED] Bed Sensor initializing...');
    
    // Explicitly remove bogus inherited capabilities for temperature/humidity
    if (this.hasCapability('measure_temperature')) {
      await this.removeCapability('measure_temperature').catch(() => {});
      this.log('[BED] Removed bogus measure_temperature capability');
    }
    if (this.hasCapability('measure_humidity')) {
      await this.removeCapability('measure_humidity').catch(() => {});
      this.log('[BED] Removed bogus measure_humidity capability');
    }

    this._setupDPListeners();
  }

  _setupDPListeners() {
    // DP1: Occupancy (Inverted: 0=occupied, 1=vacant)
    // DP4: Battery percentage (not DP3, not DP104)
    // DP12: Pressure (prevent auto-temp fallback)
    const dpMappings = {
      1: { capability: 'alarm_contact', converter: (v) => v === 0 },
      4: { capability: 'measure_battery', converter: (v) => v },
      12: { capability: 'measure_pressure', converter: (v) => v }, // Or map to a custom capability
      // Configuration DPs
      9: { capability: null, internal: 'sensitivity', writable: true },
      101: { capability: null, internal: 'sampling_interval', writable: true },
      102: { capability: null, internal: 'delay_unoccupied', writable: true },
      103: { capability: null, internal: 'delay_occupied', writable: true }
    };

    // Completely overwrite any inherited default mappings (which map DP2 to humidity, etc.)
    this._dpMappings = dpMappings;

    this.log('[BED] DP mappings strictly configured for Bed Sensor:', Object.keys(dpMappings).length);
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    await super.onSettings({ oldSettings, newSettings, changedKeys });
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
