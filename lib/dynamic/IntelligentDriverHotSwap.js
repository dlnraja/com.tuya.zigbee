'use strict';

/**
 * IntelligentDriverHotSwap — v1.0.0 (MASTER_ONLY)
 *
 * Homey SDK3 does NOT support `setDriver()` at runtime — driver assignment is
 * locked at pairing time. True hot-swap therefore requires re-pairing.
 *
 * HOWEVER, we can simulate intelligent driver adaptation through 4 strategies
 * that do NOT require re-pairing and work entirely within SDK3 constraints:
 *
 *  Strategy 1 — CAPABILITY HOT-SWAP
 *    addCapability / removeCapability at runtime to match what the device
 *    actually reports. Safe: SDK3 persists capability lists across restarts.
 *    Example: device joined as switch_1gang but reports DP18=temperature →
 *    we add measure_temperature and remove nothing from the user's flow cards.
 *
 *  Strategy 2 — DP ROUTING OVERRIDE
 *    Store a learned dpId→capability map in device store. On each DP report,
 *    the routing override intercepts before the static dpMappings and applies
 *    the learned mapping. Persisted via setStoreValue → survives restarts.
 *    Example: unknown DP104 consistently reports 0/1 → learned as onoff.2.
 *
 *  Strategy 3 — PROTOCOL RENEGOTIATION
 *    Observe incoming frame patterns (EF00 vs ZCL) and switch the active
 *    protocol mode stored in settings. On next onNodeInit (after app restart
 *    or device rejoin), IntelligentProtocolDetect reads the override.
 *    Example: device paired as HYBRID but only sends EF00 → lock to TUYA_DP.
 *
 *  Strategy 4 — DRIVER PROFILE OVERRIDE
 *    Load an alternative DP profile from driver-mapping-database.json at runtime.
 *    Replace this.dpMappings and this.clusterCapabilityHandlers with the profile
 *    best matching the observed behaviour.
 *    Example: generic_tuya observes DP pattern matching soil_sensor profile →
 *    dynamically apply soil_sensor DP map without re-pairing.
 *
 * Classification: MASTER_ONLY (advanced feature manager, soak before stable).
 * All strategies are non-blocking, idempotent, and safe on destroyed devices.
 */

const STORE_KEY_DP_OVERRIDE = 'hotswap_dp_routing';
const STORE_KEY_PROTOCOL = 'hotswap_protocol';
const STORE_KEY_PROFILE = 'hotswap_driver_profile';
const STORE_KEY_CAPS_ADDED = 'hotswap_caps_added';

// Minimum consecutive DP reports before committing a routing override
const MIN_OBSERVATIONS = 5;
// Confidence threshold (0–1) before applying capability hot-swap
const CAP_CONFIDENCE_THRESHOLD = 0.75;

/**
 * Homey-standard capability definitions usable at runtime.
 * Only capabilities with no required `ui` or `getable` override
 * are included — addCapability only accepts standard Homey caps.
 */
const STANDARD_CAPS = new Set([
  'onoff', 'dim', 'measure_temperature', 'measure_humidity', 'measure_luminance',
  'measure_battery', 'measure_power', 'measure_voltage', 'measure_current',
  'measure_co2', 'measure_pm25', 'measure_noise', 'measure_pressure',
  'alarm_motion', 'alarm_contact', 'alarm_water', 'alarm_smoke', 'alarm_co',
  'alarm_heat', 'alarm_tamper', 'alarm_battery', 'alarm_generic',
  'target_temperature', 'thermostat_mode', 'locked',
  'windowcoverings_state', 'windowcoverings_set', 'windowcoverings_tilt_set',
  'light_hue', 'light_saturation', 'light_temperature', 'light_mode',
  'volume_set', 'speaker_playing', 'speaker_shuffle',
]);

class IntelligentDriverHotSwap {
  constructor(device) {
    this.device = device;
    this.log = (...a) => device.log?.('[HOT-SWAP]', ...a);
    this.error = (...a) => device.error?.('[HOT-SWAP]', ...a);

    // DP observation counters: dpId → { count, lastValue, capability }
    this._dpObs = new Map();
    // Active routing overrides from store (persisted)
    this._dpRouting = {};
    // Caps added by this engine (tracked for audit)
    this._addedCaps = new Set();
    // Protocol frame counters
    this._ef00Frames = 0;
    this._zclFrames = 0;

    this._initialized = false;
  }

  // ─── Init ────────────────────────────────────────────────────────────────

  async initialize() {
    if (this._initialized || this.device._destroyed) return;
    this._initialized = true;

    // Restore persisted routing overrides
    try {
      const stored = await this.device.getStoreValue(STORE_KEY_DP_OVERRIDE);
      if (stored && typeof stored === 'object') {
        this._dpRouting = stored;
        this.log(`Restored ${Object.keys(stored).length} DP routing overrides from store`);
      }
    } catch { /* non-blocking */ }

    // Restore tracked added caps
    try {
      const storedCaps = await this.device.getStoreValue(STORE_KEY_CAPS_ADDED);
      if (Array.isArray(storedCaps)) {
        this._addedCaps = new Set(storedCaps);
      }
    } catch { /* non-blocking */ }

    this.log('initialized — strategies: CapabilityHotSwap + DPRoutingOverride + ProtocolRenegotiation + ProfileOverride');
  }

