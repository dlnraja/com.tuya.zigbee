'use strict';

/**
 * P2699 / P2700 — Non-native Homey DP / clusters → complementary only (never mandatory).
 *
 * WHY(P215):
 * - Pourquoi: Homey SDK/interview does not cover every Tuya DP / proprietary ZCL
 *   (0xEF00, 0xE000, 0xE002, 0xED00, mfr OnOff 0xFD/0xFC, AQ ZCL siblings…).
 * - Comment: arm parallel RX/TX/raw/stream via HomeyCompensationLayer + PFC +
 *   RawClusterFallback + ProtocolRxTxChain — soft listen / cascade;
 *   never require compose bind or hard-throw on miss.
 * - Pour qui: Homey Pro users (BOTH + Bastien) when interview/SDK gaps appear.
 * - Quand: onNodeInit / sendDP / RX frame / DeviceIOFacade.attach / enrich.
 * - Contre quoi: treating proprietary clusters as mandatory compose/bind →
 *   Unknown pairing, boot crash, or "Tuya cluster not available" fatals.
 *
 * SSOT: config/architecture/complementary-rx-tx-dp-cluster-ssot.json
 */

/** Proprietary / Homey-gap cluster ids (decimal + common aliases). */
const NON_NATIVE_CLUSTER_IDS = Object.freeze([
  0xEF00, // 61184 Tuya EF00 DP
  61184,
  0xE000, // 57344 Tuya common
  57344,
  0xE001,
  57345,
  0xE002, // 57346 Linptech / presence extras
  57346,
  0xED00, // 60672 proprietary sibling (BSEED interview noise — do not compose-require)
  60672,
  0xFC00,
  64512,
  0xFC7C,
  64636,
]);

const NON_NATIVE_NAME_RE =
  /^(tuya|tuyaManufacturer|manuSpecificTuya|manuSpecificTuya[23]|msCO2|carbonDioxideMeasurement|pm25Measurement|vocMeasurement|formaldehydeMeasurement)$/i;

/**
 * @param {unknown} clusterIdOrName
 * @returns {boolean}
 */
function isNonNativeCluster(clusterIdOrName) {
  if (clusterIdOrName == null) return false;
  if (typeof clusterIdOrName === 'number' && Number.isFinite(clusterIdOrName)) {
    return NON_NATIVE_CLUSTER_IDS.includes(clusterIdOrName >>> 0)
      || NON_NATIVE_CLUSTER_IDS.includes(clusterIdOrName);
  }
  const s = String(clusterIdOrName).trim();
  if (!s) return false;
  if (NON_NATIVE_NAME_RE.test(s)) return true;
  const n = Number(s);
  if (Number.isFinite(n)) return isNonNativeCluster(n);
  return false;
}

/**
 * Homey-native standard clusters that MAY be required for pairing when present
 * on interview — still soft-fail TX if missing (never invent).
 * @param {unknown} clusterIdOrName
 * @returns {boolean}
 */
function isHomeyNativeStandardCluster(clusterIdOrName) {
  const n = typeof clusterIdOrName === 'number'
    ? clusterIdOrName
    : Number(clusterIdOrName);
  if (!Number.isFinite(n)) return false;
  // Basic, PowerCfg, OnOff, Level, Color, IAS Zone, Temp, Humidity, Illum, Occupancy
  const native = new Set([0, 1, 3, 4, 5, 6, 8, 768, 1024, 1026, 1029, 1030, 1280]);
  return native.has(n) && !isNonNativeCluster(n);
}

/**
 * Policy: non-native gaps must never be compose-mandatory or boot-fatal.
 * @param {unknown} clusterIdOrName
 * @returns {{ complementaryOnly: true, neverMandatory: true, softArm: boolean }}
 */
function complementaryPolicyFor(clusterIdOrName) {
  const soft = isNonNativeCluster(clusterIdOrName) || !isHomeyNativeStandardCluster(clusterIdOrName);
  return {
    complementaryOnly: true,
    neverMandatory: true,
    softArm: soft,
  };
}

/**
 * Soft-arm complementary RX/TX/raw/stream when Homey interview/SDK misses a path.
 * Never throws. Safe if modules missing from Homey bundle.
 *
 * P2700: also arms RawClusterFallback, ProtocolFallbackChain, ProtocolRxTxChain.
 *
 * @param {object} device
 * @param {object} [opts]
 * @returns {{ ok: boolean, armed: string[] }}
 */
