#!/usr/bin/env node
'use strict';
// R20 identifier audit. Homey pairs on the EXACT manufacturerName/productId strings (case-sensitive),
// so compose lists keep the reported forms; this audit finds what exact matching hides:
//  1. malformed entries: whitespace/NUL padding, zero-width/invisible or non-ASCII characters;
//  2. hidden couple collisions: two drivers claim the same couple once case is ignored
//     (mfr case-insensitive, productId case-insensitive) although the raw strings differ;
//  3. pid case variants inside one driver (e.g. TS0601 + ts0601), informative only.
// Runtime matching stays tolerant at comparison time only (lib/utils/IdentifierMatch.js); data is
// never rewritten here. Usage: node tools/ci/identifier-audit.js [--json] [--baseline file]
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
// eslint-disable-next-line no-control-regex -- detecting NUL/control padding is the point
const INVISIBLE = /[\u0000-\u001f\u007f\u00a0\u00ad\u200b-\u200f\u2028-\u202f\u2060-\u206f\ufeff]/;
const NON_ASCII = /[^\x20-\x7e]/;

function audit(root = ROOT) {
  const malformed = [];
  const byKey = new Map();
  const pidVariants = [];
  for (const d of fs.readdirSync(path.join(root, 'drivers')).sort()) {
    const p = path.join(root, 'drivers', d, 'driver.compose.json');
    if (!fs.existsSync(p)) { continue; }
    const z = JSON.parse(fs.readFileSync(p, 'utf8')).zigbee || {};
    const mfrs = [].concat(z.manufacturerName || []);
    const pids = [].concat(z.productId || []);
    for (const s of [...mfrs, ...pids]) {
      if (typeof s !== 'string') { malformed.push({ driver: d, value: String(s), why: 'not a string' }); continue; }
      if (s !== s.trim()) { malformed.push({ driver: d, value: JSON.stringify(s), raw: s, why: 'leading/trailing whitespace' }); } else if (INVISIBLE.test(s)) { malformed.push({ driver: d, value: JSON.stringify(s), why: 'invisible/control character' }); } else if (NON_ASCII.test(s)) { malformed.push({ driver: d, value: JSON.stringify(s), why: 'non-ASCII character' }); }
    }
    const pidGroups = new Map();
    for (const pid of pids) { const k = String(pid).toUpperCase(); (pidGroups.get(k) || pidGroups.set(k, new Set()).get(k)).add(pid); }
    for (const [k, set] of pidGroups) { if (set.size > 1) { pidVariants.push({ driver: d, pid: k, forms: [...set] }); } }
    const mSet = new Set(mfrs.map((m) => String(m).toLowerCase()));
    for (const m of mSet) {
      for (const k of pidGroups.keys()) {
        const key = `${m}|${k}`;
        if (!byKey.has(key)) { byKey.set(key, []); }
        byKey.get(key).push({ driver: d, rawMfr: mfrs.filter((x) => String(x).toLowerCase() === m), rawPid: [...pidGroups.get(k)] });
      }
    }
  }
  const hidden = [];
  for (const [key, claims] of byKey) {
    if (claims.length < 2) { continue; }
    // hidden = no single raw (mfr, pid) pair is shared by all claimants: exact-string tools miss it
    const exactSets = claims.map((c) => new Set(c.rawMfr.flatMap((m) => c.rawPid.map((p) => `${m}|${p}`))));
    const sharedExact = [...exactSets[0]].some((x) => exactSets.every((s) => s.has(x)));
    if (!sharedExact) { hidden.push({ key, drivers: claims.map((c) => c.driver) }); }
  }
  return { malformed, hidden, pidVariants };
}

// P2965: intentional padded manufacturerNames live in a separate, sourced, additive allowlist
// (data/rules/padded-mfr-allowlist.json); the baseline stays shrink-only. A finding is accepted
// only when it is padding (not invisible/non-ASCII), the raw string is byte-identical to an entry
// AND it sits in that entry's driver. Case twins, other drivers and unlisted names still fail.
const DEFAULT_ALLOWLIST = path.join(ROOT, 'data', 'rules', 'padded-mfr-allowlist.json');

function loadAllowlist(file = DEFAULT_ALLOWLIST) {
  if (!file || !fs.existsSync(file)) { return []; }
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  const entries = Array.isArray(j) ? j : j.entries || [];
  for (const e of entries) {
    if (typeof e.value !== 'string' || e.value === e.value.trim() || !e.driver || !e.source || !e.source.url || !(e.decision || []).length) {
      throw new Error(`padded-mfr allowlist: invalid entry ${JSON.stringify(e)} (needs padded value, driver, source.url, decision)`);
    }
  }
  return entries;
}

function isAllowlisted(finding, entries) {
  if (!finding || finding.why !== 'leading/trailing whitespace' || typeof finding.raw !== 'string') { return false; }
  return entries.some((e) => e.driver === finding.driver && e.value === finding.raw);
}

function applyAllowlist(result, entries) {
  const allowed = result.malformed.filter((m) => isAllowlisted(m, entries));
  return { ...result, malformed: result.malformed.filter((m) => !isAllowlisted(m, entries)), allowlisted: allowed };
}

function freshVsBaseline(result, base) {
  const known = new Set([...(base.malformed || []).map((m) => `${m.driver}:${m.value}`), ...(base.hidden || []).map((h) => h.key)]);
  return [...result.malformed.map((m) => `${m.driver}:${m.value}`), ...result.hidden.map((h) => h.key)].filter((k) => !known.has(k));
}

module.exports = { audit, loadAllowlist, isAllowlisted, applyAllowlist, freshVsBaseline, DEFAULT_ALLOWLIST };

if (require.main === module) {
  const args = process.argv.slice(2);
  const ai = args.indexOf('--allowlist');
  const r = applyAllowlist(audit(), loadAllowlist(ai >= 0 ? args[ai + 1] : DEFAULT_ALLOWLIST));
  const bi = args.indexOf('--baseline');
  if (args.includes('--json')) { console.log(JSON.stringify(r, null, 1)); process.exit(0); }
  console.log(`[identifier-audit] malformed=${r.malformed.length} allowlisted-padded=${r.allowlisted.length} hidden-case-collisions=${r.hidden.length} pid-case-variants=${r.pidVariants.length}`);
  if (bi >= 0) {
    const base = JSON.parse(fs.readFileSync(args[bi + 1], 'utf8'));
    const fresh = freshVsBaseline(r, base);
    if (fresh.length) { console.error(`[identifier-audit] FAIL ${fresh.length} new:\n  ${fresh.slice(0, 30).join('\n  ')}`); process.exit(1); }
    console.log('[identifier-audit] OK 0 new vs baseline');
  }
}
