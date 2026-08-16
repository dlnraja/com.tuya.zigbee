'use strict';

/**
 * CrossLayerRedundancy (P207)
 *
 * Purpose (user doctrine): layers exist to compensate incompatible ZCL / DP /
 * proprietary clusters, interview gaps, unsupported attrs from diags/crashes,
 * and to confirm inbound/outbound data via protocol redundancy — for old and
 * new devices alike.
 *
 * Soft-wires pieces that already exist but were not attached on every lineage:
 *  - UnsupportedRegistry (negative cache for UNSUPPORTED_ATTRIBUTE)
 *  - SmartCapability / SmartDataValidator (multi-source agree → commit)
 *  - ReceptionManager (RX dedup across channels)
 *  - FallbackChains helpers (named → raw numeric → DP)
 *  - confirmInbound / confirmOutbound access points on the device
 *
 * Never throws. Idempotent. MASTER_ONLY.
 */

const DEFAULT_SMART_CAPS = {
  measure_battery: {
    zcl: { priority: 1, weight: 0.4, ttl: 600000 },
    'tuya-dp': { priority: 2, weight: 0.35, ttl: 300000 },
    voltage: { priority: 3, weight: 0.2, ttl: 300000 },
    estimated: { priority: 7, weight: 0.05, ttl: 3600000 },
    cached: { priority: 8, weight: 0.05, ttl: 86400000 },
  },
  measure_temperature: {
    zcl: { priority: 1, weight: 0.45, ttl: 120000 },
    'tuya-dp': { priority: 2, weight: 0.4, ttl: 120000 },
    cached: { priority: 8, weight: 0.1, ttl: 86400000 },
  },
  measure_humidity: {
    zcl: { priority: 1, weight: 0.45, ttl: 120000 },
    'tuya-dp': { priority: 2, weight: 0.4, ttl: 120000 },
    cached: { priority: 8, weight: 0.1, ttl: 86400000 },
  },
  measure_power: {
    zcl: { priority: 1, weight: 0.45, ttl: 30000 },
    'tuya-dp': { priority: 2, weight: 0.4, ttl: 30000 },
    estimated: { priority: 7, weight: 0.1, ttl: 120000 },
    cached: { priority: 8, weight: 0.05, ttl: 3600000 },
  },
  meter_power: {
    zcl: { priority: 1, weight: 0.5, ttl: 60000 },
    'tuya-dp': { priority: 2, weight: 0.4, ttl: 60000 },
    cached: { priority: 8, weight: 0.1, ttl: 86400000 },
  },
  onoff: {
    zcl: { priority: 1, weight: 0.4, ttl: 15000 },
    'tuya-dp': { priority: 2, weight: 0.4, ttl: 15000 },
    ui: { priority: 3, weight: 0.15, ttl: 5000 },
    cached: { priority: 8, weight: 0.05, ttl: 86400000 },
  },
  dim: {
    zcl: { priority: 1, weight: 0.45, ttl: 15000 },
    'tuya-dp': { priority: 2, weight: 0.4, ttl: 15000 },
    ui: { priority: 3, weight: 0.1, ttl: 5000 },
    cached: { priority: 8, weight: 0.05, ttl: 86400000 },
  },
  alarm_motion: {
    zcl: { priority: 1, weight: 0.4, ttl: 5000 },
    ias: { priority: 1, weight: 0.4, ttl: 5000 },
    'tuya-dp': { priority: 2, weight: 0.35, ttl: 5000 },
    cached: { priority: 8, weight: 0.05, ttl: 3600000 },
  },
  alarm_contact: {
    zcl: { priority: 1, weight: 0.4, ttl: 5000 },
    ias: { priority: 1, weight: 0.4, ttl: 5000 },
    'tuya-dp': { priority: 2, weight: 0.35, ttl: 5000 },
    cached: { priority: 8, weight: 0.05, ttl: 3600000 },
  },
};

function _ensureSmartCapApi(device) {
  if (typeof device.smartCap === 'function') {return;}
  const { SmartCapability } = require('../data/SmartCapability');
  device.smartCap = function smartCap(capability, opts) {
    if (!this._smartCapabilities) {this._smartCapabilities = {};}
    if (!this._smartCapabilities[capability]) {
      this._smartCapabilities[capability] = new SmartCapability(capability, opts);
    }
    return this._smartCapabilities[capability];
  };
}

