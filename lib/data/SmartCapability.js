#!/usr/bin/env node
/**
 * SmartCapability.js — P57 Smart Capability Mixin
 *
 * High-level wrapper around SmartDataValidator for device.js files.
 * Provides a `smartCap(capability)` API that:
 *  - Records values from multiple sources (ZCL, Tuya DP, voltage, cached, etc.)
 *  - Cross-validates between sources (deduplicates if same)
 *  - Falls back to alternative sources if primary fails
 *  - Debounces updates (no commit within N ms)
 *  - Hysteresis (no commit for identical value)
 *
 * Usage in a driver device.js:
 *
 *   const { SmartCapability } = require('../../lib/data/SmartCapability');
 *
 *   onNodeInit() {
 *     // Register a smart capability for measure_battery
 *     this.battery = this.smartCap('measure_battery', {
 *       sources: {
 *         'zcl':       { priority: 1, weight: 0.4 },
 *         'tuya-dp':   { priority: 2, weight: 0.3 },
 *         'voltage':   { priority: 3, weight: 0.2 },
 *         'cached':    { priority: 8, weight: 0.05, ttl: 86400000 },
 *         'last-known':{ priority: 9, weight: 0.05, ttl: 604800000 },
 *       },
 *       debounceMs: 500,
 *       hysteresisMs: 30000,
 *     });
 *   }
 *
 *   // On ZCL attribute read
 *   this.battery.record('zcl', value, 0.95);
 *   const decision = this.battery.commit();
 *   if (decision.commit) {
 *     this.setCapabilityValue('measure_battery', decision.value);
 *   }
 *
 *   // On Tuya DP receive
 *   this.battery.record('tuya-dp', value, 0.85);
 *   this.battery.commitAndSet(this, 'measure_battery');
 *
 *   // On source error
 *   this.battery.markFailed('zcl', 'timeout');
 *
 *   // On device destroy / re-init
 *   this.battery.reset();
 *
 *   // Get current best (without committing)
 *   const best = this.battery.getBest();
 *   if (best.agree) {
 *     // 2+ sources agree
 *   }
 */
'use strict';

const { SmartDataValidator } = require('./SmartDataValidator');

const DEFAULT_OPTS = {
  debounceMs: 500,         // anti-flood: min ms between commits
  hysteresisMs: 10000,     // anti-flood: min ms between same-value commits
  staleMs: 120000,         // source stale after no updates
  agreeTolerance: 0.05,    // 5% tolerance for "sources agree"
  minConfidence: 0.5,       // min confidence for commit
  method: 'weighted',       // weighted | majority | highest-confidence | last
};

class SmartCapability {
  /**
   * @param {string} capability - Homey capability name
   * @param {object} [opts]
   */
  constructor(capability, opts = {}) {
    this.capability = capability;
    this.opts = { ...DEFAULT_OPTS, ...opts };
    this.validator = new SmartDataValidator(capability, {
      debounceMs: this.opts.debounceMs,
      hysteresisMs: this.opts.hysteresisMs,
      staleMs: this.opts.staleMs,
      agreeTolerance: this.opts.agreeTolerance,
      minConfidence: this.opts.minConfidence,
      method: this.opts.method,
    });
    if (this.opts.sources) {
      for (const [name, srcOpts] of Object.entries(this.opts.sources)) {
        this.validator.addSource(name, srcOpts);
      }
    }
  }

  /** Record value from source. Returns commit decision if autoCommit. */
  record(source, value, confidence, ts) {
    return this.validator.record(source, value, ts, confidence);
  }

  /** Mark a source as failed (timeout, parse error, etc). */
  markFailed(source, error) {
    this.validator.markFailed(source, error);
  }

  /** Decide whether to commit. */
  commit(now) {
    return this.validator.commit(now);
  }

  /** Get current best (no commit). */
  getBest(now) {
    return this.validator.getBest(now);
  }

  /**
   * Convenience: record + commit + setCapabilityValue (if commit).
   * @param {object} device - The Homey device (with setCapabilityValue method)
   * @param {string} [capability] - Override the capability (defaults to this.capability)
   * @param {string} [source]
   * @param {*} [value]
   * @param {number} [confidence]
   */
  recordAndCommit(source, value, confidence, ts) {
    this.validator.record(source, value, ts, confidence);
    return this.validator.commit(ts);
  }

  /**
   * Highest-level convenience: record value, commit, set capability.
   * @param {object} device
   * @param {string} source
   * @param {*} value
   * @param {number} [confidence=1.0]
   */
  update(device, source, value, confidence = 1.0) {
    const decision = this.validator.recordAndCommit(source, value, undefined, confidence);
    if (decision.commit && device && typeof device.setCapabilityValue === 'function') {
      try {
        device.setCapabilityValue(this.capability, decision.value);
      } catch (e) {
        // best-effort — caller may handle
      }
    }
    return decision;
  }

  /**
   * Multi-source batch: record all values from one update, then commit.
   * @param {object} device
   * @param {object} samples - { source: { value, confidence? } }
   */
  updateMulti(device, samples) {
    for (const [source, info] of Object.entries(samples)) {
      const value = typeof info === 'object' ? info.value : info;
      const confidence = typeof info === 'object' && info.confidence !== undefined ? info.confidence : 1.0;
      this.validator.record(source, value, undefined, confidence);
    }
    return this.update(device, null, null, null) || this.validator.commit();
  }

  /** Reset state (e.g. on device re-init). */
  reset() {
    this.validator.reset();
  }

  /** Get stats. */
  getStats() {
    return this.validator.getStats();
  }
}

/**
 * Mixin for Homey Device class. Adds `device.smartCap(capability, opts)` method.
 *
 * Usage in a base class or driver:
 *   const { installSmartCapMixin } = require('../../lib/data/SmartCapability');
 *   installSmartCapMixin(MyDeviceClass);
 *
 * Then in device.js:
 *   this.battery = this.smartCap('measure_battery', { sources: { zcl: { priority: 1, weight: 0.5 } } });
 *   this.battery.update(this, 'zcl', 72);
 */
function installSmartCapMixin(DeviceClass) {
  if (!DeviceClass.prototype.smartCap) {
    DeviceClass.prototype.smartCap = function (capability, opts) {
      if (!this._smartCapabilities) this._smartCapabilities = {};
      if (!this._smartCapabilities[capability]) {
        this._smartCapabilities[capability] = new SmartCapability(capability, opts);
      }
      return this._smartCapabilities[capability];
    };
  }
  if (!DeviceClass.prototype._resetSmartCapabilities) {
    DeviceClass.prototype._resetSmartCapabilities = function () {
      if (this._smartCapabilities) {
        for (const cap of Object.values(this._smartCapabilities)) cap.reset();
      }
    };
  }
  return DeviceClass;
}

module.exports = { SmartCapability, installSmartCapMixin };