function softArmComplementaryIo(device, opts = {}) {
  const armed = [];
  if (!device || typeof device !== 'object') {
    return { ok: false, armed };
  }
  try {
    // Mark store so diagnostics / PFC know we are in complementary mode
    try {
      device.setStoreValue?.('non_native_complementary', true).catch?.(() => {});
    } catch (_e) { /* noop */ }
    armed.push('store_flag');

    // Passive Tuya listen when EF00 object missing (Homey interview miss)
    try {
      const io = opts.io || device.io;
      if (io && typeof io._enablePassiveTuyaListen === 'function') {
        io._enablePassiveTuyaListen(opts);
        armed.push('passive_tuya_listen');
      }
    } catch (_e) { /* noop */ }

    // Raw frame fallback on node (UniversalZigbeeDevice pattern)
    try {
      if (typeof device._setupRawFrameFallback === 'function' && !device.node?._rawFrameFallbackInjected) {
        device._setupRawFrameFallback();
        armed.push('raw_frame_fallback');
      }
    } catch (_e) { /* noop */ }

    // P2700: RawClusterFallback — complementary ZCL/AQ listen (never mandatory)
    try {
      if (!device.rawClusterFallback && !device._rawClusterFallback) {
        if (typeof device.log !== 'function') device.log = () => {};
        const RawClusterFallback = require('../clusters/RawClusterFallback');
        const raw = new RawClusterFallback(device);
        device.rawClusterFallback = raw;
        device._rawClusterFallback = raw;
        armed.push('raw_cluster_fallback');
        const node = opts.zclNode || device.zclNode || device.node;
        if (node && typeof raw.initialize === 'function') {
          Promise.resolve(raw.initialize(node)).catch(() => false);
          armed.push('raw_cluster_listen');
        }
      } else {
        armed.push('raw_cluster_fallback_present');
      }
    } catch (_e) { /* optional in slim bundles */ }

    // P2700: ProtocolFallbackChain — ordered complementary RX/TX cascade
    try {
      if (!device.protocolFallbackChain && !(opts.io && opts.io._fallbackChain)) {
        const ProtocolFallbackChain = require('./ProtocolFallbackChain');
        const pfc = new ProtocolFallbackChain(device, {
          io: opts.io || device.io,
          compensation: opts.compensation || device._compensation || device.homeyCompensation,
        });
        device.protocolFallbackChain = pfc;
        if (opts.io) opts.io._fallbackChain = pfc;
        armed.push('protocol_fallback_chain');
      } else {
        armed.push('protocol_fallback_chain_present');
      }
    } catch (_e) { /* optional */ }

    // P2700: ProtocolRxTxChain — inventory + raw stream tap (soft async)
    try {
      if (!device._protocolRxTxAttached && !device.protocolRxTx) {
        const { attachProtocolRxTxChain } = require('../layers/ProtocolRxTxChain');
        const node = opts.zclNode || device.zclNode || device.node;
        Promise.resolve(attachProtocolRxTxChain(device, node)).catch(() => null);
        armed.push('protocol_rxtx_chain');
      } else {
        armed.push('protocol_rxtx_present');
      }
    } catch (_e) { /* optional */ }

    // Compensation layer EF00 soft ensure
    try {
      const comp = opts.compensation || device._compensation || device.homeyCompensation;
      if (comp && typeof comp.ensureTuyaClusterCompensated === 'function') {
        Promise.resolve(comp.ensureTuyaClusterCompensated(opts)).catch(() => false);
        armed.push('ef00_compensate_soft');
      }
    } catch (_e) { /* noop */ }

    // WHY(P2748): complementary / raw / EF00 paint may skip L14 — still fire Homey
    // tagged Flow cards (token icon) Bastien marked broken. Soft wrap only.
    try {
      const { ensureTaggedFlowEmitFromAnyPath } = require('../flow/CapabilityChangedFlowEmitter');
      const wr = ensureTaggedFlowEmitFromAnyPath(device);
      if (wr?.wrapped) armed.push('tagged_flow_emit_wrap');
      else if (wr?.ok) armed.push('tagged_flow_emit_ready');
    } catch (_e) { /* optional */ }

    return { ok: true, armed };
  } catch (_e) {
    return { ok: false, armed };
  }
}

/**
 * Prefer false over throw when a non-native cluster/DP path is unavailable.
 * @param {Error|string|unknown} err
 * @returns {boolean} true if caller should soft-continue (complementary cascade)
 */
function shouldSoftContinueMissingCluster(err) {
  const msg = String(err?.message || err || '').toLowerCase();
  if (!msg) return true;
  return /tuya cluster not available|cluster .* not (available|bound|found)|missing_cluster|no tuya cluster|ef00/.test(msg);
}

module.exports = {
  NON_NATIVE_CLUSTER_IDS,
  isNonNativeCluster,
  isHomeyNativeStandardCluster,
  complementaryPolicyFor,
  softArmComplementaryIo,
  shouldSoftContinueMissingCluster,
};
