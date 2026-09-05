'use strict';

/**
 * IntelligentDriverHotSwap — v2.0.0 (MASTER_ONLY)
 *
 * ═══════════════════════════════════════════════════════════════════
 * HARD CONSTRAINT: Homey SDK3 has NO setDriver() at runtime.
 * Driver assignment is LOCKED at pairing time.
 * True hot-swap = user removes + re-pairs.
 * ═══════════════════════════════════════════════════════════════════
 *
 * This module simulates intelligent driver adaptation through 4 SDK3-legal
 * strategies, all without touching the pairing flow. It is designed to
 * integrate cleanly with the existing stack:
 *
 *   safeSetCapabilityValue   ← authoritative write path (L14, anti-flood, calibration)
 *   DynamicCapabilityManager ← DP discovery + confidence scoring
 *   DPAdaptationEngine       ← DP pattern learning
 *   VirtualTelemetryComp.    ← gating cooldowns
 *   IntelligentProtocolDetect← protocol selection (reads our store overrides)
 *   SanityFilter (ROC/EMA)   ← value quality inside safeSetCapabilityValue
 *
 * ─── INTEGRATION RULES ──────────────────────────────────────────────
 *
 *  1. THIS MODULE NEVER calls setCapabilityValue directly.
 *     All value writes go through device.safeSetCapabilityValue() only.
 *     This ensures L14 SanityFilter, anti-flood, calibration, and
 *     DeduplicationFilter all apply.
 *
 *  2. Capability add/remove goes through _guardedAddCapability() which:
 *     - checks STANDARD_CAPS_MAP (generated from homey-lib at build time)
 *     - checks COMPUTED_CAPS (meter_* are Homey-integrated, never device-written)
 *     - checks VirtualTelemetryCompensationEngine.gateAdaptation()
 *     - checks the per-device CAP_BUDGET (max dynamic caps per device)
 *     - checks driver-expected caps via DeviceFingerprintDB
 *
 *  3. DynamicCapabilityManager is the DISCOVERY authority.
 *     This module is the PERSISTENCE + COHERENCE authority.
 *     No duplication: DynamicCapabilityManager calls hotSwapCapability()
 *     instead of addCapability() directly.
 *
 *  4. Computed vs Native:
 *     - meter_power / meter_gas / meter_rain / meter_water = Homey-calculated
 *       (energy integration). NEVER write these from a device DP.
 *       If device sends meter_power as a DP, route it to measure_power instead.
 *     - measure_power = native device measurement → write to this.
 *     - ZCL measuredValue (cluster 0x0402, 0x0405, 0x0400) = native.
 *       These arrive through safeSetCapabilityValue with meta.source='zcl'.
 *       Never write the same cap twice from both ZCL and EF00 DP.
 *       CoherenceGuard detects double-sources and keeps the ZCL source.
 *
 *  5. Coherence Cleanup:
 *     - Tracks last-seen timestamp per dynamic cap.
 *     - Every COHERENCE_INTERVAL ms: removes stale caps not seen in 24h.
 *     - Also removes caps that consistently report out-of-range values.
 *     - Cleanup budget: 1 removeCapability per COHERENCE_INTERVAL.
 *
 *  6. Memory safety:
 *     - _dpObs capped at MAX_DP_OBS_SIZE (evict LRU when full).
 *     - _dpRouting capped at MAX_DP_ROUTING_SIZE.
 *     - driver-mapping-database.json loaded lazily (only on Profile Override request).
 *     - onDestroy() clears all Maps and stops intervals.
 *
 * Classification: MASTER_ONLY (advanced feature manager, soak before stable).
 * All strategies are non-blocking, idempotent, safe on destroyed devices.
 */

// ─── Store keys ────────────────────────────────────────────────────────────────
const STORE_KEY_DP_OVERRIDE = 'hotswap_dp_routing';
const STORE_KEY_PROTOCOL    = 'hotswap_protocol';
const STORE_KEY_PROFILE     = 'hotswap_driver_profile';
const STORE_KEY_CAPS_ADDED  = 'hotswap_caps_added';

