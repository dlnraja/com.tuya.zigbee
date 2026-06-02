'use strict';

const { UnifiedSensorBase } = require('../../lib/devices/UnifiedSensorBase');

class BedSensorDevice extends UnifiedSensorBase {

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[BED] Bed Sensor initializing...');

    this._setupDPListeners();
  }

  _setupDPListeners() {
    // DP1: Occupancy (0=vacant, 1=occupied)
    // DP3: Battery percentage
    const dpMappings = {
      1: { capability: 'alarm_contact', converter: (v) => !!v },
      3: { capability: 'measure_battery', converter: (v) => v },
    };

    if (this._dpMappings) {
      Object.assign(this._dpMappings, dpMappings);
    } else {
      this._dpMappings = dpMappings;
    }

    this.log('[BED] DP mappings configured', Object.keys(dpMappings).length);
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
