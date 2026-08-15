'use strict';

/**
 * SmartEnergyManager — measured vs estimated energy discovery (P108)
 *
 * Lifecycle:
 *  1. Init: predict candidate energy caps (driver/class/ZCL/DP heuristics).
 *  2. First 5 minutes: observe real DP/ZCL reports; mark telemetry_*_source=direct.
 *  3. After audit: keep caps that reported; allow estimators only for silent caps
 *     on mains devices; never overwrite direct with estimated.
 *  4. Late advertising: if a real value arrives after audit, promote to direct
 *     and rebind UniversalEnergyHandler listeners.
 */

const AdaptiveDataParser = require('../utils/AdaptiveDataParser');
const UniversalEnergyHandler = require('../energy/UniversalEnergyHandler');
const { normalize, equalsIgnoreCase } = require('../utils/TuyaNormalizer');
const { safeSetTimeout, safeClearTimeout } = require('../utils/safe-timers');

const ENERGY_CAPS = ['measure_power', 'measure_voltage', 'measure_current', 'meter_power'];
const AUDIT_MS = 5 * 60 * 1000;

// Energy DPs with their transforms
const ENERGY_DPS = {
  17: { cap: 'measure_power', div: 10, desc: 'Power W' },
  18: { cap: 'measure_current', div: 1000, desc: 'Current A' },
  19: { cap: 'measure_voltage', div: 10, desc: 'Voltage V' },
  20: { cap: 'meter_power', div: 100, desc: 'Energy kWh' },
  101: { cap: 'measure_voltage', div: 10, desc: 'Voltage V' },
  102: { cap: 'measure_current', div: 1000, desc: 'Current mA' },
  103: { cap: 'measure_power', div: 10, desc: 'Power W' },
  104: { cap: 'meter_power', div: 100, desc: 'Energy kWh' },
  105: { cap: 'measure_voltage', div: 10, desc: 'Phase A Voltage' },
  106: { cap: 'measure_current', div: 1000, desc: 'Phase A Current' },
  107: { cap: 'measure_power', div: 1, desc: 'Phase A Power' },
  112: { cap: 'measure_power', div: 10, desc: 'Alt Power' },
  113: { cap: 'measure_current', div: 1000, desc: 'Alt Current' },
  114: { cap: 'measure_voltage', div: 10, desc: 'Alt Voltage' },
  115: { cap: 'meter_power', div: 100, desc: 'Alt Energy' },
  121: { cap: 'measure_power', div: 1, desc: 'Power W direct' },
  122: { cap: 'meter_power', div: 1000, desc: 'Energy Wh' },
};

class SmartEnergyManager {
  constructor(device) {
    this.device = device;
    this._detectedCaps = new Set();
    this._reportedCaps = new Set(); // real traffic observed
    this._candidateCaps = new Set();
    this._firstReportAt = {};
    this._reportCount = {};
    this._divisorCache = {};
    this._auditStartedAt = 0;
    this._auditTimer = null;
    this._auditComplete = false;
    this.universalHandler = null;
  }

  async init() {
    this.device.log('[ENERGY] SmartEnergyManager initializing (5-min real/estimated audit)');

    this.universalHandler = new UniversalEnergyHandler(this.device);
    await this.universalHandler.init().catch((e) => {
      this.device.log('[ENERGY] Universal Handler init failed:', e.message);
    });

    await this._predictCandidateCapabilities();
    this._startAuditWindow();

    this.device.log('[ENERGY] SmartEnergyManager ready | candidates=', [...this._candidateCaps].join(','));
  }