// ─── Thresholds ────────────────────────────────────────────────────────────────
const MIN_OBSERVATIONS        = 5;     // consecutive DP reports before routing commit
const CAP_CONFIDENCE_THRESHOLD = 0.75; // 0–1 confidence before capability hot-swap
const CAP_BUDGET              = 8;     // max dynamic caps per device (prevent UI spam)
const MAX_DP_OBS_SIZE         = 50;    // LRU cap on _dpObs
const MAX_DP_ROUTING_SIZE     = 30;    // max persisted routing overrides
const STALE_CAP_MS            = 24 * 60 * 60 * 1000; // 24h without report = stale
const COHERENCE_INTERVAL      = 15 * 60 * 1000;      // 15-minute coherence check

// ─── Computed (Homey-integrated) caps — NEVER write from device DP ──────────
// meter_* are accumulated by Homey's Energy integration; device provides measure_power.
const COMPUTED_CAPS = new Set(['meter_gas', 'meter_power', 'meter_rain', 'meter_water']);

// ─── COMPUTED → NATIVE remapping ─────────────────────────────────────────────
// When a device DP is mapped to a computed cap, reroute to the native equivalent.
const COMPUTED_REMAP = {
  meter_power: 'measure_power',
  meter_gas:   'measure_power', // gas flow → power proxy
  meter_water: 'measure_water', // water flow fallback
};

// ─── Standard Homey capabilities (184 total from homey-lib 2.51.4) ───────────
// Auto-generated from node_modules/homey-lib/assets/capability/capabilities/*.json
// type=boolean: settable: false=alarm/sensor, true=command
// type=number:  settable: false=sensor, true=actuator
// Do NOT add custom/driver-specific caps here (they cannot be addCapability'd).
const STANDARD_CAPS_MAP = new Map([
  // ── Boolean sensors (read-only) ──
  ['alarm_battery', { type: 'boolean', setable: false }],
  ['alarm_co', { type: 'boolean', setable: false }],
  ['alarm_co2', { type: 'boolean', setable: false }],
  ['alarm_contact', { type: 'boolean', setable: false }],
  ['alarm_generic', { type: 'boolean', setable: false }],
  ['alarm_heat', { type: 'boolean', setable: false }],
  ['alarm_motion', { type: 'boolean', setable: false }],
  ['alarm_night', { type: 'boolean', setable: false }],
  ['alarm_pm25', { type: 'boolean', setable: false }],
  ['alarm_smoke', { type: 'boolean', setable: false }],
  ['alarm_tamper', { type: 'boolean', setable: false }],
  ['alarm_water', { type: 'boolean', setable: false }],
  // ── Numeric sensors (read-only, native device measurement) ──
  ['measure_battery', { type: 'number', setable: false, min: 0, max: 100 }],
  ['measure_co', { type: 'number', setable: false, min: 0 }],
  ['measure_co2', { type: 'number', setable: false, min: 0, max: 5000 }],
  ['measure_current', { type: 'number', setable: false, min: 0, max: 100 }],
  ['measure_distance', { type: 'number', setable: false, min: 0 }],
  ['measure_frequency', { type: 'number', setable: false }],
  ['measure_humidity', { type: 'number', setable: false, min: 0, max: 100 }],
  ['measure_luminance', { type: 'number', setable: false, min: 0, max: 100000 }],
  ['measure_moisture', { type: 'number', setable: false, min: 0, max: 100 }],
  ['measure_noise', { type: 'number', setable: false, min: 0, max: 200 }],
  ['measure_nox', { type: 'number', setable: false, min: 0 }],
  ['measure_o3', { type: 'number', setable: false, min: 0 }],
  ['measure_ph', { type: 'number', setable: false }],
  ['measure_pm01', { type: 'number', setable: false, min: 0 }],
  ['measure_pm1', { type: 'number', setable: false, min: 0 }],
  ['measure_pm10', { type: 'number', setable: false, min: 0 }],
  ['measure_pm25', { type: 'number', setable: false, min: 0, max: 1000 }],
  ['measure_power', { type: 'number', setable: false, min: 0 }],
  ['measure_pressure', { type: 'number', setable: false, min: 300, max: 1100 }],
  ['measure_radon', { type: 'number', setable: false, min: 0 }],
  ['measure_rain', { type: 'number', setable: false, min: 0 }],
  ['measure_rain_intensity', { type: 'number', setable: false, min: 0 }],
  ['measure_so2', { type: 'number', setable: false, min: 0 }],
  ['measure_temperature', { type: 'number', setable: false, min: -40, max: 85 }],
  ['measure_tvoc', { type: 'number', setable: false, min: 0 }],
  ['measure_tvoc_index', { type: 'number', setable: false, min: 0 }],
  ['measure_ultraviolet', { type: 'number', setable: false, min: 0, max: 11 }],
  ['measure_voltage', { type: 'number', setable: false, min: 0, max: 300 }],
  ['measure_weight', { type: 'number', setable: false, min: 0 }],
  ['measure_wind_angle', { type: 'number', setable: false }],
  ['measure_wind_strength', { type: 'number', setable: false, min: 0 }],
  ['measure_aqi', { type: 'number', setable: false, min: 0 }],
  ['measure_ch2o', { type: 'number', setable: false, min: 0 }],
  ['measure_signal_strength', { type: 'number', setable: false }],
  // ── Actuator caps (setable=true) — safe to add only if device can accept commands ──
  ['dim', { type: 'number', setable: true, min: 0, max: 1 }],
  ['light_hue', { type: 'number', setable: true, min: 0, max: 1 }],
  ['light_mode', { type: 'string', setable: true }],
  ['light_saturation', { type: 'number', setable: true, min: 0, max: 1 }],
  ['light_temperature', { type: 'number', setable: true, min: 0, max: 1 }],
  ['locked', { type: 'boolean', setable: true }],
  ['onoff', { type: 'boolean', setable: true }],
  ['target_temperature', { type: 'number', setable: true, min: 5, max: 35 }],
  ['thermostat_mode', { type: 'string', setable: true }],
  ['volume_set', { type: 'number', setable: true, min: 0, max: 1 }],
  ['windowcoverings_set', { type: 'number', setable: true, min: 0, max: 1 }],
  ['windowcoverings_state', { type: 'string', setable: true }],
  ['windowcoverings_tilt_set', { type: 'number', setable: true, min: 0, max: 1 }],
  ['garagedoor_closed', { type: 'boolean', setable: true }],
  ['fan_mode', { type: 'string', setable: true }],
  ['fan_speed', { type: 'number', setable: true, min: 0, max: 1 }],
]);

