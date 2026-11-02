#!/usr/bin/env node
'use strict';
/**
 * P3134 couple-removal guard (#585, user t727u).
 * Homey pairs on manufacturerName x productId (cross product per driver), and one maker id can ship
 * several pids (2- vs 3-button remotes). A removal must be per exact couple: when a maker id leaves a
 * driver, every source-confirmed couple of that maker (data/kb/couples.json + reviewed duals) that the
 * base ref matched must still be matched by some driver (exact, case-sensitive manufacturerName).
 *
 * Usage: node scripts/ci/couple-removal-guard.js [baseRef]   (default merge-base with upstream, else origin/master)
 *        exports { confirmedCouples, matchedDrivers, check } for tests.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..', '..');

function confirmedCouples(root = ROOT) {
  const out = new Set();
  const kb = path.join(root, 'data/kb/couples.json');
  if (fs.existsSync(kb)) {for (const k of Object.keys(JSON.parse(fs.readFileSync(kb, 'utf8')).couples || {})) {out.add(k);}}
  const duals = path.join(root, 'data/native-matrix-reviewed-duals.json');
  if (fs.existsSync(duals)) {for (const e of JSON.parse(fs.readFileSync(duals, 'utf8')).entries || []) {out.add(e.couple);}}
  return out;
}

function loadDrivers(readFile, list) {
  const map = {};
  for (const d of list) {
    try { const z = JSON.parse(readFile(`drivers/${d}/driver.compose.json`)).zigbee || {}; map[d] = { m: new Set(z.manufacturerName || []), p: new Set([].concat(z.productId || [])) }; } catch (_) { /* no compose */ }
  }
  return map;
}

function matchedDrivers(drivers, mfr, pid) {
  return Object.keys(drivers).filter((d) => drivers[d].m.has(mfr) && drivers[d].p.has(pid));
}

// t730u: every (maker, driver) removal needs a multi-source entry in data/couple-removal-evidence.json.
// P3228: a maker moved inside one continuation chain (DRIVER_CONTINUATIONS.md) is not a removal.
function movedInChain(head, m, d, dc) {
  if (!dc) {return false;}
  return Object.keys(head).some((o) => o !== d && dc.isSameLogical(o, d) && head[o].m.has(m));
}

function missingEvidence(base, head, evidence, dc = require('../../lib/drivers/DriverContinuations').load(ROOT)) {
  const { hasEvidence } = require('../maintenance/couple-removal-evidence.js');
  const out = [];
  for (const d of Object.keys(base)) {
    if (!head[d]) {continue;}
    for (const m of base[d].m) {
      if (!head[d].m.has(m) && !movedInChain(head, m, d, dc) && !hasEvidence(evidence, m, d)) {out.push(`${m} removed from ${d} without a removal-evidence entry (run scripts/maintenance/couple-removal-evidence.js --write)`);}
    }
  }
  return out;
}

function check(base, head, confirmed, evidence) {
  const errors = [];
  if (evidence) {errors.push(...missingEvidence(base, head, evidence));}
  const shrunk = new Set();
  for (const d of Object.keys(base)) {for (const m of base[d].m) {if (!head[d] || !head[d].m.has(m)) {shrunk.add(m.toLowerCase());}}}
  for (const c of confirmed) {
    const [mfr, pid] = c.split('|');
    if (!mfr || !pid || !shrunk.has(mfr.toLowerCase())) {continue;}
    if (matchedDrivers(base, mfr, pid).length && !matchedDrivers(head, mfr, pid).length) {errors.push(`${c}: source-confirmed couple no longer matched by any driver`);}
  }
  return errors;
}


// P3195: the baseline is the pushed branch's OWN remote tip (bastien-home/stable-v5 have their own catalogues).
// Detached HEAD (scheduler pushes) used to fall through to origin/master and flag master-only couples.
const APP_BRANCH = { 'com.dlnraja.tuya.zigbee.bastien': 'bastien-home', 'com.dlnraja.tuya.zigbee.stable': 'stable-v5', 'com.dlnraja.tuya.zigbee': 'master' };
function targetBranch(env = process.env, root = ROOT) {
  const b = env.COUPLE_GUARD_BRANCH || env.PUSH_RETRY_BRANCH || env.GITHUB_BASE_REF;
  if (b) {return b;}
  try { return APP_BRANCH[JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8')).id] || null; } catch (_) { return null; }
}
function resolveBaseRef(git, argv = process.argv, env = process.env, root = ROOT) {
  if (argv[2]) {return argv[2];}
  const b = targetBranch(env, root);
  const tries = b ? [`origin/${b}`] : ['@{u}'];
  for (const up of tries) { try { return git('merge-base', 'HEAD', up).trim(); } catch (_) { /* next */ } }
  return null;
}

if (require.main === module) {
  const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  const ref = resolveBaseRef(git);
  if (!ref) { console.log('[couple-removal-guard] no base ref, skipped'); process.exit(0); }
  const list = fs.readdirSync(path.join(ROOT, 'drivers'));
  let base;
  try { base = loadDrivers((f) => git('show', `${ref}:${f}`), list); } catch (_) { console.log('[couple-removal-guard] no base ref, skipped'); process.exit(0); }
  const head = loadDrivers((f) => fs.readFileSync(path.join(ROOT, f), 'utf8'), list);
  const { load } = require('../maintenance/couple-removal-evidence.js');
  const errors = check(base, head, confirmedCouples(), load());
  if (errors.length) { for (const e of errors) {console.error(`::error::${e}`);} process.exit(1); }
  console.log(`[couple-removal-guard] OK vs ${ref}`);
}
module.exports = { targetBranch, resolveBaseRef, confirmedCouples, matchedDrivers, check, loadDrivers, movedInChain };
