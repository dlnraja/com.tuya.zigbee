'use strict';

const { UnifiedSensorBase } = require('../../lib/devices/UnifiedSensorBase');
const BatteryCalculator = require('../../lib/battery/BatteryCalculator');

/**
 * Bed Sensor Device — SDK3 Compliant with Per-MFR Auto-Adaptation
 *
 * Supports multiple manufacturer variants with DIFFERENT protocols:
 * - _TZE200_seq9cm6u: Tuya DP bed pressure sensor (confirmed Z2M)
 * - _TZE200_sh11h1f5: Tuya DP bed pressure sensor (inferred, same DP layout)
 * - _TYZB01_* / TUYATEC-*: ZCL PIR motion sensors (IAS Zone, NOT Tuya DP)
 *
 * The driver auto-detects the protocol based on manufacturer name and
 * applies the correct DP mappings, battery handling, and inversion logic.
 *
 * @version 8.3.0 — Per-MFR auto-adaptation
 */
class BedSensorDevice extends UnifiedSensorBase {

  // ═══════════════════════════════════════════════════════════════════════
  // PER-MFR CONFIGURATION MAP
  // Each MFR has its own protocol, DP layout, battery format, and quirks.
  // The driver detects the MFR at init and applies the correct config.
  // ═══════════════════════════════════════════════════════════════════════

