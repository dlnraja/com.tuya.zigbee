#!/usr/bin/env node
'use strict';
/**
 * scripts/leads/coverage-audit.js — max-coverage audit for manufacturerNames we already support (P2793).
 *
 *   node scripts/leads/coverage-audit.js [--root=.] [--max=5] [--dry]
 *
 * For every manufacturerName already present in a driver, collects every productId paired with it
 * by an external source, and reports couples that no driver matches yet (Homey matches a couple when
 * the manufacturerName AND the productId are both listed by the same driver).
 *
 * External sources (exact couple only):
 *   - data/z2m_herdsman_cache.json: definitions with exactly ONE modelId (the couple is unambiguous);
 *   - data/leads/github-leads.json: snippet contains the exact manufacturerName and the single productId;
 *   - data/leads/image-ocr.json: one post naming exactly one manufacturerName and one productId.
 * Internal data (data/mfs_db.json modelIds, lib/tuya/fingerprints.json) is counted in the report but
 * never applied on its own: it was partly derived from our own drivers.
 *
 * STRICT RULE (the only case where a couple is written):
 *   1. exact couple in an external source, productId is not TS0601 (DP layouts differ per id);
 *   2. the manufacturerName already sits in driver(s) M (case-insensitive) — new manufacturerNames are
 *      handled by strict-apply.js;
 *   3. exactly ONE other driver T lists that productId, has the same Homey class as a driver in M,
 *      and adding the manufacturerName to T creates no couple already matched by M (no couple on two
 *      drivers);
 *   4. additive only: the manufacturerName strings already used in M (same case forms) are appended
 *      to T in driver.compose.json and app.json through a byte-identical JSON round-trip. Nothing is
 *      moved or removed.
 * Couples listed in data/leads/coverage-audit-hold.json (manual review) are never written.
 * Capped per run (--max). Applied couples are logged in data/leads/auto-applied.json (via: coverage-audit).
 */
const fs = require('fs');
const path = require('path');

const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const ROOT = path.resolve(arg('root', process.cwd()));
const MAX = Math.max(0, Number(arg('max', 5)));
const DRY = process.argv.includes('--dry');
const VALID_MFR = /^_T[A-Z0-9]{2,5}_[a-z0-9]{8}$/i;
const VALID_PID = /^TS[0-9]{3,4}[A-Z]?$/;
const GENERIC_PIDS = new Set(['TS0601']);

const lc = (s) => String(s || '').toLowerCase();
const uc = (s) => String(s || '').toUpperCase();
const readJson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };

function loadRoundTrip(file, compact) {
  const raw = fs.readFileSync(file, 'utf8');
  const obj = JSON.parse(raw);
  const dump = (o) => compact ? JSON.stringify(o) : JSON.stringify(o, null, 2);
  const nl = raw.endsWith('\n') ? '\n' : '';
  if (dump(obj) + nl !== raw) {return null;}
  return { obj, write: (o) => fs.writeFileSync(file, dump(o) + nl) };
}

function loadDrivers(root) {
  const drivers = new Map();
  const dir = path.join(root, 'drivers');
  for (const d of fs.readdirSync(dir)) {
    const j = readJson(path.join(dir, d, 'driver.compose.json'), null);
    const z = j && j.zigbee;
    if (!z || !Array.isArray(z.manufacturerName) || !z.manufacturerName.length) {continue;}
    drivers.set(d, {
      id: d,
      cls: j.class || '',
      mfrs: new Set(z.manufacturerName.map(lc)),
      raw: z.manufacturerName,
      pids: new Set((z.productId || []).map(uc)),
    });
  }
  return drivers;
}

function buildIndex(drivers) {
  const byMfr = new Map();
  const byPid = new Map();
  for (const d of drivers.values()) {
    for (const m of d.mfrs) { if (!byMfr.has(m)) {byMfr.set(m, new Set());} byMfr.get(m).add(d.id); }
    for (const p of d.pids) { if (!byPid.has(p)) {byPid.set(p, new Set());} byPid.get(p).add(d.id); }
  }
  return { byMfr, byPid };
}

const covered = (drivers, idx, mfr, pid) => [...idx.byMfr.get(lc(mfr)) || []].filter((d) => drivers.get(d).pids.has(uc(pid)));

/** Pure decision (unit-tested). */
function decide(drivers, idx, mfr, pid) {
  if (!VALID_MFR.test(mfr || '') || /x{6,}/i.test(mfr)) {return { status: 'skip', why: 'not a valid manufacturerName' };}
  const P = uc(pid);
  if (!VALID_PID.test(P)) {return { status: 'skip', why: 'no exact productId' };}
  const M = [...idx.byMfr.get(lc(mfr)) || []];
  if (!M.length) {return { status: 'skip', why: 'manufacturerName not supported yet (strict-apply domain)' };}
  if (covered(drivers, idx, mfr, P).length) {return { status: 'covered' };}
  if (GENERIC_PIDS.has(P)) {return { status: 'lead', why: `${P}: DP layout differs per id, needs a capture` };}
  const classes = new Set(M.map((d) => drivers.get(d).cls));
  const cands = [...idx.byPid.get(P) || []].filter((t) => !M.includes(t) && classes.has(drivers.get(t).cls));
  const safe = cands.filter((t) => ![...drivers.get(t).pids].some((p) => covered(drivers, idx, mfr, p).length));
  if (safe.length !== 1) {
    return { status: 'lead', why: safe.length ? `${safe.length} same-class drivers list ${P} (ambiguous: ${safe.join(', ')})` : cands.length ? `adding to ${cands.join(', ')} would put an existing couple on two drivers` : `no ${[...classes].join('/')} driver lists ${P}` };
  }
  return { status: 'apply', driver: safe[0], from: M };
}

