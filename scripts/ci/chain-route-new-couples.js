#!/usr/bin/env node
'use strict';
// WHY(P3243, 02/11/2026 Paris): only kb/apply-batch and leads/strict-apply routed new couples through the
// chain (P3223 firstNonFull). Every other enrich/autofix writer (fork scans, bug-report PRs, monthly scans)
// appended to the ROOT driver even when the root is marked full (P3206), which grew the root past its
// combo budget and made a later continuation lose couples at release (P3229 zero-loss). This router runs
// in safe-auto-commit before the gates: a manufacturer that is NEW in this commit (absent from HEAD) on a
// root marked full is moved to the first chain driver with room, with only the pids it needs (new pids of
// the diff, else its sourced pids). Couples already in HEAD never move (paired devices stay). A new mfr
// whose pids are unknown stays on the root (never guessed) and is reported. Additive overall: 0 couple lost.
// Usage: node scripts/ci/chain-route-new-couples.js [--apply] [--base=HEAD]
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const lc = (s) => String(s || '').trim().toLowerCase();
const arr = (v) => [].concat(v || []);

/** Pure. now/base = { mfrs, pids } of the root; sourcedPids(mfr) -> [pid]. Returns moves. */
function planRoute({ now, base, sourcedPids = () => [] }) {
  const baseM = new Set(arr(base.mfrs).map(lc));
  const baseP = new Set(arr(base.pids).map(lc));
  const newPids = arr(now.pids).filter((p) => !baseP.has(lc(p)));
  const moves = [];
  const stay = [];
  const seen = new Set();
  for (const m of arr(now.mfrs)) {
    const k = lc(m);
    if (baseM.has(k) || seen.has(k)) {continue;}
    seen.add(k);
    const forms = arr(now.mfrs).filter((x) => lc(x) === k);
    const nowP = new Set(arr(now.pids).map(lc));
    const pids = newPids.length ? newPids : arr(sourcedPids(k)).filter((p) => nowP.has(lc(p)));
    if (pids.length) {moves.push({ mfr: k, forms, pids });} else {stay.push(k);}
  }
  return { moves, stay };
}

function readCompose(id, root = ROOT) { try { return JSON.parse(fs.readFileSync(path.join(root, 'drivers', id, 'driver.compose.json'), 'utf8')); } catch (_) { return null; } }
function baseCompose(id, ref, root = ROOT) {
  const r = spawnSync('git', ['show', `${ref}:drivers/${id}/driver.compose.json`], { cwd: root, encoding: 'utf8', maxBuffer: 64 << 20 });
  try { return r.status === 0 ? JSON.parse(r.stdout) : null; } catch (_) { return null; }
}

function applyMove(z, tz, mv) {
  z.manufacturerName = arr(z.manufacturerName).filter((x) => lc(x) !== mv.mfr);
  tz.manufacturerName = arr(tz.manufacturerName);
  for (const f of mv.forms) {if (!tz.manufacturerName.includes(f)) {tz.manufacturerName.push(f);}}
  tz.productId = arr(tz.productId);
  for (const p of mv.pids) {if (!tz.productId.some((x) => lc(x) === lc(p))) {tz.productId.push(p);}}
}

function main(argv) {
  const apply = argv.includes('--apply');
  const ref = (argv.find((x) => x.startsWith('--base=')) || '--base=HEAD').slice(7);
  let DC;
  try { DC = require(path.join(ROOT, 'lib', 'drivers', 'DriverContinuations')); } catch (_) { console.log('[chain-route] no DriverContinuations on this branch: skip'); return 0; }
  if (DC.clearCache) {DC.clearCache();}
  const reg = DC.load(ROOT);
  let sourced = null;
  const sourcedPids = (m) => {
    if (!sourced) { sourced = new Map(); try { const { loadSourcedCouples } = require(path.join(ROOT, 'scripts', 'maintenance', 'publish-sourced-restore.cjs')); for (const k of loadSourcedCouples(ROOT).keys()) { const [mm, p] = String(k).split('|'); if (!sourced.has(mm)) {sourced.set(mm, []);} sourced.get(mm).push(p); } } catch (_) { /* no sources */ } }
    return sourced.get(m) || [];
  };
  const appF = path.join(ROOT, 'app.json');
  let app = null;
  let moved = 0;
  for (const id of Object.keys(reg.drivers || {})) {
    if (!reg.entry(id).full || reg.isContinuation(id)) {continue;}
    const target = reg.firstNonFull(id);
    if (!target || target === id) {continue;}
    const now = readCompose(id); const base = baseCompose(id, ref); const tc = readCompose(target);
    if (!now || !base || !tc || !now.zigbee || !tc.zigbee) {continue;}
    const r = planRoute({ now: { mfrs: now.zigbee.manufacturerName, pids: now.zigbee.productId }, base: { mfrs: (base.zigbee || {}).manufacturerName, pids: (base.zigbee || {}).productId }, sourcedPids });
    for (const s of r.stay) {console.log(`::warning::[chain-route] ${s} new on full root ${id} but its pids are unknown: left on root (never guessed)`);}
    if (!r.moves.length) {continue;}
    console.log(`[chain-route] ${id} (full) -> ${target}: ${r.moves.map((m) => `${m.mfr}[${m.pids.join(',')}]`).join(' ')}`);
    moved += r.moves.length;
    if (!apply) {continue;}
    if (!app) {app = JSON.parse(fs.readFileSync(appF, 'utf8'));}
    const ad = app.drivers.find((d) => d.id === id); const at = app.drivers.find((d) => d.id === target);
    for (const mv of r.moves) { applyMove(now.zigbee, tc.zigbee, mv); if (ad && at && ad.zigbee && at.zigbee) {applyMove(ad.zigbee, at.zigbee, mv);} }
    fs.writeFileSync(path.join(ROOT, 'drivers', id, 'driver.compose.json'), `${JSON.stringify(now, null, 2)}\n`);
    fs.writeFileSync(path.join(ROOT, 'drivers', target, 'driver.compose.json'), `${JSON.stringify(tc, null, 2)}\n`);
  }
  if (app) {fs.writeFileSync(appF, JSON.stringify(app));}
  console.log(`[chain-route] ${moved} new mfr(s) ${apply ? 'moved' : 'would move'} to the first chain driver with room`);
  return 0;
}

module.exports = { planRoute, applyMove };
if (require.main === module) {process.exit(main(process.argv.slice(2)));}