  static get MFR_CONFIGS() {
    return {
      // ─── Tuya DP Bed Pressure Sensors ────────────────────────────────
      // Confirmed via Z2M zigbee-herdsman-converters source code
      '_TZE200_seq9cm6u': {
        protocol: 'tuya_dp',
        description: 'Tuya DP Bed Pressure Sensor (Z2M confirmed)',
        // Z2M tuyaDatapoints: [DP, name, converter]
        dpMappings: {
          1:   { capability: 'alarm_contact', transform: (v) => (v === 0 || v === false) }, // trueFalse0
          4:   { capability: 'measure_battery', divisor: 1 }, // raw 0-100%
          9:   { capability: null, internal: 'sensitivity', writable: true },
          12:  { capability: 'measure_luminance', divisor: 1 }, // Z2M calls it "illuminance"
          101: { capability: null, internal: 'interval_time', writable: true },
          102: { capability: null, internal: 'presence_delay', writable: true },
          103: { capability: null, internal: 'presence_time', writable: true },
          104: { capability: null, internal: 'work_state' }, // READ-ONLY enum, NOT battery
        },
        batteryConfig: {
          chemistry: BatteryCalculator.CHEMISTRY.CR2032,
          algorithm: BatteryCalculator.ALGORITHM.DIRECT,
          dpId: 4,
          dpIdState: null,
          voltageMin: 2.0,
          voltageMax: 3.0,
        },
        sensorCapabilities: ['alarm_contact', 'measure_battery', 'measure_luminance'],
        forceActiveTuyaMode: true,
        hybridModeEnabled: true,
        pollDPs: [1, 4, 12],
      },

      // Inferred same DP layout as seq9cm6u (NOT confirmed in Z2M)
      '_TZE200_sh11h1f5': {
        protocol: 'tuya_dp',
        description: 'Tuya DP Bed Pressure Sensor (inferred)',
        dpMappings: {
          1:   { capability: 'alarm_contact', transform: (v) => (v === 0 || v === false) },
          4:   { capability: 'measure_battery', divisor: 1 },
          9:   { capability: null, internal: 'sensitivity', writable: true },
          12:  { capability: 'measure_luminance', divisor: 1 },
          101: { capability: null, internal: 'interval_time', writable: true },
          102: { capability: null, internal: 'presence_delay', writable: true },
          103: { capability: null, internal: 'presence_time', writable: true },
          104: { capability: null, internal: 'work_state' },
        },
        batteryConfig: {
          chemistry: BatteryCalculator.CHEMISTRY.CR2032,
          algorithm: BatteryCalculator.ALGORITHM.DIRECT,
          dpId: 4,
          dpIdState: null,
          voltageMin: 2.0,
          voltageMax: 3.0,
        },
        sensorCapabilities: ['alarm_contact', 'measure_battery', 'measure_luminance'],
        forceActiveTuyaMode: true,
        hybridModeEnabled: true,
        pollDPs: [1, 4, 12],
      },

      // ─── ZCL PIR Motion Sensors (NOT bed sensors!) ──────────────────
      // These use IAS Zone cluster for occupancy + genPowerCfg for battery.
      // They are PIR sensors that happen to be in the bed_sensor driver
      // due to broad productId matching (TS0202, RH3040).
      // Protocol: Standard ZCL, NO Tuya DP.
      '_TYZB01_dl7cejts': {
        protocol: 'zcl_ias',
        description: 'ZCL PIR Motion Sensor (NOT bed sensor)',
        dpMappings: {}, // No Tuya DPs — uses ZCL clusters
        batteryConfig: null, // Battery via ZCL genPowerCfg, not Tuya DP
        sensorCapabilities: ['alarm_motion', 'measure_battery'],
        forceActiveTuyaMode: false,
        hybridModeEnabled: false,
        pollDPs: [], // No Tuya DPs to poll
      },
      '_TYZB01_dr6sduka': {
        protocol: 'zcl_ias',
        description: 'ZCL PIR Motion Sensor (NOT bed sensor)',
        dpMappings: {},
        batteryConfig: null,
        sensorCapabilities: ['alarm_motion', 'measure_battery'],
        forceActiveTuyaMode: false,
        hybridModeEnabled: false,
        pollDPs: [],
      },
      '_TYZB01_geepvxsy': {
        protocol: 'zcl_ias',
        description: 'ZCL PIR Motion Sensor (NOT bed sensor)',
        dpMappings: {},
        batteryConfig: null,
        sensorCapabilities: ['alarm_motion', 'measure_battery'],
        forceActiveTuyaMode: false,
        hybridModeEnabled: false,
        pollDPs: [],
      },

      // ─── TUYATEC PIR Sensors ────────────────────────────────────────
      'TUYATEC-B5G40ALM': {
        protocol: 'zcl_ias',
        description: 'TUYATEC PIR Motion Sensor (NOT bed sensor)',
        dpMappings: {},
        batteryConfig: null,
        sensorCapabilities: ['alarm_motion', 'measure_battery'],
        forceActiveTuyaMode: false,
        hybridModeEnabled: false,
        pollDPs: [],
      },
      'TUYATEC-53O41JOC': {
        protocol: 'zcl_ias',
        description: 'TUYATEC PIR Motion Sensor (NOT bed sensor)',
        dpMappings: {},
        batteryConfig: null,
        sensorCapabilities: ['alarm_motion', 'measure_battery'],
        forceActiveTuyaMode: false,
        hybridModeEnabled: false,
        pollDPs: [],
      },
      // Additional TUYATEC PIR sensors (ZCL IAS, not Tuya DP)
      'TUYATEC-BD5FAF9P': { protocol: 'zcl_ias', description: 'TUYATEC PIR Motion Sensor', dpMappings: {}, batteryConfig: null, sensorCapabilities: ['alarm_motion', 'measure_battery'], forceActiveTuyaMode: false, hybridModeEnabled: false, pollDPs: [] },
      'TUYATEC-DEETIBST': { protocol: 'zcl_ias', description: 'TUYATEC PIR Motion Sensor', dpMappings: {}, batteryConfig: null, sensorCapabilities: ['alarm_motion', 'measure_battery'], forceActiveTuyaMode: false, hybridModeEnabled: false, pollDPs: [] },
      'TUYATEC-DGTXMIHE': { protocol: 'zcl_ias', description: 'TUYATEC PIR Motion Sensor', dpMappings: {}, batteryConfig: null, sensorCapabilities: ['alarm_motion', 'measure_battery'], forceActiveTuyaMode: false, hybridModeEnabled: false, pollDPs: [] },
      'TUYATEC-DXNOHKPD': { protocol: 'zcl_ias', description: 'TUYATEC PIR Motion Sensor', dpMappings: {}, batteryConfig: null, sensorCapabilities: ['alarm_motion', 'measure_battery'], forceActiveTuyaMode: false, hybridModeEnabled: false, pollDPs: [] },
      'TUYATEC-LHA8PBWD': { protocol: 'zcl_ias', description: 'TUYATEC PIR Motion Sensor', dpMappings: {}, batteryConfig: null, sensorCapabilities: ['alarm_motion', 'measure_battery'], forceActiveTuyaMode: false, hybridModeEnabled: false, pollDPs: [] },
      'TUYATEC-ZN9WYQTR': { protocol: 'zcl_ias', description: 'TUYATEC PIR Motion Sensor', dpMappings: {}, batteryConfig: null, sensorCapabilities: ['alarm_motion', 'measure_battery'], forceActiveTuyaMode: false, hybridModeEnabled: false, pollDPs: [] },
      'TUYATEC-ZW6HXAFZ': { protocol: 'zcl_ias', description: 'TUYATEC PIR Motion Sensor', dpMappings: {}, batteryConfig: null, sensorCapabilities: ['alarm_motion', 'measure_battery'], forceActiveTuyaMode: false, hybridModeEnabled: false, pollDPs: [] },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // AUTO-DETECT MFR AND APPLY CONFIG
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Get the MFR-specific configuration for this device.
   * Falls back to default Tuya DP config if MFR not in map.
   */
  _getMFRConfig() {
    const mfr = (this.getSetting?.('zb_manufacturer_name') || '').toLowerCase();
    const configs = BedSensorDevice.MFR_CONFIGS;

    // Direct match
    if (configs[mfr]) {
      this.log(`[BedSensor] MFR config: ${configs[mfr].description}`);
      return configs[mfr];
    }

    // Partial match (some MFRs have case variants)
    for (const [key, config] of Object.entries(configs)) {
      if (mfr.includes(key.toLowerCase().replace(/^_/, ''))) {
        this.log(`[BedSensor] MFR config (partial): ${config.description}`);
        return config;
      }
    }

    // Default: assume Tuya DP bed sensor with standard layout
    this.log(`[BedSensor] No specific MFR config for "${mfr}" — using default Tuya DP layout`);
    return configs['_TZE200_seq9cm6u']; // Safe default
  }

  // ═══════════════════════════════════════════════════════════════════════
  // DYNAMIC GETTERS (delegate to MFR config)
  // ═══════════════════════════════════════════════════════════════════════

  get batteryConfig() {
    return this._mfrConfig?.batteryConfig || {
      chemistry: BatteryCalculator.CHEMISTRY.CR2032,
      algorithm: BatteryCalculator.ALGORITHM.DIRECT,
      dpId: 4,
      dpIdState: null,
      voltageMin: 2.0,
      voltageMax: 3.0,
    };
  }

  get forceActiveTuyaMode() {
    return this._mfrConfig?.forceActiveTuyaMode ?? true;
  }

  get hybridModeEnabled() {
    return this._mfrConfig?.hybridModeEnabled ?? true;
  }

  get sensorCapabilities() {
    return this._mfrConfig?.sensorCapabilities || ['alarm_contact', 'measure_battery', 'measure_luminance'];
  }

  get dpMappings() {
    return this._mfrConfig?.dpMappings || {
      1:   { capability: 'alarm_contact', transform: (v) => (v === 0 || v === false) },
      4:   { capability: 'measure_battery', divisor: 1 },
      12:  { capability: 'measure_luminance', divisor: 1 },
      9:   { capability: null, internal: 'sensitivity', writable: true },
      101: { capability: null, internal: 'interval_time', writable: true },
      102: { capability: null, internal: 'presence_delay', writable: true },
      103: { capability: null, internal: 'presence_time', writable: true },
      104: { capability: null, internal: 'work_state' },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════

  async onNodeInit({ zclNode }) {
    this._destroyed = false;

    // Detect MFR and load config BEFORE super.onNodeInit
    this._mfrConfig = this._getMFRConfig();
    this.log(`[BedSensor] Protocol: ${this._mfrConfig.protocol}`);
    this.log(`[BedSensor] ${this._mfrConfig.description}`);

    await super.onNodeInit({ zclNode });

    // Remove bogus capabilities inherited from parent class
    const capsToRemove = ['measure_temperature', 'measure_humidity'];
    for (const cap of capsToRemove) {
      if (this.hasCapability(cap)) {
        await this.removeCapability(cap).catch(() => {});
        this.log(`[BedSensor] Removed inherited ${cap} capability`);
      }
    }

    // ZCL PIR sensors don't need Tuya DP setup — skip Tuya-specific init
    if (this._mfrConfig.protocol === 'zcl_ias') {
      this.log('[BedSensor] ZCL IAS protocol — skipping Tuya DP setup');
      return; // Standard ZCL handling via parent class
    }

    // ─── Tuya DP Path ────────────────────────────────────────────────

    // Force TuyaEF00Manager initialization if not already done
    if (!this.tuyaEF00Manager) {
      this.log('[BedSensor] TuyaEF00Manager not initialized — forcing...');
      try {
        const { TuyaEF00Manager } = require('../../lib/tuya/TuyaEF00Manager');
        this.tuyaEF00Manager = new TuyaEF00Manager(this);
        const initialized = await this.tuyaEF00Manager.initialize(this.zclNode);
        if (initialized) {
          this.log('[BedSensor] TuyaEF00Manager initialized');
        } else {
          this.log('[BedSensor] TuyaEF00Manager failed to initialize');
        }
      } catch (e) {
        this.log('[BedSensor] TuyaEF00Manager init error:', e.message);
      }
    }

    // Send initial data query (Z2M/ZHA "spell_data_query" pattern)
    const pollDPs = this._mfrConfig.pollDPs || [1, 4, 12];
    this.homey.setTimeout(async () => {
      if (this._destroyed) return;
      try {
        if (this.tuyaEF00Manager) {
          this.log(`[BedSensor] Sending initial DP query for DPs: ${pollDPs.join(',')}`);
          for (const dp of pollDPs) {
            await this.tuyaEF00Manager.requestDP(dp).catch(() => {});
          }
        }
      } catch (e) {
        this.log('[BedSensor] Initial query error:', e.message);
      }
    }, 3000);

    // Periodic DP poll as fallback
    this._pollInterval = this.homey.setInterval(async () => {
      try {
        if (this._destroyed) return;
        if (this.tuyaEF00Manager && !this._lastDPReceived) {
          this.log('[BedSensor] Polling for DP data...');
          for (const dp of pollDPs) {
            await this.tuyaEF00Manager.requestDP(dp).catch(() => {});
          }
        }
      } catch (e) {
        this.log('[BedSensor] Poll error:', e.message);
      }
    }, 30000);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SETTINGS HANDLER
  // ═══════════════════════════════════════════════════════════════════════

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    if (this._destroyed) return;

    // ZCL sensors have no writable Tuya DPs
    if (this._mfrConfig?.protocol === 'zcl_ias') {
      await super.onSettings({ oldSettings, newSettings, changedKeys });
      return;
    }

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

      this.log(`[BedSensor] Setting ${key} (DP${mapping.dp}) to ${value} (type: ${mapping.type})`);
      try {
        if (this.tuyaEF00Manager) {
          const result = await this.tuyaEF00Manager.sendDP(mapping.dp, value, mapping.type);
          this.log(`[BedSensor] ${key} write result: ${result}`);
        } else {
          this.log(`[BedSensor] tuyaEF00Manager not available for DP${mapping.dp} write`);
        }
      } catch (err) {
        this.log(`[BedSensor] Error writing ${key} (DP${mapping.dp}):`, err.message);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // DP DATA TRACKING
  // ═══════════════════════════════════════════════════════════════════════

  _handleDP(dpId, value) {
    this._lastDPReceived = true;

    // Log first 3 DPs for diagnostic analysis
    if (!this._dpDiagnosticSent) {
      this._dpDiagnosticReceived = this._dpDiagnosticReceived || {};
      this._dpDiagnosticReceived[dpId] = value;
      const dpCount = Object.keys(this._dpDiagnosticReceived).length;
      if (dpCount >= 3) {
        this._dpDiagnosticSent = true;
        this.log(`[BedSensor] DP DIAGNOSTIC: ${JSON.stringify(this._dpDiagnosticReceived)}`);
      }
    }

    return super._handleDP(dpId, value);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // BATTERY DP4 HANDLER
  // ═══════════════════════════════════════════════════════════════════════

  _handleBatteryDP(dp, value) {
    this.log(`[BedSensor] Battery DP4 raw=${value} (type=${typeof value})`);
    // Some hardware variants send 0 (depleted) or 1 (OK) instead of actual percentage
    if (dp === 4 && typeof value === 'number' && value <= 1) {
      const mapped = value === 0 ? 10 : 100;
      this.log(`[BedSensor] Battery DP4 mapped: ${value} → ${mapped}%`);
      return super._handleBatteryDP(dp, mapped);
    }
    return super._handleBatteryDP(dp, value);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // LIFECYCLE CLEANUP
  // ═══════════════════════════════════════════════════════════════════════

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