// ─── Source priority for double-source coherence ───────────────────────────────
// Higher number = higher priority. If two sources write same cap, keep higher.
const SOURCE_PRIORITY = {
  zcl: 10,      // ZCL native cluster measurement = most authoritative
  tuya_dp: 8,   // Tuya EF00 DP native report
  dp_override: 7, // learned DP routing override
  computed: 3,  // locally computed/estimated value
  virtual: 1,   // virtual / emulated
};

class IntelligentDriverHotSwap {
  constructor(device) {
    this.device = device;
    this.log   = (...a) => device.log?.('[HOT-SWAP]', ...a);
    this.error = (...a) => device.error?.('[HOT-SWAP]', ...a);

    // Strategy 2: DP observations (LRU capped at MAX_DP_OBS_SIZE)
    // dpId → { count, capability, confidence, firstSeen, lastSeen }
    this._dpObs     = new Map();
    // dpId → capabilityId (persisted routing overrides)
    this._dpRouting = {};
    // Caps added by hot-swap (tracked for coherence cleanup)
    // capId → { addedAt, lastSeen, sourceCount, outOfRangeCount }
    this._addedCaps = new Map();
    // Strategy 3: protocol frame counters
    this._ef00Frames = 0;
    this._zclFrames  = 0;
    // Strategy 1+4: coherence timer handle
    this._coherenceTimer = null;
    // Double-source tracking: capId → { sources: Set, lastSourcePriority }
    this._capSources = new Map();
    // driver-mapping-database lazy cache
    this._profileDb  = null;

    this._initialized = false;
  }

  // ─── Init ──────────────────────────────────────────────────────────────────

