'use strict';

const { UnifiedSensorBase } = require('../../lib/devices/UnifiedSensorBase');

class BedSensorDevice extends UnifiedSensorBase {

  // v8.1.129: Override sensorCapabilities — bed sensor has NO temperature/humidity
  get sensorCapabilities() {
    return ['alarm_contact', 'measure_battery', 'alarm_battery', 'measure_pressure'];
  }

  get dpMappings() {
    // v8.1.145: CORRECTED per Z2M PR #11584 (github.com/Koenkk/zigbee-herdsman-converters/pull/11584)
    // DP1 = occupancy (trueFalse0: 0=occupied, 1=unoccupied)
    // DP4 = battery (raw %)
    // DP9 = sensitivity (enum: 0=low, 1=middle, 2=high)
    // DP12 = illuminance (raw lux, 0-10000)
    // DP101 = interval_time (sampling interval, minutes)
    // DP102 = presence_delay (delay to report no presence, seconds)
    // DP104 = work_state (READ-ONLY enum, NOT battery!)
    // DP103 does NOT exist in Z2M definition
    return {
      1: { capability: 'alarm_contact', transform: (v) => (v !== 0 && v !== false) },
      4: { capability: 'measure_battery', transform: (v) => Math.min(100, Math.max(0, v)) },
      12: { capability: 'measure_pressure', transform: (v) => v },
      9: { capability: null, internal: 'sensitivity', writable: true },
      101: { capability: null, internal: 'interval_time', writable: true },
      102: { capability: null, internal: 'presence_delay', writable: true },
      // DP103 REMOVED — does not exist in Z2M definition for _TZE200_seq9cm6u
      // DP104 REMOVED — it's work_state (read-only), NOT battery!
    };
  }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[BED] Bed Sensor initializing...');

    // v8.1.129: Remove ALL bogus capabilities (bed sensor has no temp/humidity)
    for (const cap of ['measure_temperature', 'measure_humidity', 'measure_luminance']) {
      if (this.hasCapability(cap)) {
        await this.removeCapability(cap).catch(() => {});
        this.log(`[BED] Removed bogus ${cap} capability`);
      }
    }
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    // v8.1.145: Corrected DP writes per Z2M PR #11584
    // DP9 = sensitivity (enum), DP101 = interval_time (min), DP102 = presence_delay (s)
    const BED_KEYS = ['sensitivity', 'interval_time', 'presence_delay'];
    const superKeys = changedKeys.filter(k => !BED_KEYS.includes(k));

    if (superKeys.length > 0) {
      await super.onSettings({ oldSettings, newSettings, changedKeys: superKeys });
    }

    const dpWrites = {
      sensitivity: { dp: 9, type: 'enum' },
      interval_time: { dp: 101, type: 'value' },
      presence_delay: { dp: 102, type: 'value' },
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
      try {
        if (this.tuyaEF00Manager) {
          await this.tuyaEF00Manager.sendDP(mapping.dp, value, mapping.type);
          this.log(`[BED] ✅ ${key} written successfully`);
        } else {
          this.log(`[BED] ⚠️ tuyaEF00Manager not available for DP${mapping.dp} write`);
        }
      } catch (err) {
        this.log(`[BED] ❌ Error writing ${key} (DP${mapping.dp}):`, err.message);
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
