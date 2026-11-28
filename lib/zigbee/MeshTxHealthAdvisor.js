'use strict';

/**
 * MeshTxHealthAdvisor (P3403)
 *
 * Strictly read-only diagnostic helper: never sends Zigbee TX.
 * Warns in device logs when a sleepy battery device accumulates >30% TX errors
 * (e.g. TS0043 routing through a weak hop), advising a closer mains router or
 * re-pairing in the device's final location.
 */

const DEFAULT_THRESHOLD = 0.30;
const DEFAULT_MIN_TX = 10;
const DEFAULT_COOLDOWN_MS = 6 * 60 * 60 * 1000;

const PAIRING_TIPS = Object.freeze({
  en: 'Tap the button every 2s until the interview finishes, and pair the device in its final location.',
  fr: 'Appuyez brievement sur le bouton toutes les 2 s jusqu a la fin de l interview, et appairez l appareil a son emplacement final.',
});

function getSleepyPairingTip(lang = 'en') {
  return PAIRING_TIPS[String(lang || 'en').toLowerCase().slice(0, 2)] || PAIRING_TIPS.en;
}

function readTxCounters(device, zclNode) {
  const candidates = [
    zclNode && zclNode._node,
    zclNode,
    device && device.node,
    device && device._txStats,
  ];
  for (const c of candidates) {
    if (!c || typeof c !== 'object') { continue; }
    const txErrors = Number(c.txErrors ?? c.txErrorCount ?? c.errors ?? NaN);
    const txTotal = Number(c.txCount ?? c.txTotal ?? c.tx ?? NaN);
    if (Number.isFinite(txErrors) && Number.isFinite(txTotal) && txTotal > 0) {
      return { txErrors: Math.max(0, txErrors), txTotal };
    }
  }
  return null;
}

function evaluateTxHealth(counters, opts = {}) {
  if (!counters || typeof counters !== 'object') {
    return { warn: false, rate: 0, txErrors: 0, txTotal: 0 };
  }
  const threshold = Number(opts.threshold) > 0 ? Number(opts.threshold) : DEFAULT_THRESHOLD;
  const minTx = Number(opts.minTx) > 0 ? Number(opts.minTx) : DEFAULT_MIN_TX;
  const txErrors = Math.max(0, Number(counters.txErrors) || 0);
  const txTotal = Math.max(0, Number(counters.txTotal) || 0);
  if (txTotal < minTx) {
    return { warn: false, rate: txTotal > 0 ? txErrors / txTotal : 0, txErrors, txTotal };
  }
  const rate = txErrors / txTotal;
  return { warn: rate > threshold, rate, txErrors, txTotal };
}

function adviseMeshTxHealth(device, zclNode, opts = {}) {
  try {
    if (!device || typeof device !== 'object') { return false; }
    const counters = opts.counters || readTxCounters(device, zclNode);
    const res = evaluateTxHealth(counters, opts);
    if (!res.warn) { return false; }

    const now = typeof opts.now === 'number' ? opts.now : Date.now();
    const cooldownMs = Number(opts.cooldownMs) > 0 ? Number(opts.cooldownMs) : DEFAULT_COOLDOWN_MS;
    if (device._lastMeshTxHealthLogAt && now - device._lastMeshTxHealthLogAt < cooldownMs) {
      return false;
    }
    device._lastMeshTxHealthLogAt = now;
    const pct = Math.round(res.rate * 100);
    if (typeof device.log === 'function') {
      device.log(
        `[MESH-HEALTH] High TX error rate (${pct}%, ${res.txErrors}/${res.txTotal}) - place a mains-powered Zigbee router closer or re-pair in final location`,
      );
    }
    return true;
  } catch (_e) {
    return false;
  }
}

module.exports = {
  DEFAULT_THRESHOLD,
  DEFAULT_MIN_TX,
  DEFAULT_COOLDOWN_MS,
  getSleepyPairingTip,
  readTxCounters,
  evaluateTxHealth,
  adviseMeshTxHealth,
};
