'use strict';

/**
 * HeuristicUnknownResolver (P2218 / P2228)
 *
 * Predictive / heuristic ranking when mfr+pid or symptoms are incomplete.
 * Soft hypotheses never become sacred-couple hard locks without hardLock confidence.
 *
 * APP vs CI (P2228):
 * - Homey runtime loads `lib/helpers/data/heuristic-model.json` (bundled).
 * - CI may enrich from `config/enrichment/models/heuristic-model.json` (not in Homey package).
 */

const fs = require('fs');
const path = require('path');

const RUNTIME_MODEL = path.join(__dirname, '..', 'helpers', 'data', 'heuristic-model.json');

function loadHeuristicModel() {
  // 1) Homey-bundled runtime model (preferred on device)
  try {
    if (fs.existsSync(RUNTIME_MODEL)) return JSON.parse(fs.readFileSync(RUNTIME_MODEL, 'utf8'));
  } catch { /* try CI */ }
  // 2) CI-only enrichment config (absent from Homey .homeyignore)
  try {
    const { resolve, loadJson } = require('./EnrichmentRegistry');
    const m = loadJson(resolve('config/enrichment/models/heuristic-model.json'));
    if (m && m.confidenceTiers) return m;
  } catch { /* EnrichmentRegistry is CI-only */ }
  // 3) Minimal safe defaults — never invent hard locks
  return {
    confidenceTiers: {
      hardLock: { min: 92, action: 'resolve-and-stub', catalogWrite: true },
      softHypothesis: { min: 70, action: 'prefer-candidate', catalogWrite: false },
      weakHint: { min: 45, action: 'rank-only', catalogWrite: false },
      unknown: { min: 0, action: 'observe-and-realign', catalogWrite: false },
    },
    symptomPidBoosts: [],
    mfrPrefixHints: [
      { prefix: '_TZE284_', defaultPid: 'TS0601', protocol: 'ef00', confidence: 55 },
      { prefix: '_TZE204_', defaultPid: 'TS0601', protocol: 'ef00', confidence: 50 },
      { prefix: '_TZE200_', defaultPid: 'TS0601', protocol: 'ef00', confidence: 50 },
    ],
    unknownPlaybook: {
      missingPid: ['Observe RX — never invent pid'],
      runtimeUnknownDp: ['Log unknown DP — no guessed TX'],
    },
    peerFleetBoost: { enabled: false },
  };
}

function coupleKey(mfr, pid) {
  return `${String(mfr || '').toLowerCase()}+${String(pid || '').toUpperCase()}`;
}

function textBlob(parts) {
  return parts.filter(Boolean).map((p) => String(p)).join('\n').toLowerCase();
}

function tierFor(confidence, model) {
  const tiers = model.confidenceTiers || {};
  const ordered = ['hardLock', 'softHypothesis', 'weakHint', 'unknown'];
  for (const name of ordered) {
    const t = tiers[name];
    if (t && confidence >= (t.min || 0)) return { name, ...t };
  }
  return { name: 'unknown', action: 'observe-and-realign', catalogWrite: false, min: 0 };
}

function applySymptomBoosts(candidates, blob, model) {
  const boosts = model.symptomPidBoosts || [];
  for (const rule of boosts) {
    const hit = (rule.match || []).some((re) => new RegExp(re, 'i').test(blob));
    if (!hit) continue;
    for (const c of candidates) {
      let b = 0;
      if (rule.preferPids?.some((p) => String(c.pid).toUpperCase() === String(p).toUpperCase())) {
        b = Math.max(b, rule.boost || 0);
      }
      if (rule.preferDrivers?.some((d) => c.driver === d)) {
        b = Math.max(b, Math.floor((rule.boost || 0) * 0.75));
      }
      if (b) c.confidence = Math.min(99, (c.confidence || 0) + b);
    }
  }
  return candidates;
}

function applyMfrPrefixHint(mfr, candidates, model) {
  const hints = model.mfrPrefixHints || [];
  const m = String(mfr || '');
  for (const h of hints) {
    if (!m.startsWith(h.prefix)) continue;
    if (h.defaultPid && !candidates.some((c) => String(c.pid).toUpperCase() === h.defaultPid)) {
      candidates.push({
        mfr,
        pid: h.defaultPid,
        source: 'mfr-prefix-heuristic',
        driver: null,
        confidence: h.confidence || 40,
        softOnly: true,
      });
    } else if (h.defaultPid) {
      for (const c of candidates) {
        if (String(c.pid).toUpperCase() === h.defaultPid) {
          c.confidence = Math.min(99, (c.confidence || 0) + 5);
        }
      }
    }
    return { protocol: h.protocol, prefix: h.prefix };
  }
  return null;
}

