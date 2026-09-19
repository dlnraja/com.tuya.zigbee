'use strict';

/**
 * P2473 / P2573 — EF00-only interview shape (Joep Insoma / Moes ZTS / FrankEver /
 * Michaelp #2244 TRV / VicHY clrdrnya radar)
 *
 * WHY: Homey pairs Unknown when compose requires clusters the interview lacks
 * (classic: OnOff `6` while device is `[0,4,5,61184]` or `[0,4,5,61184,60672]`).
 * Compensate TX/RX with pure EF00 + raw fallback — never invent ZCL OnOff.
 *
 * P2573: interview may include proprietary extras (0xED00=60672) — still EF00-only
 * as long as OnOff/LevelControl are absent. Lean radar compose `[0,61184]` is OK.
 *
 * Track: BOTH (pairing reliability).
 */

/** Canonical Homey-matched cluster list for Tuya MCU EF00-only interviews. */
const TUYA_EF00_ONLY_CLUSTERS = Object.freeze([0, 4, 5, 61184]);

/** ZCL actuator clusters that prove the interview is NOT EF00-only. */
const EF00_ONLY_FORBIDDEN_CLUSTERS = Object.freeze([6, 8]); // OnOff, LevelControl

/**
 * Known EF00-only / pure Tuya DP manufacturers (MCU valves, curtains, TRVs, radars).
 * WHY(P2573): include ogx8u5z6 (#2244) + clrdrnya/gkfbdvyx (VicHY / GH#547) so
 * forcePureTuyaDp runs even when Hybrid detect would prefer hollow ZCL OnOff.
 */
const EF00_ONLY_MFR_RE = /fhvpaltk|eaet5qt5|5slehgeo|wt9agwf3|5uodvhgc|1n2zev06|nbqnmkee|icka1clh|fodv6bkr|libht6ua|ogx8u5z6|clrdrnya|gkfbdvyx|sbyx0lm6|laokfqwu/i;

/**
 * Exact canonical shape `[0,4,5,61184]` (order-insensitive).
 * @param {unknown} clusters
 * @returns {boolean}
 */
function isEf00OnlyInterviewShape(clusters) {
  if (!Array.isArray(clusters) || clusters.length === 0) return false;
  const norm = clusters.map((c) => Number(c)).filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  const expect = [...TUYA_EF00_ONLY_CLUSTERS].sort((a, b) => a - b);
  if (norm.length !== expect.length) return false;
  return expect.every((v, i) => v === norm[i]);
}

/**
 * Soft compatibility for live interviews (P2573 / Michaelp #2244).
 * Accepts core EF00 (Basic+EF00 minimum) with optional Groups/Scenes + proprietary
 * extras (e.g. 0xED00=60672). Rejects when OnOff(6) or LevelControl(8) appear.
 *
 * @param {unknown} clusters
 * @returns {boolean}
 */
function isEf00OnlyCompatibleInterview(clusters) {
  if (!Array.isArray(clusters) || clusters.length === 0) return false;
  const set = new Set(
    clusters.map((c) => Number(c)).filter((n) => Number.isFinite(n)),
  );
  if (!set.has(0) || !set.has(61184)) return false;
  for (const bad of EF00_ONLY_FORBIDDEN_CLUSTERS) {
    if (set.has(bad)) return false;
  }
  return true;
}

/**
 * Compose must never require OnOff(6) for EF00-only couples.
 * @param {unknown} clusters
 * @returns {boolean}
 */
function composeForbidsOnOffCluster(clusters) {
  if (!Array.isArray(clusters)) return false;
  return !clusters.map(Number).includes(6);
}

/**
 * Compose is safe for an EF00-compatible interview when it does not demand
 * OnOff/Level and every required compose cluster exists on the interview
 * (extras on the interview are fine; extras required only in compose are not).
 *
 * @param {unknown} composeClusters
 * @param {unknown} interviewClusters
 * @returns {boolean}
 */
