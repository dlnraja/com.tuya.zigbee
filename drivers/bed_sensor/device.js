'use strict';

const { UnifiedSensorBase } = require('../../lib/devices/UnifiedSensorBase');

class BedSensorDevice extends UnifiedSensorBase {

  // v8.1.129: Override sensorCapabilities — bed sensor has NO temperature/humidity
  get sensorCapabilities() {
    return ['alarm_contact', 'measure_battery', 'alarm_battery', 'measure_pressure'];
  }

  get dpMappings() {
    // v8.1.129: FIX #328 #378 — Complete DP remap per Z2M reference
    // github.com/Koenkk/zigbee2mqtt/issues/31079
    // Z2M uses trueFalse0: DP1=0 → occupied, DP1=1 → unoccupied
    // Homey alarm_contact: true = "contact open" = unoccupied
    // So DP1=1 (unoccupied) → alarm_contact=true ✓
    //    DP1=0 (occupied)  → alarm_contact=false ✓
    return {
      1: { capability: 'alarm_contact', transform: (v) => (v !== 0 && v !== false) },
      4: { capability: 'measure_battery', transform: (v) => Math.min(100, Math.max(0, v)) },
      12: { capability: 'measure_pressure', transform: (v) => v },
      9: { capability: null, internal: 'sensitivity', writable: true },
      101: { capability: null, internal: 'interval_time', writable: true },
      102: { capability: null, internal: 'pir_delay', writable: true },
      103: { capability: null, internal: 'presence_time', writable: true },
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
    // v8.1.127: FIX #378 - Filter bed-specific keys before super.onSettings()
    // The base class maps 'sensitivity' to DP2 (value), but bed sensor uses DP9 (enum).
    const BED_KEYS = ['sensitivity', 'interval_time', 'pir_delay', 'presence_time'];
    const superKeys = changedKeys.filter(k => !BED_KEYS.includes(k));

    if (superKeys.length > 0) {
      await super.onSettings({ oldSettings, newSettings, changedKeys: superKeys });
    }

    // DP writes per Z2M reference (github.com/Koenkk/zigbee2mqtt/issues/31079)
    // DP9 = sensitivity (enum), DP101 = interval_time (min), DP102 = pir_delay (s), DP103 = presence_time (s)
    const dpWrites = {
      sensitivity: { dp: 9, type: 'enum' },
      interval_time: { dp: 101, type: 'value' },
      pir_delay: { dp: 102, type: 'value' },
      presence_time: { dp: 103, type: 'value' },
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