function applyPeerFleetBoost(candidates, context, model, mfr) {
  const peer = model.peerFleetBoost || {};
  if (!peer.enabled) return candidates;
  const catalog = context.catalog?.users || {};
  const mfrL = String(mfr || '').toLowerCase();
  let peers = 0;
  for (const user of Object.values(catalog)) {
    if (peers >= (peer.maxPeers || 5)) break;
    for (const d of user.devices || []) {
      const [dm, dp] = String(d.couple || '').split('+');
      if (!dm || String(dm).toLowerCase() !== mfrL || !dp) continue;
      peers += 1;
      for (const c of candidates) {
        if (String(c.pid).toUpperCase() === String(dp).toUpperCase()) {
          c.confidence = Math.min(99, (c.confidence || 0) + (peer.sameSymptomOtherUsersBoost || 6));
        }
      }
    }
  }
  return candidates;
}

/**
 * Re-rank candidates + emit soft/hard decision.
 * @returns {{ candidates, preferred, tier, softHypothesis, protocolHint, playbook }}
 */
function resolveUnknownCouple({ mfr, candidates = [], postText = '', issues = [], context = {}, model: modelIn }) {
  const model = modelIn || loadHeuristicModel();
  const blob = textBlob([postText, ...(issues || [])]);
  let list = (candidates || []).map((c) => ({ ...c }));

  applySymptomBoosts(list, blob, model);
  const protocolHint = applyMfrPrefixHint(mfr, list, model);
  applyPeerFleetBoost(list, context, model, mfr);

  // Dedup by couple key, keep highest confidence
  const byKey = new Map();
  for (const c of list) {
    const k = coupleKey(c.mfr || mfr, c.pid);
    const prev = byKey.get(k);
    if (!prev || (c.confidence || 0) > (prev.confidence || 0)) byKey.set(k, c);
  }
  list = [...byKey.values()].sort((a, b) => (b.confidence || 0) - (a.confidence || 0));

  const top = list[0] || null;
  const second = list[1] || null;
  const gap = top && second ? (top.confidence || 0) - (second.confidence || 0) : 99;
  const conf = top?.confidence || 0;
  let tier = tierFor(conf, model);

  // Soft-only prefix hints never hard-lock
  if (top?.softOnly || top?.source === 'mfr-prefix-heuristic') {
    if (tier.name === 'hardLock') tier = { ...model.confidenceTiers.softHypothesis, name: 'softHypothesis' };
  }

  // Multi-candidate with tiny gap → demote to soft / weak
  if (list.length > 1 && gap < 8 && tier.name === 'hardLock') {
    tier = { ...model.confidenceTiers.softHypothesis, name: 'softHypothesis' };
  }

  const softHypothesis = top ? {
    mfr: top.mfr || mfr,
    pid: top.pid,
    driver: top.driver,
    confidence: conf,
    source: top.source,
    tier: tier.name,
    catalogWrite: !!tier.catalogWrite,
  } : null;

  const preferred = tier.catalogWrite && softHypothesis ? softHypothesis : null;

  return {
    candidates: list,
    preferred,
    softHypothesis: preferred ? null : softHypothesis,
    tier: tier.name,
    protocolHint,
    playbook: model.unknownPlaybook?.missingPid || [],
    userGuidance: preferred
      ? `Heuristic hard prefer ${preferred.mfr}+${preferred.pid} → ${preferred.driver || '?'} (${conf}%)`
      : softHypothesis
        ? `Soft hypothesis ${softHypothesis.mfr}+${softHypothesis.pid} (${conf}% ${tier.name}) — verify interview before lock`
        : 'No ranked couple — observe clusters/DP RX; never invent pid',
  };
}

/**
 * Symptom-only posts (no mfr/pid): map issues → likely drivers / fix refs.
 */
function resolveSymptomOnly({ issues = [], catalogUser, issueModel, model: modelIn }) {
  const model = modelIn || loadHeuristicModel();
  const drivers = new Set();
  const fixRefs = [];
  for (const issue of issues) {
    const im = issueModel?.issues?.[issue];
    if (im?.drivers) im.drivers.forEach((d) => drivers.add(d));
    if (im?.fixRefs) fixRefs.push(...im.fixRefs);
  }
  for (const d of catalogUser?.devices || []) {
    if (d.driver) drivers.add(d.driver);
  }
  return {
    tier: 'softHypothesis',
    likelyDrivers: [...drivers].slice(0, 8),
    fixRefs: [...new Set(fixRefs)],
    playbook: model.unknownPlaybook?.missingCoupleEntirely || [],
    userGuidance: drivers.size
      ? `Symptom heuristic → drivers: ${[...drivers].slice(0, 4).join(', ')} — update Test; re-pair if wrong driver`
      : 'Symptom-only — update Test soak; send diag UUID when possible',
  };
}

/**
 * Runtime-facing unknown DP / device realignment hints (shared with app helpers).
 */
function runtimeUnknownHints(kind = 'runtimeUnknownDp') {
  const model = loadHeuristicModel();
  return {
    playbook: model.unknownPlaybook?.[kind] || model.unknownPlaybook?.runtimeUnknownDevice || [],
    tiers: model.confidenceTiers,
  };
}

module.exports = {
  loadHeuristicModel,
  resolveUnknownCouple,
  resolveSymptomOnly,
  runtimeUnknownHints,
  tierFor,
};
