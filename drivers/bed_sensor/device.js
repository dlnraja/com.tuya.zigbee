'use strict';

const { UnifiedSensorBase } = require('../../lib/devices/UnifiedSensorBase');
const BatteryCalculator = require('../../lib/battery/BatteryCalculator');

/**
 * Bed Sensor Device — SDK3 Compliant
 *
 * DP mappings per Z2M PR #11584:
 *   DP1   = presence     (trueFalse0: 0=occupied, 1=unoccupied)
 *   DP4   = battery      (raw percentage, CR2032)
 *   DP9   = sensitivity  (enum writable: 0=low, 1=middle, 2=high)
 *   DP12  = pressure     (raw 0-10000)
 *   DP101 = interval_time   (sampling interval, 5-720 min, writable)
 *   DP102 = presence_delay  (delay to report unoccupied, 0-3600 s, writable)
 *   DP103 = presence_time   (delay to report occupied, 0-3600 s, writable)
 *   DP104 = work_state      (READ-ONLY enum — NOT battery!)
 *
 * @version 8.2.0 — Full SDK3 compliance rewrite
 */
class BedSensorDevice extends UnifiedSensorBase {

  // ─── Battery Configuration ────────────────────────────────────────────
  // Bed sensor uses DP4 for battery (not DP15 default).
  // DIRECT algorithm: raw DP value = percentage (no conversion needed).
  get batteryConfig() {
    return {
      chemistry: BatteryCalculator.CHEMISTRY.CR2032,
      algorithm: BatteryCalculator.ALGORITHM.DIRECT,
      dpId: 4,
      dpIdState: null,
      voltageMin: 2.0,
      voltageMax: 3.0,
    };
  }

  // ─── Tuya DP Mode ────────────────────────────────────────────────────
  // Battery devices MUST keep Tuya DP mode active.
  // Without these, Tuya mode deactivates after learning phase → no data received.
  get forceActiveTuyaMode() { return true; }
  get hybridModeEnabled() { return true; }

  // ─── Sensor Capabilities ──────────────────────────────────────────────
  // Bed sensor has NO temperature, humidity, or luminance.
  // SDK3 Rule AO: NEVER combine measure_battery + alarm_battery on same device.
  // UnifiedBatteryHandler adapts at runtime to keep only the appropriate one.
  get sensorCapabilities() {
    return ['alarm_contact', 'measure_battery', 'measure_pressure'];
  }

  // ─── DP Mappings ──────────────────────────────────────────────────────
  // DP4 battery is handled by batteryConfig (parent class _handleBatteryDP),
  // so it is NOT listed in dpMappings to avoid double-processing.
  get dpMappings() {
    return {
      1: { capability: 'alarm_contact', transform: (v) => (v !== 0 && v !== false) },
      12: { capability: 'measure_pressure', divisor: 1 },
      // Writable settings DPs (no capability, internal only)
      9: { capability: null, internal: 'sensitivity', writable: true },
      101: { capability: null, internal: 'interval_time', writable: true },
      102: { capability: null, internal: 'presence_delay', writable: true },
      103: { capability: null, internal: 'presence_time', writable: true },
      // DP104 REMOVED — it's work_state (read-only enum), NOT battery!
    };
  }

  // ─── Initialization ───────────────────────────────────────────────────
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[BedSensor] Initializing...');

    // Remove bogus capabilities that may have been inherited from parent class
    for (const cap of ['measure_temperature', 'measure_humidity', 'measure_luminance']) {
      if (this.hasCapability(cap)) {
        await this.removeCapability(cap).catch(() => {});
        this.log(`[BedSensor] Removed inherited ${cap} capability`);
      }
    }

    // Force TuyaEF00Manager initialization if not already done.
    // Battery devices may not have the Tuya cluster detected during interview.
    // NOTE: Do NOT add dpReport listener here — parent UnifiedSensorBase already
    // has one (line 2018) that calls _handleDP. Our _handleDP override handles
    // _lastDPReceived tracking.
    if (!this.tuyaEF00Manager) {
      this.log('[BedSensor] TuyaEF00Manager not initialized — forcing...');
      try {
        const { TuyaEF00Manager } = require('../../lib/tuya/TuyaEF00Manager');
        this.tuyaEF00Manager = new TuyaEF00Manager(this);
        const initialized = await this.tuyaEF00Manager.initialize(this.zclNode);
        if (initialized) {
          this.log('[BedSensor] TuyaEF00Manager initialized successfully');
        } else {
          this.log('[BedSensor] TuyaEF00Manager failed to initialize');
        }
      } catch (e) {
        this.log('[BedSensor] TuyaEF00Manager init error:', e.message);
      }
    }