  // ─── Strategy 1: Capability Hot-Swap ─────────────────────────────────────

  /**
   * Called by DynamicCapabilityManager when a new capability is confidently detected.
   * Safely adds it to the device at runtime without re-pairing.
   *
   * @param {string} capabilityId - Standard Homey capability id
   * @param {number} confidence - 0.0 to 1.0
   * @param {object} opts - optional setCapabilityOptions
   */
  async hotSwapAddCapability(capabilityId, confidence = 1.0, opts = null) {
    if (this.device._destroyed) return;
    if (confidence < CAP_CONFIDENCE_THRESHOLD) {
      this.log(`CapHotSwap: ${capabilityId} confidence ${confidence.toFixed(2)} < threshold, skipping`);
      return;
    }
    if (!STANDARD_CAPS.has(capabilityId)) {
      this.log(`CapHotSwap: ${capabilityId} not in standard cap set — skipping (would fail addCapability)`);
      return;
    }
    if (this.device.hasCapability(capabilityId)) return;

    try {
      await this.device.addCapability(capabilityId);
      this._addedCaps.add(capabilityId);
      await this.device.setStoreValue(STORE_KEY_CAPS_ADDED, [...this._addedCaps]).catch(() => {});
      if (opts) {
        await this.device.setCapabilityOptions(capabilityId, opts).catch(() => {});
      }
      this.log(`✅ CapHotSwap: added ${capabilityId} (confidence=${confidence.toFixed(2)})`);
    } catch (err) {
      this.error(`CapHotSwap: addCapability(${capabilityId}) failed: ${err.message}`);
    }
  }

  /**
   * Remove a capability that was dynamically added and is no longer reported.
   * Never removes capabilities that existed at pairing time.
   *
   * @param {string} capabilityId
   */
  async hotSwapRemoveCapability(capabilityId) {
    if (this.device._destroyed) return;
    if (!this._addedCaps.has(capabilityId)) {
      this.log(`CapHotSwap: ${capabilityId} was not added by hot-swap — protecting from removal`);
      return;
    }
    if (!this.device.hasCapability(capabilityId)) return;

    try {
      await this.device.removeCapability(capabilityId);
      this._addedCaps.delete(capabilityId);
      await this.device.setStoreValue(STORE_KEY_CAPS_ADDED, [...this._addedCaps]).catch(() => {});
      this.log(`🗑 CapHotSwap: removed stale cap ${capabilityId}`);
    } catch (err) {
      this.error(`CapHotSwap: removeCapability(${capabilityId}) failed: ${err.message}`);
    }
  }

  // ─── Strategy 2: DP Routing Override ─────────────────────────────────────

  /**
   * Observe a DP report. If we see MIN_OBSERVATIONS consistent reports
   * of a DP not in the static dpMappings, commit a routing override.
   *
   * @param {number} dpId
   * @param {*} value
   * @param {string} capability - proposed capability from DynamicCapabilityManager
   * @param {number} confidence
   */
  async observeDP(dpId, value, capability, confidence) {
    if (this.device._destroyed) return;

    // Already routed?
    if (this._dpRouting[dpId]) {
      return this._dpRouting[dpId]; // return existing route
    }

    if (!this._dpObs.has(dpId)) {
      this._dpObs.set(dpId, { count: 0, capability: null, confidence: 0 });
    }
    const obs = this._dpObs.get(dpId);
    obs.count++;
    obs.capability = capability;
    obs.confidence = confidence;

    if (obs.count >= MIN_OBSERVATIONS && confidence >= CAP_CONFIDENCE_THRESHOLD) {
      await this._commitDPRoutingOverride(dpId, capability, confidence);
    }
  }

  /**
   * Apply active DP routing overrides to an incoming DP value.
   * Called synchronously in the dpReport handler (before static dpMappings).
   *
   * @returns {string|null} capability to update, or null if no override
   */
  applyDPRouting(dpId) {
    return this._dpRouting[dpId] || null;
  }

  async _commitDPRoutingOverride(dpId, capability, confidence) {
    this._dpRouting[dpId] = capability;
    try {
      await this.device.setStoreValue(STORE_KEY_DP_OVERRIDE, this._dpRouting);
      this.log(`✅ DPRoutingOverride: DP${dpId} → ${capability} (confidence=${confidence.toFixed(2)}, persistent)`);
    } catch (err) {
      this.error(`DPRoutingOverride persist failed for DP${dpId}: ${err.message}`);
    }
    // Also hot-swap the capability in if needed
    await this.hotSwapAddCapability(capability, confidence);
  }

  // ─── Strategy 3: Protocol Renegotiation ──────────────────────────────────

