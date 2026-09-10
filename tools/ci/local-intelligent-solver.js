#!/usr/bin/env node
'use strict';

/**
 * P2438 — Local intelligent solver (no remote AI).
 * Cross-ref mfr+pid → DeviceFingerprintDB + compose clusters + known GH harvest.
 * Used by bug-report-processor / diag resolver / CI harvest tests.
 *
 * WHY: forfait burns on Grok/LLM triage while sacred couples already answer pairing bugs.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

const KNOWN_OPEN_COUPLES = [
  { issue: 540, mfr: '_TZ3000_blhvsaqf', pid: 'TS0001', driver: 'switch_1gang', note: 'BSEED zcl_only — update Test + re-pair' },
  { issue: 544, mfr: '_TZ3000_l9brjwau', pid: 'TS0002', driver: 'wall_switch_2gang_1way', note: 'P2455 wired BSEED — update Test + remove/re-pair' },
  { issue: 543, mfr: '_TZ3000_ptjcjise', pid: 'TS0002', driver: 'switch_2gang', note: 'was 1gang steal — locked 2gang' },
  { issue: 542, mfr: '_TZ3000_xk5udnd6', pid: 'TS0012', driver: 'wall_switch_2gang_1way', note: 'ep2 without Basic — update + re-pair' },
  { issue: 541, mfr: '_TZ3000_enmfaave', pid: 'TS0004', driver: 'switch_4gang', note: 'no required EF00 61184 — update + re-pair' },
  { issue: 533, mfr: '_TZE204_5slehgeo', pid: 'TS0601', driver: 'curtain_motor', note: 'Moes ZTS — EF00 re-arm P2436; not radiator' },
  { issue: 'a342c411', mfr: '_TZ3000_kaflzta4', pid: 'TS004F', driver: 'smart_knob', note: 'P2439 diag — force TS004F event 0x8004; not rotary knob skip' },
];

function extractFP(text) {
  return [...new Set(String(text || '').match(/_TZ[A-Z0-9]+_[a-z0-9]+/gi) || [])];
}

function extractPID(text) {
  return [...new Set(String(text || '').match(/\bTS[0-9]{4}[A-Z]?\b/g) || [])];
}

function readCompose(driverId) {
  const fp = path.join(ROOT, 'drivers', driverId, 'driver.compose.json');
  if (!fs.existsSync(fp)) return null;
  return JSON.parse(fs.readFileSync(fp, 'utf8'));
}

function lookupCouple(mfr, pid) {
  try {
    const DeviceFingerprintDB = require('../../lib/DeviceFingerprintDB');
    return DeviceFingerprintDB.lookup(mfr, pid);
  } catch {
    return null;
  }
}

function composeHasCouple(driverId, mfr, pid) {
  const c = readCompose(driverId);
  if (!c || !c.zigbee) return false;
  const mfrs = (c.zigbee.manufacturerName || []).map((x) => String(x).toLowerCase());
  const pids = (c.zigbee.productId || []).map((x) => String(x).toUpperCase());
  return mfrs.includes(String(mfr).toLowerCase()) && (!pid || pids.includes(String(pid).toUpperCase()));
}

function endpointClustersOk(driverId) {
  const c = readCompose(driverId);
  if (!c?.zigbee?.endpoints) return { ok: false, reason: 'no endpoints' };
  const eps = c.zigbee.endpoints;
  // Homey match: ep1 may have Basic; other eps should not require Basic(0) alone wrongly —
  // switch_4gang must not require EF00 61184 on all eps
  if (driverId === 'switch_4gang') {
    for (const [ep, conf] of Object.entries(eps)) {
      if ((conf.clusters || []).includes(61184)) {
        return { ok: false, reason: `ep${ep} still requires EF00 61184` };
      }
    }
  }
  if (driverId === 'wall_switch_2gang_1way' || driverId === 'switch_2gang') {
    const ep2 = eps['2'] || eps[2];
    if (ep2 && (ep2.clusters || []).includes(0)) {
      return { ok: false, reason: 'ep2 requires Basic(0) — pairing fail vs interview' };
    }
  }
  return { ok: true };
}

/**
 * @param {{ title?: string, body?: string, number?: number }} issue
 * @returns {object} local resolution plan (never posts)
 */
function solveIssueLocal(issue = {}) {
  const text = `${issue.title || ''}\n${issue.body || ''}`;
  const fps = extractFP(text);
  const pids = extractPID(text);
  const findings = [];
  let catalogOk = true;
  let needsRepair = false;
  let primaryDriver = null;

  for (const known of KNOWN_OPEN_COUPLES) {
    const hitFp = fps.some((f) => f.toLowerCase() === known.mfr.toLowerCase());
    const hitIssue = Number(issue.number) === known.issue;
    if (!hitFp && !hitIssue) continue;
    const pid = pids.find((p) => p.toUpperCase() === known.pid) || known.pid;
    const hit = lookupCouple(known.mfr, pid);
    const inCompose = composeHasCouple(known.driver, known.mfr, known.pid);
    const eps = endpointClustersOk(known.driver);
    const ok = !!(hit && hit.driver === known.driver && inCompose && eps.ok);
    if (!ok) catalogOk = false;
    needsRepair = true;
    primaryDriver = known.driver;
    findings.push({
      source: 'known_harvest',
      issue: known.issue,
      mfr: known.mfr,
      pid: known.pid,
      expectedDriver: known.driver,
      lookupDriver: hit && hit.driver,
      inCompose,
      endpoints: eps,
      ok,
      action: ok ? 'USER_UPDATE_TEST_AND_REPAIR' : 'CODE_FIX_REQUIRED',
      note: known.note,
    });
  }

  // Generic couple walk
  for (const mfr of fps) {
    for (const pid of pids.length ? pids : [undefined]) {
      if (!pid) continue;
      const hit = lookupCouple(mfr, pid);
      if (hit && hit.driver) {
        primaryDriver = primaryDriver || hit.driver;
        findings.push({
          source: 'fingerprint_db',
          mfr,
          pid,
          driver: hit.driver,
          ok: true,
          action: 'VERIFY_COMPOSE_AND_REPAIR',
        });
      }
    }
  }

  return {
    mode: 'local_no_ai',
    issue: issue.number || null,
    fps,
    pids,
    catalogOk,
    needsRepair,
    primaryDriver,
    findings,
    summary: catalogOk && findings.length
      ? `Catalog OK for ${findings.map((f) => f.mfr || f.expectedDriver).join(', ')} — user must update Homey Test + remove/re-pair`
      : findings.length
        ? 'Local solver found gaps — code fix required'
        : 'NEED_INTERVIEW — no mfr+pid couple locked',
    canAutoCodeFix: !catalogOk && findings.some((f) => f.action === 'CODE_FIX_REQUIRED'),
    shouldCallAI: false,
  };
}

function solveDiagTextLocal(text) {
  return solveIssueLocal({ title: 'diag', body: text });
}

if (require.main === module) {
  const arg = process.argv[2];
  let issue = { body: '' };
  if (arg && fs.existsSync(arg)) {
    issue = JSON.parse(fs.readFileSync(arg, 'utf8'));
  } else if (arg) {
    issue = { number: Number(arg), body: process.argv.slice(3).join(' ') };
  }
  const r = solveIssueLocal(issue);
  console.log(JSON.stringify(r, null, 2));
}

module.exports = {
  solveIssueLocal,
  solveDiagTextLocal,
  extractFP,
  extractPID,
  KNOWN_OPEN_COUPLES,
  composeHasCouple,
  endpointClustersOk,
  lookupCouple,
};
