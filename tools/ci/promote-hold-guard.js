'use strict';
/**
 * P3057-2 (26/10/2026): promote guard for the P3036 publish hold.
 *
 * WHY: on 25/10 a [skip ci] autonomous Bastien→master/stable promote (P2607) carried P3038c sacred
 * pins while master's send was still pending at Athom; CI never saw it and the next send would have
 * shipped an unreviewed behaviour change. Rule (owner): while a hold window or a pending send is
 * active on the TARGET, only data-safety and CI fixes may pass.
 *
 * holdState({ app, appVersion, now, cfg, outcomes, builds }) -> { active, reasons[] }
 *   - cfg.holds[{app, until}] with until in the future                      -> active (window)
 *   - appVersion > last accepted version (ledger + build snapshot, states
 *     test/live/approved) for that app                                     -> active (pending send)
 *   - unreadable version/ledger                                             -> active (fail closed)
 * isHoldAllowed(rel, cfg): test/**, .github/**, tools/ci/**, scripts/ci/**, docs/**, *.md and
 *   cfg.dataSafetyAllow prefixes. Everything else (drivers/**, app.json, sacred keep, lib/**) waits.
 * guardPublishHold(rootDir, applied, originals, state, cfg): restores disallowed files and returns
 *   { kept, reverted[{rel, reason:'publish_hold_active'}] }.
 */
const fs = require('fs');
const path = require('path');

const CI_ONLY_RE = /^(test|\.github|tools\/ci|scripts\/ci|docs)\//;
const ACCEPTED_RE = /^(test|live|approved)$/i;
const APP_KEYS = { 'com.dlnraja.tuya.zigbee': 'master', 'com.dlnraja.tuya.zigbee.stable': 'stable', 'com.dlnraja.tuya.zigbee.bastien': 'bastien' };

function cmpVersion(a, b) {
  const pa = String(a || '').split('.').map((x) => parseInt(x, 10) || 0);
  const pb = String(b || '').split('.').map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) {return d > 0 ? 1 : -1;}
  }
  return 0;
}

function lastAccepted(app, outcomes = [], builds = []) {
  let best = null;
  const take = (v) => { if (v && (!best || cmpVersion(v, best) > 0)) {best = String(v);} };
  for (const e of outcomes) {
    const key = e.app || APP_KEYS[e.app_id];
    if (key === app && ACCEPTED_RE.test(String(e.state || ''))) {take(e.version);}
  }
  for (const b of builds) {if (ACCEPTED_RE.test(String(b.state || ''))) {take(b.version);}}
  return best;
}

function holdState({ app, appVersion, now = Date.now(), cfg = {}, outcomes = [], builds = [] } = {}) {
  const reasons = [];
  const nowMs = typeof now === 'number' ? now : Date.parse(now);
  for (const h of cfg.holds || []) {
    const until = Date.parse(h.until || '');
    if (h.app === app && Number.isFinite(until) && until > nowMs) {reasons.push(`hold window until ${h.until}: ${h.reason || ''}`.trim());}
  }
  if (!appVersion) {reasons.push('target app version unreadable (fail closed)');}
  else {
    const acc = lastAccepted(app, outcomes, builds);
    if (!acc) {reasons.push(`no accepted ${app} build on record (fail closed)`);}
    else if (cmpVersion(appVersion, acc) > 0) {reasons.push(`pending send: ${app} v${appVersion} > last accepted v${acc}`);}
  }
  return { active: reasons.length > 0, reasons };
}

function isHoldAllowed(rel, cfg = {}) {
  const r = String(rel || '').replace(/\\/g, '/');
  if (CI_ONLY_RE.test(r) || /^[^/]+\.md$/.test(r)) {return true;}
  return (cfg.dataSafetyAllow || []).some((p) => p.endsWith('/') ? r.startsWith(p) : r === p);
}

function readJson(abs, fallback) { try { return JSON.parse(fs.readFileSync(abs, 'utf8')); } catch { return fallback; } }

/**
 * Reads the target tree's app.json (+ optional CI build snapshot) and the hold config / ledger from
 * metaRoot (the master checkout running the promote; stable-v5 may not carry them).
 */
function loadHoldInputs(rootDir, app, metaRoot = rootDir) {
  const appJson = readJson(path.join(rootDir, 'app.json'), {});
  const cfg = readJson(path.join(metaRoot, 'config', 'promote-publish-hold.json'), {});
  let outcomes = [];
  try {
    outcomes = fs.readFileSync(path.join(metaRoot, 'docs', 'knowledge', 'athom-publish-outcomes.jsonl'), 'utf8')
      .split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  } catch { /* fail closed below: no accepted build */ }
  const snapRel = path.join('data', 'status', `homey-build-status-${appJson.id}.json`);
  const snap = readJson(path.join(rootDir, snapRel), null) || readJson(path.join(metaRoot, snapRel), null);
  const builds = snap ? Array.isArray(snap) ? snap : snap.builds || snap.recent || [] : [];
  return { app, appVersion: appJson.version, cfg, outcomes, builds };
}

function guardPublishHold(rootDir, applied, originals, state, cfg = {}) {
  if (!state || !state.active) {return { kept: applied, reverted: [] };}
  const kept = [];
  const reverted = [];
  for (const a of applied) {
    if (isHoldAllowed(a.rel, cfg)) { kept.push(a); continue; }
    const abs = path.join(rootDir, a.rel);
    const before = originals.get(a.rel);
    if (before == null) {fs.rmSync(abs, { force: true });}
    else {fs.writeFileSync(abs, before);}
    reverted.push({ rel: a.rel, reason: 'publish_hold_active', hold: state.reasons.join('; ') });
  }
  return { kept, reverted };
}

module.exports = { cmpVersion, lastAccepted, holdState, isHoldAllowed, loadHoldInputs, guardPublishHold, CI_ONLY_RE };