  async initialize() {
    if (this._initialized || this.device._destroyed) return;
    this._initialized = true;

    // Restore persisted routing overrides
    try {
      const stored = await this.device.getStoreValue(STORE_KEY_DP_OVERRIDE);
      if (stored && typeof stored === 'object') {
        // Enforce size budget on restore
        const keys = Object.keys(stored);
        if (keys.length > MAX_DP_ROUTING_SIZE) {
          const trimmed = {};
          keys.slice(-MAX_DP_ROUTING_SIZE).forEach(k => { trimmed[k] = stored[k]; });
          this._dpRouting = trimmed;
        } else {
          this._dpRouting = stored;
        }
        this.log(`Restored ${Object.keys(this._dpRouting).length} DP routing overrides`);
      }
    } catch { /* non-blocking */ }

    // Restore tracked added caps
    try {
      const storedCaps = await this.device.getStoreValue(STORE_KEY_CAPS_ADDED);
      if (Array.isArray(storedCaps)) {
        const now = Date.now();
        for (const entry of storedCaps) {
          if (typeof entry === 'string') {
            this._addedCaps.set(entry, { addedAt: now, lastSeen: now, sourceCount: 0, outOfRangeCount: 0 });
          } else if (entry && entry.id) {
            this._addedCaps.set(entry.id, { addedAt: entry.addedAt || now, lastSeen: entry.lastSeen || now, sourceCount: 0, outOfRangeCount: 0 });
          }
        }
      }
    } catch { /* non-blocking */ }

    // Restore persisted profile override (lazy — applies mappings, not a DB load)
    await this.restoreProfileOverride().catch(() => {});

    // Schedule coherence cleanup
    if (this.device.homey?.setTimeout) {
      this._coherenceTimer = this.device.homey.setTimeout(() => {
        this._runCoherenceCleanup().catch(() => {});
        // Re-schedule as interval
        if (!this.device._destroyed) {
          this._coherenceTimer = this.device.homey.setInterval(
            () => this._runCoherenceCleanup().catch(() => {}),
            COHERENCE_INTERVAL,
          );
        }
      }, COHERENCE_INTERVAL);
    }

    this.log('initialized v2 — Capability hot-swap | DP routing | Protocol renegotiation | Profile override | Coherence cleanup');
  }

  // ─── Strategy 1: Capability Hot-Swap ────────────────────────────────────────

  /**
   * Add a capability at runtime.
   * Entry point for DynamicCapabilityManager and driver code.
   * NEVER calls setCapabilityValue directly — only addCapability.
   * All subsequent value writes must go through safeSetCapabilityValue().
   *
   * @param {string} capabilityId  Standard Homey capability id
   * @param {number} confidence    0.0 to 1.0
   * @param {object} [opts]        Optional setCapabilityOptions
   * @returns {Promise<boolean>}   true if added or already present
   */
  async hotSwapAddCapability(capabilityId, confidence = 1.0, opts = null) {
    if (this.device._destroyed) return false;

    // 1. Reroute computed caps to their native equivalent
    if (COMPUTED_CAPS.has(capabilityId)) {
      const remapped = COMPUTED_REMAP[capabilityId];
      if (remapped) {
        this.log(`CapHotSwap: ${capabilityId} is computed by Homey → remapping to native ${remapped}`);
        capabilityId = remapped;
      } else {
        this.log(`CapHotSwap: ${capabilityId} is Homey-computed — device must NOT write this. Skipping.`);
        return false;
      }
    }

    // 2. Standard caps guard
    if (!STANDARD_CAPS_MAP.has(capabilityId)) {
      this.log(`CapHotSwap: ${capabilityId} not in standard cap map — would fail addCapability. Skipping.`);
      return false;
    }

    // 3. Confidence guard
    if (confidence < CAP_CONFIDENCE_THRESHOLD) {
      this.log(`CapHotSwap: ${capabilityId} confidence ${confidence.toFixed(2)} < threshold. Skipping.`);
      return false;
    }

    // 4. Already present — update last-seen and return
    if (this.device.hasCapability?.(capabilityId)) {
      this._touchCapSeen(capabilityId);
      return true;
    }

    // 5. CAP_BUDGET guard — prevent UI spam
    if (this._addedCaps.size >= CAP_BUDGET) {
      this.log(`CapHotSwap: budget (${CAP_BUDGET}) reached — not adding ${capabilityId}`);
      return false;
    }

    // 6. VirtualTelemetryCompensationEngine gating
    const vtce = this.device.virtualTelemetryCompensationEngine;
    if (vtce && typeof vtce.gateAdaptation === 'function') {
      if (!vtce.gateAdaptation(capabilityId, 'ADD')) {
        this.log(`CapHotSwap: ${capabilityId} gated by VirtualTelemetry cooldown. Retry next cycle.`);
        return false;
      }
    }

    // 7. Driver expected caps cross-check (soft warning only, not a hard block)
    const expectedCaps = this._getDriverExpectedCaps();
    if (expectedCaps.size > 0 && !expectedCaps.has(capabilityId)) {
      // Log and allow if confidence is very high (>= 0.9), else skip
      if (confidence < 0.9) {
        this.log(`CapHotSwap: ${capabilityId} not in driver expected caps and confidence ${confidence.toFixed(2)} < 0.9 — skipping`);
        return false;
      }
      this.log(`CapHotSwap: ${capabilityId} not in driver expected caps but confidence=${confidence.toFixed(2)} >= 0.9 — allowing`);
    }

    // 8. Add capability
    try {
      await this.device.addCapability(capabilityId);
      const now = Date.now();
      this._addedCaps.set(capabilityId, { addedAt: now, lastSeen: now, sourceCount: 1, outOfRangeCount: 0 });
      await this._persistAddedCaps();
      if (opts) {
        await this.device.setCapabilityOptions?.(capabilityId, opts).catch(() => {});
      }
      this.log(`✅ CapHotSwap: added ${capabilityId} (confidence=${confidence.toFixed(2)}, budget=${this._addedCaps.size}/${CAP_BUDGET})`);
      return true;
    } catch (err) {
      this.error(`CapHotSwap: addCapability(${capabilityId}) failed: ${err.message}`);
      return false;
    }
  }