function _seedSmartCaps(device) {
  if (!device.hasCapability) {return 0;}
  let n = 0;
  for (const [cap, sources] of Object.entries(DEFAULT_SMART_CAPS)) {
    if (!device.hasCapability(cap)) {continue;}
    try {
      device.smartCap(cap, {
        sources,
        debounceMs: cap.startsWith('alarm_') || cap === 'onoff' || cap === 'dim' ? 200 : 500,
        hysteresisMs: cap.startsWith('measure_') ? 10000 : 2000,
        minConfidence: 0.45,
      });
      // Seed cached from last Homey value so single-source can fall back.
      const cur = device.getCapabilityValue?.(cap);
      if (cur !== null && cur !== undefined) {
        device._smartCapabilities[cap].record('cached', cur, 0.4);
      }
      n += 1;
    } catch (_e) { /* skip one cap */ }
  }
  return n;
}

/**
 * Scan interview surface for missing EF00 aliases / empty powerCfg — seed
 * UnsupportedRegistry hints so we don't hammer the same dead attrs.
 */
function _seedInterviewGaps(device, zclNode) {
  const node = zclNode || device.zclNode;
  let registry;
  try {
    registry = require('../zigbee/UnsupportedRegistry').getRegistry(device);
  } catch (_e) {
    return { seeded: 0 };
  }

  let seeded = 0;
  const ep = node?.endpoints?.[1] || node?.endpoints?.[2];
  const clusters = ep?.clusters || {};

  const hasNamedTuya = !!(clusters.tuya || clusters.manuSpecificTuya || clusters.tuyaSpecific);
  const hasNumericEf00 = !!(clusters[0xEF00] || clusters[61184] || clusters['61184']);
  // Homey interview often exposes numeric only — remember working EF00 path.
  if (!hasNamedTuya && hasNumericEf00) {
    try {
      const paths = (typeof device.getStoreValue === 'function'
        ? device.getStoreValue('zcl_working_paths')
        : null) || {};
      if (!paths['cluster.ef00']) {
        paths['cluster.ef00'] = 'zcl-raw-numeric';
        if (typeof device.setStoreValue === 'function') {
          device.setStoreValue('zcl_working_paths', paths).catch(() => {});
        }
        seeded += 1;
      }
    } catch (_e) { /* noop */ }
  }

  // genPowerCfg often listed in interview but attrs unsupported on Tuya
  const power = clusters.genPowerCfg || clusters.powerConfiguration || clusters[0x0001];
  if (power && typeof power.readAttributes === 'function') {
    // Do not proactively mark unsupported — only note that DP battery is a peer.
    device._crossLayerHints = device._crossLayerHints || {};
    device._crossLayerHints.batteryPeers = ['zcl', 'tuya-dp', 'voltage'];
  } else if (device.hasCapability?.('measure_battery')) {
    // No power cluster at all → prefer DP / voltage chains
    try {
      registry.mark('genPowerCfg', 'batteryPercentageRemaining', 'no-cluster-interview');
      registry.mark('genPowerCfg', 'batteryVoltage', 'no-cluster-interview');
      seeded += 2;
    } catch (_e) { /* noop */ }
  }

  return { seeded, registrySize: registry.size?.() ?? undefined };
}