function composeCompatibleWithEf00Interview(composeClusters, interviewClusters) {
  if (!composeForbidsOnOffCluster(composeClusters)) return false;
  if (!isEf00OnlyCompatibleInterview(interviewClusters)) return false;
  const interview = new Set(
    (Array.isArray(interviewClusters) ? interviewClusters : [])
      .map(Number)
      .filter((n) => Number.isFinite(n)),
  );
  const compose = (Array.isArray(composeClusters) ? composeClusters : [])
    .map(Number)
    .filter((n) => Number.isFinite(n));
  // Never demand OnOff/Level from compose (already checked); refuse Level too
  if (compose.includes(8)) return false;
  return compose.every((id) => interview.has(id));
}

/**
 * @param {string} [mfr]
 * @returns {boolean}
 */
function isKnownEf00OnlyManufacturer(mfr) {
  return EF00_ONLY_MFR_RE.test(String(mfr || ''));
}

/**
 * Mark device as pure Tuya DP so Hybrid/ZCL OnOff is never preferred.
 * @param {object} device
 * @param {object} [opts]
 */
function forcePureTuyaDp(device, opts = {}) {
  if (!device || typeof device !== 'object') return false;
  const mfr = String(
    opts.mfr
    || device.getSetting?.('zb_manufacturer_name')
    || device.getData?.()?.manufacturerName
    || device.getManufacturerName?.()
    || ''
  );
  if (!opts.force && !isKnownEf00OnlyManufacturer(mfr)) return false;
  device._isPureTuyaDP = true;
  device._ef00OnlyInterview = true;
  device._forcePureTuyaDp = true;
  device._parallelDiscover = true;
  if (device._protocolInfo && typeof device._protocolInfo === 'object') {
    device._protocolInfo.isTuyaDP = true;
    device._protocolInfo.protocol = 'TUYA_DP';
    device._protocolInfo.preferDpTx = true;
    device._protocolInfo.parallelDiscover = true;
    device._protocolInfo.reason = `${device._protocolInfo.reason || 'detect'}+P2473_ef00_only`;
  }
  return true;
}

/**
 * P2574 — arm intelligent DP / ZCL / raw RX-TX when Homey interview is incomplete
 * or unsupported (missing native cluster methods). Soft, never throws.
 *
 * @param {object} device
 * @param {object} [zclNode]
 * @param {object} [opts]
 * @returns {Promise<{ok:boolean, compensated?:boolean, pfc?:boolean, pure?:boolean}>}
 */
async function armIncompleteInterviewCompensation(device, zclNode, opts = {}) {
  if (!device || typeof device !== 'object') return { ok: false };
  const out = { ok: true, compensated: false, pfc: false, pure: false };
  try {
    const forced = forcePureTuyaDp(device, { force: !!opts.force, mfr: opts.mfr });
    out.pure = !!forced || !!device._isPureTuyaDP;

    device._parallelDiscover = true;
    device._incompleteInterviewCompensated = true;

    try {
      const HomeyCompensationLayer = require('../io/HomeyCompensationLayer');
      const layer = device._homeyCompensation
        || new HomeyCompensationLayer(device, { io: device.io });
      device._homeyCompensation = layer;
      const node = zclNode || device.zclNode;
      await layer.attach(node, {
        negotiateMcu: opts.negotiateMcu !== false,
        skipMagic: opts.skipMagic === true,
        rescanDelayMs: opts.rescanDelayMs != null ? opts.rescanDelayMs : (opts.skipMagic ? 0 : 1500),
        extraClusters: [0xEF00, 0xED00, 0xEE00, 61184, 60672, 60928],
      });
      out.compensated = true;
    } catch (_e) { /* soft */ }

    try {
      const ProtocolFallbackChain = require('../io/ProtocolFallbackChain');
      if (!device._protocolFallbackChain) {
        device._protocolFallbackChain = new ProtocolFallbackChain(device, {
          io: device.io,
          compensation: device._homeyCompensation,
        });
      }
      device._p2473Pfc = device._p2473Pfc || device._protocolFallbackChain;
      out.pfc = true;
    } catch (_e) { /* soft */ }
  } catch (_e) {
    out.ok = false;
  }
  return out;
}