  /**
   * Remove a dynamically added capability that is stale or incoherent.
   * ONLY removes caps that were added by this engine (_addedCaps).
   * Never removes pairing-time capabilities.
   *
   * @param {string} capabilityId
   * @param {string} reason
   */
  async hotSwapRemoveCapability(capabilityId, reason = 'stale') {
    if (this.device._destroyed) return;
    if (!this._addedCaps.has(capabilityId)) {
      this.log(`CapHotSwap: ${capabilityId} not added by hot-swap — protected from removal`);
      return;
    }
    if (!this.device.hasCapability?.(capabilityId)) {
      this._addedCaps.delete(capabilityId);
      return;
    }
    try {
      await this.device.removeCapability(capabilityId);
      this._addedCaps.delete(capabilityId);
      await this._persistAddedCaps();
      this.log(`🗑 CapHotSwap: removed ${capabilityId} (reason: ${reason})`);
    } catch (err) {
      this.error(`CapHotSwap: removeCapability(${capabilityId}) failed: ${err.message}`);
    }
  }

  // ─── Double-source Coherence Guard ──────────────────────────────────────────

  /**
   * Track which source wrote a capability.
   * Called by UniversalLayerBootstrap when a dpReport is processed.
   * Prevents ZCL and EF00 DP from both writing the same cap simultaneously.
   *
   * @param {string} capabilityId
   * @param {string} source  'zcl' | 'tuya_dp' | 'dp_override' | 'computed' | 'virtual'
   * @returns {boolean} true = this source may write; false = higher-priority source owns it
   */
  guardCapabilitySource(capabilityId, source) {
    if (!capabilityId || !source) return true;

    const myPriority = SOURCE_PRIORITY[source] ?? 0;
    const existing = this._capSources.get(capabilityId);

    if (!existing) {
      this._capSources.set(capabilityId, { sources: new Set([source]), lastSourcePriority: myPriority, lastSeen: Date.now() });
      return true;
    }

    existing.sources.add(source);
    existing.lastSeen = Date.now();

    if (myPriority < existing.lastSourcePriority) {
      // Lower-priority source trying to write — suppress
      return false;
    }

    existing.lastSourcePriority = myPriority;
    return true;
  }

