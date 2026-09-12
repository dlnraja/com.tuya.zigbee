'use strict';

/**
 * P2473 — EF00-only interview shape (Joep Insoma / Moes ZTS / FrankEver Tuya valves)
 *
 * WHY: Homey pairs Unknown when compose requires clusters the interview lacks
 * (classic: OnOff `6` while device is `[0,4,5,61184]` only). Compensate TX/RX
 * with pure EF00 + raw fallback — never invent ZCL OnOff for these couples.
 *
 * Track: BOTH (pairing reliability).
 */

/** Canonical Homey-matched cluster list for Tuya MCU EF00-only interviews. */
const TUYA_EF00_ONLY_CLUSTERS = Object.freeze([0, 4, 5, 61184]);

const EF00_ONLY_MFR_RE = /fhvpaltk|eaet5qt5|5slehgeo|wt9agwf3|5uodvhgc|1n2zev06|nbqnmkee|icka1clh|fodv6bkr|libht6ua/i;

/**
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
 * Compose must never require OnOff(6) for EF00-only couples.
 * @param {unknown} clusters
 * @returns {boolean}
 */
function composeForbidsOnOffCluster(clusters) {
  if (!Array.isArray(clusters)) return false;
  return !clusters.map(Number).includes(6);
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
  if (device._protocolInfo && typeof device._protocolInfo === 'object') {
    device._protocolInfo.isTuyaDP = true;
    device._protocolInfo.protocol = 'TUYA_DP';
    device._protocolInfo.reason = `${device._protocolInfo.reason || 'detect'}+P2473_ef00_only`;
  }
  return true;
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
  isEf00OnlyInterviewShape,
  composeForbidsOnOffCluster,
  isKnownEf00OnlyManufacturer,
  forcePureTuyaDp,
  sendEf00DpMaxFallback,
};
