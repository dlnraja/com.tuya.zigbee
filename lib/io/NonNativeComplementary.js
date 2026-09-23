'use strict';

/**
 * P2699 — Non-native Homey DP / clusters → complementary only (never mandatory).
 *
 * WHY(P215):
 * - Pourquoi: Homey SDK/interview does not cover every Tuya DP / proprietary ZCL
 *   (0xEF00, 0xE000, 0xE002, 0xED00, mfr OnOff 0xFD/0xFC, AQ ZCL siblings…).
 * - Comment: arm parallel RX/TX/raw/stream via HomeyCompensationLayer + PFC —
 *   soft listen / cascade; never require compose bind or hard-throw on miss.
 * - Pour qui: Homey Pro users (BOTH tracks) when interview/SDK gaps appear.
 * - Quand: onNodeInit / sendDP / RX frame / enrich — every gap class.
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
 * Soft-arm complementary RX/TX when Homey interview/SDK misses a path.
 * Never throws. Safe if modules missing from Homey bundle.
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

    // Compensation layer attach is soft by design
    try {
      const comp = opts.compensation || device._compensation;
      if (comp && typeof comp.ensureTuyaClusterCompensated === 'function') {
        Promise.resolve(comp.ensureTuyaClusterCompensated(opts)).catch(() => false);
        armed.push('ef00_compensate_soft');
      }
    } catch (_e) { /* noop */ }

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