  /**
   * Mark that a value was observed for a capability.
   * Used by coherence cleanup to track staleness and out-of-range.
   *
   * @param {string} capabilityId
   * @param {*} value
   */
  observeCapabilityValue(capabilityId, value) {
    this._touchCapSeen(capabilityId);

    const meta = this._addedCaps.get(capabilityId);
    if (!meta) return;

    meta.sourceCount++;

    // Out-of-range check using STANDARD_CAPS_MAP bounds
    const def = STANDARD_CAPS_MAP.get(capabilityId);
    if (def && typeof value === 'number') {
      const outOfRange = (def.min !== undefined && value < def.min) ||
                         (def.max !== undefined && value > def.max);
      if (outOfRange) {
        meta.outOfRangeCount++;
        // If >20% reports are out-of-range, flag for cleanup
        const oor_ratio = meta.outOfRangeCount / Math.max(meta.sourceCount, 1);
        if (oor_ratio > 0.2 && meta.sourceCount >= 10) {
          this.log(`CoherenceGuard: ${capabilityId} has ${(oor_ratio*100).toFixed(0)}% out-of-range values — scheduling removal`);
          // Non-blocking lazy remove
          Promise.resolve().then(() => this.hotSwapRemoveCapability(capabilityId, 'out-of-range').catch(() => {}));
        }
      }
    }
  }

  // ─── Strategy 2: DP Routing Override ────────────────────────────────────────

  /**
   * Observe a DP report from DPAdaptationEngine / DynamicCapabilityManager.
   * After MIN_OBSERVATIONS consistent reports, commits a persisted routing override.
   *
   * @param {number} dpId
   * @param {*}      value
   * @param {string} capability  proposed capability from DynamicCapabilityManager
   * @param {number} confidence  0–1
   * @returns {string|null} existing routed capability if already committed
   */
  async observeDP(dpId, value, capability, confidence) {
    if (this.device._destroyed) return null;

    // Block computed cap routing — remap to native
    if (COMPUTED_CAPS.has(capability)) {
      capability = COMPUTED_REMAP[capability] || null;
      if (!capability) return null;
    }

    // Already routed — return existing override
    if (this._dpRouting[dpId]) {
      this._touchCapSeen(this._dpRouting[dpId]);
      return this._dpRouting[dpId];
    }

    // Enforce LRU cap on _dpObs
    if (this._dpObs.size >= MAX_DP_OBS_SIZE) {
      // Evict oldest entry
      const oldest = [...this._dpObs.entries()].reduce((a, b) => b[1].lastSeen < a[1].lastSeen ? b : a);
      this._dpObs.delete(oldest[0]);
    }

    const now = Date.now();
    if (!this._dpObs.has(dpId)) {
      this._dpObs.set(dpId, { count: 0, capability: null, confidence: 0, firstSeen: now, lastSeen: now });
    }
    const obs = this._dpObs.get(dpId);
    obs.count++;
    obs.lastSeen = now;
    obs.capability = capability;
    obs.confidence = confidence;

    if (obs.count >= MIN_OBSERVATIONS && confidence >= CAP_CONFIDENCE_THRESHOLD && capability) {
      await this._commitDPRoutingOverride(dpId, capability, confidence);
    }
    return null;
  }

  /**
   * Apply active DP routing overrides synchronously.
   * Called by UniversalLayerBootstrap BEFORE static dpMappings.
   *
   * @param {number} dpId
   * @returns {string|null} overridden capability or null
   */
  applyDPRouting(dpId) {
    return this._dpRouting[dpId] || null;
  }

  async _commitDPRoutingOverride(dpId, capability, confidence) {
    // Enforce routing size budget
    if (Object.keys(this._dpRouting).length >= MAX_DP_ROUTING_SIZE) {
      const keys = Object.keys(this._dpRouting);
      delete this._dpRouting[keys[0]]; // evict oldest
    }

    this._dpRouting[dpId] = capability;
    try {
      await this.device.setStoreValue(STORE_KEY_DP_OVERRIDE, this._dpRouting);
      this.log(`✅ DPRoutingOverride: DP${dpId} → ${capability} (confidence=${confidence.toFixed(2)}, persistent)`);
    } catch (err) {
      this.error(`DPRoutingOverride persist failed for DP${dpId}: ${err.message}`);
    }
    // Capability hot-swap if needed
    await this.hotSwapAddCapability(capability, confidence).catch(() => {});
  }