  /**
   * Heuristic: which energy caps this device is likely to support.
   * Does NOT add phantom caps yet — only tracks expectations for the audit.
   */
  async _predictCandidateCapabilities() {
    const d = this.device;
    const driverId = normalize(d.driver?.id || '');
    const cls = normalize(typeof d.getClass === 'function' ? d.getClass() : '');
    const model = normalize(d.getSetting?.('zb_model_id') || '');
    const mfr = normalize(d.getSetting?.('zb_manufacturer_name') || '');

    // Caps already on the device (compose / prior session)
    for (const cap of ENERGY_CAPS) {
      if (this._hasCap(cap)) {this._candidateCaps.add(cap);}
    }

    const looksMeteredPlug = /plug|socket|outlet|energy|meter|din/.test(driverId)
      || /ts011f|ts0121|ts0001_power/.test(model)
      || cls === 'socket';
    const looksSwitchMains = /switch|dimmer|relay|gang/.test(driverId) && d.mainsPowered === true;
    const looksSensorBattery = d.mainsPowered === false
      || /sensor|button|remote|sos|leak|contact|motion|trv|radiator/.test(driverId);

    if (looksSensorBattery && !looksMeteredPlug) {
      // Sensors rarely have real energy — do not candidate-add power caps
      this.device.log('[ENERGY] Heuristic: battery/sensor — skip energy candidates');
      return;
    }

    if (looksMeteredPlug || this._hasZclEnergyClusters()) {
      ENERGY_CAPS.forEach((c) => this._candidateCaps.add(c));
    } else if (looksSwitchMains) {
      // Switches often lack metering hardware — candidates stay empty unless
      // compose already declared caps; estimators may fill later as estimated.
      this.device.log('[ENERGY] Heuristic: mains switch without metering clusters — wait for DP/ZCL advertising');
    }

    // Persist prediction for diagnostics
    await this._setStore('energy_candidates', [...this._candidateCaps]);
    await this._setStore('energy_audit_started_at', Date.now());
  }

  _hasZclEnergyClusters() {
    try {
      const eps = this.device.zclNode?.endpoints || {};
      for (const ep of Object.values(eps)) {
        const clusters = ep?.clusters || {};
        for (const key of Object.keys(clusters)) {
          const k = String(key).toLowerCase();
          if (k.includes('metering') || k.includes('electrical') || k === '0b04' || k === '0702' || k === '2820' || k === '1794') {
            return true;
          }
        }
      }
    } catch (_e) { /* noop */ }
    return false;
  }

  _startAuditWindow() {
    this._auditStartedAt = Date.now();
    this._auditComplete = false;
    if (this._auditTimer) {
      this._clearAuditTimer();
    }
    // Always go through safe-timers — never (homey?.setTimeout || setTimeout).
    this._auditTimer = safeSetTimeout(this.device, () => {
      this._auditTimer = null;
      this._finalizeAudit().catch((e) => this.device.log('[ENERGY] Audit finalize error:', e.message));
    }, AUDIT_MS);
  }

  _clearAuditTimer() {
    if (!this._auditTimer) {return;}
    try {
      safeClearTimeout(this.device, this._auditTimer);
    } catch (_e) { /* noop */ }
    this._auditTimer = null;
  }

  /**
   * After 5 minutes: decide which caps are real, which may be estimated-only.
   */
  async _finalizeAudit() {
    if (this._auditComplete || this.device._destroyed) {return;}
    this._auditComplete = true;

    const reported = [...this._reportedCaps];
    const declared = ENERGY_CAPS.filter((c) => this._hasCap(c));
    const silent = declared.filter((c) => !this._reportedCaps.has(c));
    const summary = {
      at: Date.now(),
      reported,
      declared,
      silent,
      candidates: [...this._candidateCaps],
      counts: { ...this._reportCount },
    };

    await this._setStore('energy_audit_result', summary);
    await this._setStore('energy_audit_complete', true);
    this.device.log(`[ENERGY] 5-min audit done | real=${reported.join(',') || 'none'} | silent=${silent.join(',') || 'none'}`);

    // Stamp silent declared caps as eligible for estimation (not measured yet)
    for (const cap of silent) {
      const src = this._getStore(`telemetry_${cap}_source`, null);
      if (src !== 'direct') {
        await this._setStore(`telemetry_${cap}_source`, 'estimated');
        await this._setStore(`telemetry_${cap}_reason`, 'audit-silent-5min');
      }
    }

    // Allow DeviceTelemetryEstimator / virtual estimators to fill silent mains caps
    this.device._energyAuditAllowsEstimate = silent.length > 0 && this.device.mainsPowered !== false;
    this.device._energyRealCaps = new Set(reported);

    // Rebind ZCL if we discovered caps mid-window
    if (reported.length && this.universalHandler && typeof this.universalHandler.init === 'function') {
      await this.universalHandler.init().catch(() => {});
    }
  }

  async handleDP(dpId, value) {
    const config = ENERGY_DPS[dpId] || ENERGY_DPS[Number(dpId)];
    if (!config) {return false;}

    let transformed = value;
    if (config.cap === 'measure_voltage') {
      transformed = AdaptiveDataParser.toVoltage(value);
    } else if (config.cap === 'measure_power') {
      transformed = AdaptiveDataParser.toPower(value);
    } else if (config.cap === 'measure_current') {
      transformed = AdaptiveDataParser.toCurrent(value);
    } else {
      transformed = value / config.div;
    }

    await this._setEnergy(config.cap, transformed, { source: 'direct', via: `tuya-dp-${dpId}` });
    return true;
  }