    // Z2M/ZHA Pattern: Send initial data query immediately after init.
    // Battery-powered Tuya devices (receiveWhenIdle=false) do NOT send data
    // spontaneously. They must be queried. ZHA calls this "spell_data_query".
    // Without this, the device pairs but never reports any DP values.
    // NOTE: requestDP takes a SINGLE dp, not an array!
    this.homey.setTimeout(async () => {
      if (this._destroyed) return;
      try {
        if (this.tuyaEF00Manager) {
          this.log('[BedSensor] Sending initial DP query (spell_data_query)...');
          for (const dp of [1, 4, 12]) {
            await this.tuyaEF00Manager.requestDP(dp).catch(() => {});
          }
        }
      } catch (e) {
        this.log('[BedSensor] Initial query error:', e.message);
      }
    }, 3000); // 3s delay to allow cluster binding to complete

    // Periodic DP poll as fallback for devices that don't respond to initial query.
    // Uses this.homey.setInterval() for proper SDK3 lifecycle management.
    this._pollInterval = this.homey.setInterval(async () => {
      try {
        if (this._destroyed) return;
        if (this.tuyaEF00Manager && !this._lastDPReceived) {
          this.log('[BedSensor] Polling for DP data...');
          for (const dp of [1, 4, 12]) {
            await this.tuyaEF00Manager.requestDP(dp).catch(() => {});
          }
        }
      } catch (e) {
        this.log('[BedSensor] Poll error:', e.message);
      }
    }, 30000);
  }

  // ─── Settings Handler ─────────────────────────────────────────────────
  // DP9 = sensitivity (enum), DP101 = interval_time (min),
  // DP102 = presence_delay (s), DP103 = presence_time (s)
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    if (this._destroyed) return;

    const BED_KEYS = ['sensitivity', 'interval_time', 'presence_delay', 'presence_time'];
    const superKeys = changedKeys.filter((k) => !BED_KEYS.includes(k));

    if (superKeys.length > 0) {
      await super.onSettings({ oldSettings, newSettings, changedKeys: superKeys });
    }

    const dpWrites = {
      sensitivity: { dp: 9, type: 'enum' },
      interval_time: { dp: 101, type: 'value' },
      presence_delay: { dp: 102, type: 'value' },
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

      this.log(`[BedSensor] Setting ${key} (DP${mapping.dp}) to`, value);
      try {
        if (this.tuyaEF00Manager) {
          // sendTuyaDP(dp, dpType, value) — dpType: 0=raw, 1=bool, 2=value, 4=enum
          const dpTypeMap = { enum: 4, value: 2 };
          await this.tuyaEF00Manager.sendTuyaDP(mapping.dp, dpTypeMap[mapping.type] || 2, value);
          this.log(`[BedSensor] ${key} written successfully`);
        } else {
          this.log(`[BedSensor] tuyaEF00Manager not available for DP${mapping.dp} write`);
        }
      } catch (err) {
        this.log(`[BedSensor] Error writing ${key} (DP${mapping.dp}):`, err.message);
      }
    }
  }

  // ─── DP Data Tracking ─────────────────────────────────────────────────
  // Override to track when DP data arrives, so polling can stop.
  _handleDP(dpId, value) {
    this._lastDPReceived = true;
    return super._handleDP(dpId, value);
  }

  // ─── Lifecycle Cleanup ────────────────────────────────────────────────
  // SDK3 Rule: All intervals/timeouts MUST be cleared in onUninit/onDeleted.
  // _destroyed guard prevents capability updates after destruction.
  async onUninit() {
    this._destroyed = true;
    if (this._pollInterval) {
      this._pollInterval.clear();
      this._pollInterval = null;
    }
    this.log('[BedSensor] Uninitialized');
    await super.onUninit();
  }

  async onDeleted() {
    this._destroyed = true;
    if (this._pollInterval) {
      this._pollInterval.clear();
      this._pollInterval = null;
    }
    this.log('[BedSensor] Deleted');
    await super.onDeleted();
  }
}

module.exports = BedSensorDevice;