async function attachCrossLayerRedundancy(device, zclNode) {
  if (!device || device._destroyed || device._crossLayerAttached) {
    return { skipped: true };
  }
  device._crossLayerAttached = true;
  const out = {
    registry: false,
    smartCaps: 0,
    reception: false,
    interview: false,
    helpers: false,
  };

  // UnsupportedRegistry — silent skip of known-dead ZCL ops
  try {
    const { getRegistry } = require('../zigbee/UnsupportedRegistry');
    device.unsupportedRegistry = getRegistry(device);
    out.registry = true;
  } catch (e) {
    try { device.log?.(`[XLAYER] UnsupportedRegistry skip: ${e.message}`); } catch { /* noop */ }
  }

  // Smart multi-source validators for present capabilities
  try {
    _ensureSmartCapApi(device);
    out.smartCaps = _seedSmartCaps(device);
  } catch (e) {
    try { device.log?.(`[XLAYER] SmartCap skip: ${e.message}`); } catch { /* noop */ }
  }

  // RX dedup across protocol channels
  if (!device.receptionManager) {
    try {
      const { ReceptionManager } = require('../multichannel/ReceptionManager');
      device.receptionManager = new ReceptionManager(device);
      out.reception = true;
    } catch (_e) { /* optional */ }
  }

  // Expose FallbackChains helpers on device for bases/drivers
  if (!device.readSensorWithFallbacks) {
    try {
      const fb = require('../zigbee/FallbackChains');
      device.readSensorWithFallbacks = (namedCluster, clusterLabel, attribute, opts) =>
        fb.readSensorWithFallbacks(device, namedCluster, clusterLabel, attribute, opts);
      device.execFallbackChain = (domain, steps) => fb.execChain(device, domain, steps);
      out.helpers = true;
    } catch (_e) { /* optional */ }
  }

  /**
   * Confirm inbound sample through ReceptionManager + SmartCap + L14.
   * Prefer this over raw setCapabilityValue when the value came from ZCL/DP/IAS/raw.
   */
  device.confirmInbound = async function confirmInbound(capability, value, source = 'unknown', confidence = 0.85) {
    if (this._destroyed || capability == null || value === undefined) {
      return { ok: false, reason: 'guard' };
    }
    try {
      this.receptionManager?.receive?.(capability, value, source);

      // Learn optimizer hits when present
      try {
        if (this.protocolOptimizer?.registerHit) {
          const proto = source === 'tuya-dp' || source === 'dp' ? 'tuya'
            : source === 'ias' ? 'ias'
              : source === 'raw' || source === 'raw_frame' ? 'raw' : 'zcl';
          this.protocolOptimizer.registerHit(proto, capability, value, capability);
        }
      } catch (_e) { /* noop */ }

      const sc = this._smartCapabilities?.[capability];
      if (sc) {
        // Dynamically accept unknown source names (diag/crash-derived paths)
        if (!sc.validator.sources.has(source)) {
          sc.validator.addSource(source, { priority: 5, weight: 0.25, ttl: 120000 });
        }
        sc.record(source, value, confidence);
        const decision = sc.commit();
        if (decision.commit === false && (decision.flooded || decision.deduped)) {
          return { ok: true, skipped: true, reason: decision.reason, agree: !!decision.agree };
        }
        if (decision.commit === false && decision.reason === 'low-confidence' && confidence < 0.6) {
          return { ok: false, reason: 'low-confidence', agree: false };
        }
        const toSet = (decision.value !== null && decision.value !== undefined) ? decision.value : value;
        if (typeof this.safeSetCapabilityValue === 'function') {
          await this.safeSetCapabilityValue(capability, toSet);
        } else if (typeof this.setCapabilityValue === 'function') {
          await this.setCapabilityValue(capability, toSet);
        }
        return {
          ok: true,
          via: source,
          agree: !!decision.agree,
          sources: decision.sources || [source],
          value: toSet,
        };
      }

      if (typeof this.safeSetCapabilityValue === 'function') {
        await this.safeSetCapabilityValue(capability, value);
      } else if (typeof this.setCapabilityValue === 'function') {
        await this.setCapabilityValue(capability, value);
      }
      return { ok: true, via: source, agree: false };
    } catch (err) {
      return { ok: false, error: err?.message || String(err) };
    }
  };

  /**
   * Soft outbound confirmation: after a successful TX, record expected UI
   * state and optionally schedule a peer-path read (ZCL↔DP) without blocking.
   */
  device.confirmOutbound = async function confirmOutbound(capability, expectedValue, opts = {}) {
    if (this._destroyed || capability == null) {return { ok: false };}
    const source = opts.source || 'ui';
    try {
      const sc = this._smartCapabilities?.[capability];
      if (sc) {
        if (!sc.validator.sources.has(source)) {
          sc.validator.addSource(source, { priority: 3, weight: 0.2, ttl: 10000 });
        }
        sc.record(source, expectedValue, opts.confidence ?? 0.7);
      }
      // Optimistic L14 write for UI responsiveness
      if (opts.apply !== false && typeof this.safeSetCapabilityValue === 'function') {
        await this.safeSetCapabilityValue(capability, expectedValue);
      }

      // Deferred peer confirm (non-fatal) — compensates silent TX / wrong cluster
      if (opts.peerConfirm !== false && typeof this.readSensorWithFallbacks === 'function') {
        const { safeSetTimeout } = require('../utils/safe-timers');
        safeSetTimeout(this, async () => {
          if (this._destroyed) {return;}
          try {
            // Prefer io.receiveWithFallback when available
            if (this.io?.receiveWithFallback) {
              await this.io.receiveWithFallback({ capability, expected: expectedValue });
            }
          } catch (_e) { /* soft */ }
        }, opts.peerDelayMs || 800);
      }
      return { ok: true, via: source };
    } catch (err) {
      return { ok: false, error: err?.message || String(err) };
    }
  };

  // Interview / unsupported compensation seed
  try {
    const gap = _seedInterviewGaps(device, zclNode);
    out.interview = true;
    out.interviewSeeded = gap.seeded;
  } catch (_e) { /* noop */ }

  try {
    device.log?.(
      `[XLAYER] redundancy ready (smartCaps=${out.smartCaps}, registry=${out.registry}, rx=${out.reception})`,
    );
  } catch (_e) { /* noop */ }

  return out;
}

module.exports = {
  attachCrossLayerRedundancy,
  DEFAULT_SMART_CAPS,
};