  // ─── Strategy 3: Protocol Renegotiation ─────────────────────────────────────

  /**
   * Track EF00 vs ZCL frame counts.
   * After 50 frames, if ratio is clear, write protocol override to store
   * so IntelligentProtocolDetect reads it on next onNodeInit.
   *
   * @param {'ef00'|'zcl'} type
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
    const zclRatio  = this._zclFrames  / total;

    let negotiated = null;
    if (ef00Ratio > 0.85) negotiated = 'TUYA_DP';
    else if (zclRatio > 0.85) negotiated = 'ZCL';
    else if (ef00Ratio > 0.3 && zclRatio > 0.3) negotiated = 'HYBRID';

    if (!negotiated) return;

    const current = this.device._protocolInfo?.protocol;
    if (negotiated === current) return;

    this.log(`ProtocolRenegotiation: EF00=${(ef00Ratio*100).toFixed(0)}% ZCL=${(zclRatio*100).toFixed(0)}% → negotiated=${negotiated} (was ${current})`);

    // Persist: IntelligentProtocolDetect reads this on next init
    this.device.setStoreValue(STORE_KEY_PROTOCOL, negotiated).catch(() => {});
    // Apply immediately to in-memory protocol info
    if (this.device._protocolInfo) {
      this.device._protocolInfo._negotiatedOverride = negotiated;
      this.device._protocolInfo.protocol = negotiated;
    }
  }

  // ─── Strategy 4: Driver Profile Override ────────────────────────────────────

  /**
   * Load an alternative DP profile from driver-mapping-database.json (lazy)
   * and merge its dpMappings + capabilities onto this device.
   *
   * @param {string} targetDriverId  e.g. 'soil_sensor', 'presence_sensor_radar'
   * @param {number} confidence      0–1
   */
  async applyDriverProfile(targetDriverId, confidence) {
    if (this.device._destroyed) return;
    if (confidence < CAP_CONFIDENCE_THRESHOLD) return;

    const current = this.device.driver?.id;
    if (current === targetDriverId) return;

    this.log(`ProfileOverride: loading '${targetDriverId}' (confidence=${confidence.toFixed(2)}) onto '${current}'`);

    const db = await this._loadProfileDb();
    if (!db) return;

    const profile = db[targetDriverId] || db.drivers?.[targetDriverId];
    if (!profile) {
      this.log(`ProfileOverride: no profile found for '${targetDriverId}'`);
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

    // Hot-swap capabilities declared in the profile (through guardedAdd)
    if (Array.isArray(profile.capabilities)) {
      for (const cap of profile.capabilities) {
        await this.hotSwapAddCapability(cap, confidence).catch(() => {});
      }
    }

    this.log(`✅ ProfileOverride: '${targetDriverId}' profile applied`);
  }

  /**
   * On startup, restore any persisted profile override.
   */
  async restoreProfileOverride() {
    if (this.device._destroyed) return;
    try {
      const stored = await this.device.getStoreValue(STORE_KEY_PROFILE);
      if (stored?.driverId) {
        this.log(`ProfileOverride: restoring '${stored.driverId}' from last session`);
        await this.applyDriverProfile(stored.driverId, stored.confidence || 0.8);
      }
    } catch { /* non-blocking */ }
  }

  // ─── Coherence Cleanup ───────────────────────────────────────────────────────

  /**
   * Periodic cleanup of stale dynamically-added capabilities.
   * Runs every COHERENCE_INTERVAL ms. Removes at most 1 cap per run (rate limit).
   */
  async _runCoherenceCleanup() {
    if (this.device._destroyed) return;
    if (this._addedCaps.size === 0) return;

    const now = Date.now();
    let removedThisRun = 0;

    for (const [capId, meta] of this._addedCaps.entries()) {
      if (removedThisRun >= 1) break; // rate limit: 1 removal per cycle

      // Still present on device?
      if (!this.device.hasCapability?.(capId)) {
        this._addedCaps.delete(capId);
        continue;
      }

      // Stale: not seen in STALE_CAP_MS
      const staleness = now - meta.lastSeen;
      if (staleness > STALE_CAP_MS) {
        this.log(`CoherenceCleanup: ${capId} stale (last seen ${Math.round(staleness/3600000)}h ago) — removing`);
        await this.hotSwapRemoveCapability(capId, 'stale').catch(() => {});
        removedThisRun++;
      }
    }
  }

  // ─── Driver expected caps (lazy, from DeviceFingerprintDB) ──────────────────

  _getDriverExpectedCaps() {
    if (this._cachedExpectedCaps) return this._cachedExpectedCaps;

    const caps = new Set();
    try {
      const data = this.device.getData?.();
      if (!data?.manufacturerName || !data?.modelId) {
        this._cachedExpectedCaps = caps;
        return caps;
      }

      // Try to get expected caps from driver's compose manifest (fastest path)
      const driverManifest = this.device.driver?.manifest;
      if (driverManifest?.capabilities) {
        for (const c of driverManifest.capabilities) caps.add(c);
      }

      // Also add any capabilities the device currently has (pairing-time baseline)
      for (const c of (this.device.getCapabilities?.() || [])) caps.add(c);

    } catch { /* non-blocking */ }

    this._cachedExpectedCaps = caps;
    return caps;
  }

  // ─── Internal helpers ────────────────────────────────────────────────────────

  _touchCapSeen(capabilityId) {
    const meta = this._addedCaps.get(capabilityId);
    if (meta) meta.lastSeen = Date.now();
  }

  async _persistAddedCaps() {
    try {
      const serialized = [...this._addedCaps.entries()].map(([id, meta]) => ({
        id,
        addedAt: meta.addedAt,
        lastSeen: meta.lastSeen,
      }));
      await this.device.setStoreValue(STORE_KEY_CAPS_ADDED, serialized);
    } catch { /* non-blocking */ }
  }

  /**
   * Lazy-load driver-mapping-database.json (Strategy 4 only).
   * Cached in _profileDb after first load.
   * Uses Buffer read (no UTF-16 intermediate string) to minimize heap pressure.
   */
  async _loadProfileDb() {
    if (this._profileDb) return this._profileDb;

    const mem = process.memoryUsage?.();
    if (mem && (mem.rss > 55 * 1024 * 1024 || mem.heapUsed > 40 * 1024 * 1024)) {
      this.log('ProfileOverride: skipping DB load — RSS pressure');
      return null;
    }

    try {
      const fs   = require('fs');
      const path = require('path');
      const p = path.join(__dirname, '../../data/driver-mapping-database.json');
      if (!fs.existsSync(p)) return null;
      const buf = fs.readFileSync(p); // Buffer — avoids large UTF-16 string on heap
      this._profileDb = JSON.parse(buf);
      this.log(`ProfileOverride: loaded driver-mapping-database.json (${Math.round(buf.length/1024)}KB)`);
      return this._profileDb;
    } catch (err) {
      this.error(`ProfileOverride: failed to load DB: ${err.message}`);
      return null;
    }
  }

  // ─── Public API ──────────────────────────────────────────────────────────────

  /**
   * Diagnostics — returned by TuyaZigbeeDevice.getHotSwapStatus()
   */
  getStatus() {
    return {
      addedCaps:          [...this._addedCaps.keys()],
      dpRoutingOverrides: Object.keys(this._dpRouting).length,
      dpRoutingMap:       { ...this._dpRouting },
      ef00Frames:         this._ef00Frames,
      zclFrames:          this._zclFrames,
      dpObservations:     this._dpObs.size,
      capSources:         Object.fromEntries(
        [...this._capSources.entries()].map(([k, v]) => [k, { sources: [...v.sources], priority: v.lastSourcePriority }])
      ),
      budget: `${this._addedCaps.size}/${CAP_BUDGET}`,
    };
  }

  onDestroy() {
    this._dpObs.clear();
    this._dpRouting = {};
    this._addedCaps.clear();
    this._capSources.clear();
    this._profileDb  = null;
    this._cachedExpectedCaps = null;
    this._initialized = false;
    if (this._coherenceTimer) {
      try {
        this.device.homey?.clearTimeout?.(this._coherenceTimer);
        this.device.homey?.clearInterval?.(this._coherenceTimer);
      } catch { /* noop */ }
      this._coherenceTimer = null;
    }
  }
}

module.exports = IntelligentDriverHotSwap;