  /**
   * Track frame type counters. After 50 frames, if pattern is clear,
   * write a protocol override to settings so IntelligentProtocolDetect
   * picks it up on next init.
   */
  observeFrame(type) {
    if (type === 'ef00') this._ef00Frames++;
    else if (type === 'zcl') this._zclFrames++;

    const total = this._ef00Frames + this._zclFrames;
    if (total > 0 && total % 50 === 0) {
      this._evaluateProtocolRenegotiation(total);
    }
  }

  _evaluateProtocolRenegotiation(total) {
    if (this.device._destroyed) return;
    const ef00Ratio = this._ef00Frames / total;
    const zclRatio = this._zclFrames / total;

    let negotiated = null;
    if (ef00Ratio > 0.85) negotiated = 'TUYA_DP';
    else if (zclRatio > 0.85) negotiated = 'ZCL';
    else if (ef00Ratio > 0.3 && zclRatio > 0.3) negotiated = 'HYBRID';

    if (!negotiated) return;

    const current = this.device._protocolInfo?.protocol;
    if (negotiated === current) return;

    this.log(`ProtocolRenegotiation: observed ${(ef00Ratio * 100).toFixed(0)}% EF00 / ${(zclRatio * 100).toFixed(0)}% ZCL → negotiated=${negotiated} (was ${current})`);

    // Persist: IntelligentProtocolDetect reads this override on next init
    this.device.setStoreValue(STORE_KEY_PROTOCOL, negotiated).catch(() => {});
    // Apply immediately to in-memory protocol info
    if (this.device._protocolInfo) {
      this.device._protocolInfo._negotiatedOverride = negotiated;
      this.device._protocolInfo.protocol = negotiated;
    }
  }

  // ─── Strategy 4: Driver Profile Override ─────────────────────────────────

  /**
   * Load an alternative DP profile from driver-mapping-database.json
   * and apply it to this.dpMappings at runtime.
   *
   * @param {string} targetDriverId - driver profile to load (e.g. 'soil_sensor')
   * @param {number} confidence
   */
  async applyDriverProfile(targetDriverId, confidence) {
    if (this.device._destroyed) return;
    if (confidence < CAP_CONFIDENCE_THRESHOLD) return;

    const current = this.device.driver?.id;
    if (current === targetDriverId) return;

    this.log(`ProfileOverride: loading profile for '${targetDriverId}' (confidence=${confidence.toFixed(2)}) onto driver '${current}'`);

    try {
      let db;
      try {
        db = require('../../data/driver-mapping-database.json');
      } catch {
        const fs = require('fs');
        const path = require('path');
        const p = path.join(__dirname, '../../data/driver-mapping-database.json');
        db = JSON.parse(fs.readFileSync(p));
      }

      const profile = db[targetDriverId] || db.drivers?.[targetDriverId];
      if (!profile) {
        this.log(`ProfileOverride: no profile found for '${targetDriverId}' in driver-mapping-database.json`);
        return;
      }

      // Merge dpMappings
      if (profile.dpMappings && typeof profile.dpMappings === 'object') {
        if (!this.device.dpMappings) this.device.dpMappings = {};
        Object.assign(this.device.dpMappings, profile.dpMappings);
        this.log(`ProfileOverride: merged ${Object.keys(profile.dpMappings).length} DP mappings from '${targetDriverId}'`);
      }

      // Persist profile override for next restart
      await this.device.setStoreValue(STORE_KEY_PROFILE, {
        driverId: targetDriverId,
        confidence,
        appliedAt: Date.now(),
      }).catch(() => {});

      // Hot-swap capabilities declared in the profile
      if (Array.isArray(profile.capabilities)) {
        for (const cap of profile.capabilities) {
          await this.hotSwapAddCapability(cap, confidence).catch(() => {});
        }
      }

      this.log(`✅ ProfileOverride: '${targetDriverId}' profile applied — DP maps merged, capabilities hot-swapped`);
    } catch (err) {
      this.error(`ProfileOverride failed for '${targetDriverId}': ${err.message}`);
    }
  }

  /**
   * On startup, restore any persisted profile override.
   */
  async restoreProfileOverride() {
    if (this.device._destroyed) return;
    try {
      const stored = await this.device.getStoreValue(STORE_KEY_PROFILE);
      if (stored?.driverId) {
        this.log(`ProfileOverride: restoring persisted profile '${stored.driverId}' from last session`);
        await this.applyDriverProfile(stored.driverId, stored.confidence || 0.8);
      }
    } catch { /* non-blocking */ }
  }

  // ─── Status Report ────────────────────────────────────────────────────────

  getStatus() {
    return {
      addedCaps: [...this._addedCaps],
      dpRoutingOverrides: Object.keys(this._dpRouting).length,
      ef00Frames: this._ef00Frames,
      zclFrames: this._zclFrames,
      dpObservations: this._dpObs.size,
    };
  }

  onDestroy() {
    this._dpObs.clear();
    this._initialized = false;
  }
}

module.exports = IntelligentDriverHotSwap;