/**
 * Max TX cascade for EF00 DP when interview lacks OnOff — soft, never throws.
 * Order: manager.sendDP → sendDPWithConfirmation → _sendDPRaw → sendTuyaDP
 * → UniversalDPSender → ProtocolFallbackChain.transmit → device._sendTuyaDP
 *
 * @param {object} device
 * @param {number} dp
 * @param {*} value
 * @param {string} [type]
 * @returns {Promise<*>}
 */
async function sendEf00DpMaxFallback(device, dp, value, type = 'bool') {
  const manager = device?.tuyaEF00Manager || device?._tuyaEF00Manager;
  const errors = [];

  // Ensure BoundCluster / raw listen armed (Moes P2467 lesson)
  try {
    const zcl = device?.zclNode;
    if (manager && zcl && typeof manager.initialize === 'function' && !manager._p2473InitOnce) {
      await manager.initialize(zcl);
      manager._p2473InitOnce = true;
    }
  } catch (e) {
    errors.push(`initialize:${e.message}`);
  }

  if (manager) {
    if (typeof manager.sendDP === 'function') {
      try {
        const r = await manager.sendDP(dp, value, type, { retries: 1, timeout: 2500, expectEcho: false });
        if (r !== false) return r == null ? true : r;
      } catch (e) { errors.push(`sendDP:${e.message}`); }
    }
    if (typeof manager.sendDPWithConfirmation === 'function') {
      try {
        const r = await manager.sendDPWithConfirmation(dp, value, type, { retries: 1, timeout: 2500, expectEcho: false });
        if (r?.success) return true;
      } catch (e) { errors.push(`confirm:${e.message}`); }
    }
    if (typeof manager._sendDPRaw === 'function') {
      try {
        const r = await manager._sendDPRaw(dp, value, type);
        if (r) return true;
      } catch (e) { errors.push(`raw:${e.message}`); }
    }
    if (typeof manager.sendTuyaDP === 'function') {
      try {
        const typeId = ({ raw: 0, bool: 1, boolean: 1, value: 2, string: 3, enum: 4, bitmap: 5 })[String(type || 'bool').toLowerCase()] ?? 1;
        const r = await manager.sendTuyaDP(dp, typeId, value);
        if (r) return true;
      } catch (e) { errors.push(`sendTuyaDP:${e.message}`); }
    }
  }

  try {
    if (!device._universalDPSender) {
      const { UniversalDPSender } = require('../tuya/UniversalDPSender');
      device._universalDPSender = new UniversalDPSender(device);
    }
    const r = await device._universalDPSender.sendTuyaDP(dp, value, type);
    if (r) return true;
  } catch (e) { errors.push(`uds:${e.message}`); }

  try {
    const ProtocolFallbackChain = require('../io/ProtocolFallbackChain');
    const chain = device._p2473Pfc || new ProtocolFallbackChain(device, { io: device.io });
    device._p2473Pfc = chain;
    const out = await chain.transmit({ kind: 'dp', dp, value, opts: { type } });
    if (out?.ok) return out.result == null ? true : out.result;
  } catch (e) { errors.push(`pfc:${e.message}`); }

  if (typeof device._sendTuyaDP === 'function') {
    try {
      return await device._sendTuyaDP(dp, value, type);
    } catch (e) { errors.push(`_sendTuyaDP:${e.message}`); }
  }

  const err = new Error(`ef00_dp_${dp}_max_fallback_exhausted`);
  err.attempts = errors;
  throw err;
}

module.exports = {
  TUYA_EF00_ONLY_CLUSTERS,
  EF00_ONLY_FORBIDDEN_CLUSTERS,
  isEf00OnlyInterviewShape,
  isEf00OnlyCompatibleInterview,
  composeForbidsOnOffCluster,
  composeCompatibleWithEf00Interview,
  isKnownEf00OnlyManufacturer,
  forcePureTuyaDp,
  armIncompleteInterviewCompensation,
  sendEf00DpMaxFallback,
};