function collect(root) {
  const out = [];
  const z2m = readJson(path.join(root, 'data/z2m_herdsman_cache.json'), { devices: [] });
  for (const d of z2m.devices || []) {
    if ((d.modelIds || []).length !== 1) {continue;}
    for (const m of d.mfrs || []) {out.push({ mfr: String(m).trim(), pid: d.modelIds[0], source: `z2m:${d.vendor || ''}/${d.model || ''}` });}
  }
  for (const l of readJson(path.join(root, 'data/leads/github-leads.json'), { leads: [] }).leads || []) {
    if ((l.pids || []).length !== 1) {continue;}
    const s = String(l.snippet || '');
    if (s.includes(l.mfr) && uc(s).includes(uc(l.pids[0]))) {out.push({ mfr: l.mfr, pid: l.pids[0], source: l.url });}
  }
  for (const e of readJson(path.join(root, 'data/leads/image-ocr.json'), { entries: [] }).entries || []) {
    if ((e.mfrs || []).length === 1 && (e.pids || []).length === 1) {out.push({ mfr: e.mfrs[0], pid: e.pids[0], source: e.post });}
  }
  return out;
}

function internalOnly(root, drivers, idx) {
  let n = 0;
  const fp = readJson(path.join(root, 'lib/tuya/fingerprints.json'), {});
  for (const [m, v] of Object.entries(fp)) {
    for (const p of (v && v.modelIds) || []) {if (VALID_PID.test(uc(p)) && idx.byMfr.has(lc(m)) && !covered(drivers, idx, m, p).length) {n++;}}
  }
  return n;
}

function apply(root, driver, strings) {
  const cf = path.join(root, 'drivers', driver, 'driver.compose.json');
  const c = loadRoundTrip(cf, false);
  const a = loadRoundTrip(path.join(root, 'app.json'), true);
  if (!c || !a) {return 'json round-trip not byte-identical, skipped';}
  const ad = (a.obj.drivers || []).find((d) => d.id === driver);
  if (!ad || !ad.zigbee || !Array.isArray(ad.zigbee.manufacturerName)) {return `driver ${driver} missing in app.json`;}
  for (const s of strings) {
    if (!c.obj.zigbee.manufacturerName.includes(s)) {c.obj.zigbee.manufacturerName.push(s);}
    if (!ad.zigbee.manufacturerName.includes(s)) {ad.zigbee.manufacturerName.push(s);}
  }
  if (!DRY) { c.write(c.obj); a.write(a.obj); }
  return null;
}

function main() {
  const hold = readJson(path.join(ROOT, 'data/leads/coverage-audit-hold.json'), { hold: {} }).hold || {};
  const drivers = loadDrivers(ROOT);
  const idx = buildIndex(drivers);
  const results = [];
  const seen = new Set();
  let applied = 0;
  const logFile = path.join(ROOT, 'data/leads/auto-applied.json');
  const log = readJson(logFile, { note: 'couples written by the strict-rule scripts; source kept', applied: [] });
  for (const c of collect(ROOT)) {
    const key = `${lc(c.mfr)}|${uc(c.pid)}`;
    if (seen.has(key)) {continue;}
    seen.add(key);
    const d = decide(drivers, idx, c.mfr, c.pid);
    if (d.status === 'apply' && hold[key]) { results.push({ ...c, status: 'lead', why: `held: ${hold[key]}` }); continue; }
    if (d.status === 'apply') {
      if (applied >= MAX) { results.push({ ...c, status: 'lead', why: `run cap ${MAX} reached (eligible for ${d.driver})` }); continue; }
      const strings = [...new Set(d.from.flatMap((m) => drivers.get(m).raw.filter((s) => lc(s) === lc(c.mfr))))];
      const err = apply(ROOT, d.driver, strings);
      if (err) { results.push({ ...c, status: 'lead', why: err }); continue; }
      applied++;
      const t = drivers.get(d.driver);
      for (const s of strings) {t.raw.push(s);}
      t.mfrs.add(lc(c.mfr));
      idx.byMfr.get(lc(c.mfr)).add(d.driver);
      results.push({ ...c, status: 'applied', driver: d.driver, alsoIn: d.from });
      log.applied.push({ mfr: c.mfr, pid: uc(c.pid), driver: d.driver, source: c.source, via: 'coverage-audit', date: new Date().toISOString().slice(0, 10) });
    } else if (d.status !== 'skip') {
      results.push({ ...c, status: d.status, why: d.why });
    }
  }
  const counts = results.reduce((m, r) => { m[r.status] = (m[r.status] || 0) + 1; return m; }, {});
  const summary = { generated: new Date().toISOString().slice(0, 10), applied, counts, internalOnlyUncovered: internalOnly(ROOT, drivers, idx) };
  if (!DRY) {
    if (applied) {fs.writeFileSync(logFile, `${JSON.stringify(log, null, 1)}\n`);}
    fs.writeFileSync(path.join(ROOT, 'data/leads/coverage-audit-report.json'), `${JSON.stringify({ ...summary, results: results.filter((r) => r.status !== 'covered') }, null, 1)}\n`);
  }
  console.log(JSON.stringify(summary));
  if (process.env.GITHUB_OUTPUT) {fs.appendFileSync(process.env.GITHUB_OUTPUT, `applied=${applied}\n`);}
}

module.exports = { decide, loadDrivers, buildIndex, collect };
if (require.main === module) {try { main(); } catch (e) { console.error(`coverage-audit: ${e.message}`); process.exit(0); }}
