'use strict';

/**
 * UnknownCaseRealigner (P2218) — runtime bridge for incomplete / imprecise cases.
 *
 * Soft-realigns when mfr, pid, clusters, or DPs are unknown.
 * Never invents sacred-couple hard locks; stores soft hypotheses on device store.
 */

const {
  resolveUnknownCouple,
  resolveSymptomOnly,
  runtimeUnknownHints,
  loadHeuristicModel,
} = require('../enrichment/HeuristicUnknownResolver');

const STORE_KEY = 'p2218_unknown_realign';

function safeLog(device, msg) {
  try { device?.log?.(msg); } catch { /* ignore */ }
}

/**
 * @param {object} device Homey ZigBee device instance
 * @param {object} opts
 * @param {string} [opts.mfr]
 * @param {string} [opts.pid]
 * @param {string[]} [opts.candidates] optional {pid,driver,confidence,source}[]
 * @param {string[]} [opts.issues]
 * @param {string} [opts.contextText]
 */
function realignIncompleteIdentity(device, opts = {}) {
  const mfr = opts.mfr || device?.getData?.()?.manufacturerName
    || device?.zclNode?.endpoints?.[1]?.clusters?.basic?.attrs?.manufacturerName;
  const pid = opts.pid || device?.getData?.()?.productId
    || device?.zclNode?.endpoints?.[1]?.clusters?.basic?.attrs?.modelId;

  if (mfr && pid) {
    return { ok: true, mode: 'known-couple', couple: `${mfr}+${pid}`, soft: false };
  }

  if (mfr && !pid) {
    const ranked = resolveUnknownCouple({
      mfr,
      candidates: opts.candidates || [],
      postText: opts.contextText || '',
      issues: opts.issues || [],
      context: {},
    });
    const soft = ranked.softHypothesis || ranked.preferred;
    if (soft && device?.setStoreValue) {
      try {
        device.setStoreValue(STORE_KEY, {
          at: Date.now(),
          soft,
          tier: ranked.tier,
          protocolHint: ranked.protocolHint,
        });
      } catch { /* store optional */ }
    }
    safeLog(device, `[P2218] Incomplete identity — ${ranked.userGuidance}`);
    return {
      ok: true,
      mode: 'missing-pid',
      soft,
      tier: ranked.tier,
      protocolHint: ranked.protocolHint,
      playbook: ranked.playbook,
      softOnly: true,
    };
  }

  const symptom = resolveSymptomOnly({
    issues: opts.issues || [],
    catalogUser: null,
    issueModel: null,
  });
  safeLog(device, `[P2218] No mfr/pid — ${symptom.userGuidance}`);
  return { ok: true, mode: 'symptom-only', ...symptom, softOnly: true };
}

/**
 * Unknown DP RX: follow playbook — log, range-detect, no TX until confirmed.
 */
function realignUnknownDp(device, dpId, value, dpType) {
  const hints = runtimeUnknownHints('runtimeUnknownDp');
  const model = loadHeuristicModel();
  safeLog(device, `[P2218] Unknown DP ${dpId} type=${dpType} — playbook: ${(hints.playbook || []).slice(0, 2).join('; ')}`);

  let store = null;
  try { store = device?.getStoreValue?.(STORE_KEY) || {}; } catch { store = {}; }
  const seen = store.unknownDps || {};
  seen[String(dpId)] = {
    lastValue: value,
    type: dpType,
    at: Date.now(),
    count: (seen[String(dpId)]?.count || 0) + 1,
  };
  try {
    device?.setStoreValue?.(STORE_KEY, { ...store, unknownDps: seen });
  } catch { /* optional */ }

  return {
    ok: true,
    softOnly: true,
    allowTx: false,
    playbook: hints.playbook,
    tiers: model.confidenceTiers,
    sightings: seen[String(dpId)]?.count || 1,
  };
}

module.exports = {
  STORE_KEY,
  realignIncompleteIdentity,
  realignUnknownDp,
  runtimeUnknownHints,
};