  /**
   * Commit a real (measured) energy value. Marks telemetry source=direct.
   * Late advertising after audit still promotes the cap to real.
   */
  async _setEnergy(capability, value, meta = {}) {
    if (value === null || value === undefined || isNaN(value)) {return;}
    value = Math.round(value * 100) / 100;
    const cap = this._resolveCap(capability) || capability;

    const wasMissing = !this._hasCap(cap);
    if (wasMissing) {
      // During audit: only add if candidate or clearly metered; after audit allow late advertise
      const allowAdd = this._candidateCaps.has(cap)
        || this._hasZclEnergyClusters()
        || this._auditComplete
        || /plug|socket|energy|meter/.test(normalize(this.device.driver?.id || ''));
      if (!allowAdd && this.device.mainsPowered === false) {
        this.device.log(`[ENERGY] Skip phantom add ${cap} on battery device`);
        return;
      }
      await this.device.addCapability(cap).catch(() => {});
      this._detectedCaps.add(cap);
      this._candidateCaps.add(cap);
      this.device.log(`[ENERGY] Added ${cap} (late advertising=${this._auditComplete})`);
      if (this.universalHandler && typeof this.universalHandler.init === 'function') {
        await this.universalHandler.init().catch(() => {});
      }
    }

    this._markReported(cap);

    if (typeof this.device.safeSetCapabilityValue === 'function') {
      await this.device.safeSetCapabilityValue(cap, value).catch(() => {});
    } else {
      await this.device.setCapabilityValue(cap, value).catch(() => {});
    }

    // Distinguish measured from estimated for Flow + estimators
    try {
      const DeviceTelemetryEstimator = require('../utils/DeviceTelemetryEstimator');
      await DeviceTelemetryEstimator.record(this.device, cap, value, {
        source: meta.source || 'direct',
        via: meta.via || 'smart-energy',
      });
    } catch (_e) { /* optional */ }

    this.device._lastRealPowerReport = Date.now();
    if (!this.device._energyRealCaps) {this.device._energyRealCaps = new Set();}
    this.device._energyRealCaps.add(cap);
  }

  /** Called by UniversalEnergyHandler / ZCL paths for measured reports */
  async reportMeasured(capability, value, via = 'zcl') {
    await this._setEnergy(capability, value, { source: 'direct', via });
  }

  _markReported(cap) {
    this._reportedCaps.add(cap);
    this._reportCount[cap] = (this._reportCount[cap] || 0) + 1;
    if (!this._firstReportAt[cap]) {this._firstReportAt[cap] = Date.now();}
  }

  getDetectedCapabilities() {
    return Array.from(this._detectedCaps);
  }

  getReportedCapabilities() {
    return Array.from(this._reportedCaps);
  }

  isAuditComplete() {
    return this._auditComplete === true;
  }

  isRealCapability(capability) {
    const cap = this._resolveCap(capability) || capability;
    if (this._reportedCaps.has(cap)) {return true;}
    const src = this._getStore(`telemetry_${cap}_source`, null);
    return src === 'direct';
  }

  _hasCap(capabilityId) {
    return !!this._resolveCap(capabilityId);
  }

  _resolveCap(capabilityId) {
    if (!capabilityId || !this.device) {return null;}
    if (typeof this.device.hasCapability === 'function' && this.device.hasCapability(capabilityId)) {
      return capabilityId;
    }
    try {
      const caps = typeof this.device.getCapabilities === 'function' ? this.device.getCapabilities() : [];
      const needle = String(capabilityId).toLowerCase();
      return (caps || []).find((c) => String(c).toLowerCase() === needle) || null;
    } catch (_e) {
      return null;
    }
  }

  _getStore(key, fallback = null) {
    try {
      const v = this.device.getStoreValue?.(key);
      return v === undefined || v === null ? fallback : v;
    } catch (_e) {
      return fallback;
    }
  }

  async _setStore(key, value) {
    try {
      await this.device.setStoreValue?.(key, value);
    } catch (_e) { /* noop */ }
  }

  destroy() {
    this._clearAuditTimer();
  }
}

SmartEnergyManager.ENERGY_DPS = ENERGY_DPS;
SmartEnergyManager.ENERGY_CAPS = ENERGY_CAPS;
SmartEnergyManager.AUDIT_MS = AUDIT_MS;

module.exports = SmartEnergyManager;
