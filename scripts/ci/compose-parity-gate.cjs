#!/usr/bin/env node
/**
 * P3079 — compose ↔ app.json parity gate.
 *
 * Rule: rebuilding app.json from compose (homey CLI composer, run in a temp dir) and passing it through the
 * repo's own post-processing must give exactly the committed app.json (after the same post-processing).
 * Post-processing = what the bot bump always applies: drop driver-scoped flow cards (sync-appjson-flow-dedupe)
 * and scripts/maintenance/sanitize-manifest.cjs. Both are idempotent, so any remaining difference is a real
 * drift: something present in app.json only (lost at the next `homey app validate`) or in compose only
 * (never shipped). The bot bump runs this before `git commit` and aborts on drift.
 *
 * Usage: node scripts/ci/compose-parity-gate.cjs [--json] [--root=DIR] [--base=PATH_TO_BASE_APP_JSON]
 * Exit: 0 parity, 1 drift, 2 tool error (missing homey CLI, bad JSON).
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { rebuildFromCompose, lostOnRecompose } = require('./compose-rebuild.cjs');

const KINDS = ['triggers', 'conditions', 'actions'];
const MAX_DIFFS = 50; // bounded report

function driverFlowIds(root) {
  const ids = { triggers: new Set(), conditions: new Set(), actions: new Set() };
  const dir = path.join(root, 'drivers');
  for (const n of fs.readdirSync(dir)) {
    const f = path.join(dir, n, 'driver.flow.compose.json');
    if (!fs.existsSync(f)) { continue; }
    const j = JSON.parse(fs.readFileSync(f, 'utf8'));
    for (const k of KINDS) { for (const c of j[k] || []) { if (c && c.id) { ids[k].add(c.id); } } }
  }
  return ids;
}

/** Same post-processing as the bot bump, on a copy: never touches the repo files. */
function normalise(root, manifest, ids) {
  const m = JSON.parse(JSON.stringify(manifest));
  delete m._comment;
  delete m.version; // the bump syncs versions itself (highest of app/.homeycompose/package); M08 guards them
  m.flow = m.flow || {};
  for (const k of KINDS) { m.flow[k] = (m.flow[k] || []).filter((c) => !c || !c.id || !ids[k].has(c.id)); }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'p3079-parity-'));
  try {
    const f = path.join(tmp, 'app.json');
    fs.writeFileSync(f, JSON.stringify(m));
    execFileSync(process.execPath, [path.join(root, 'scripts/maintenance/sanitize-manifest.cjs'), f], { stdio: 'ignore' });
    return JSON.parse(fs.readFileSync(f, 'utf8'));
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

/** Bounded structural diff; paths name drivers by id so the report is actionable. */
function diff(a, b, p, out) {
  if (out.length >= MAX_DIFFS) { return out; }
  if (JSON.stringify(a) === JSON.stringify(b)) { return out; }
  if (a && b && typeof a === 'object' && typeof b === 'object' && Array.isArray(a) === Array.isArray(b)) {
    const byId = Array.isArray(a) && a.every((x) => x && x.id) && b.every((x) => x && x.id);
    if (byId) {
      const A = new Map(a.map((x) => [x.id, x])); const B = new Map(b.map((x) => [x.id, x]));
      for (const id of new Set([...A.keys(), ...B.keys()])) { diff(A.get(id), B.get(id), `${p}[${id}]`, out); }
      if (!out.length) { out.push({ path: p, committed: 'order', composed: 'order' }); }
      return out;
    }
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) { diff(a[k], b[k], `${p}.${k}`, out); }
    return out;
  }
  out.push({ path: p || '.', committed: String(JSON.stringify(a)).slice(0, 120), composed: String(JSON.stringify(b)).slice(0, 120) });
  return out;
}

async function checkParity(root) {
  const committed = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
  const composed = await rebuildFromCompose(root);
  const ids = driverFlowIds(root);
  const a = normalise(root, committed, ids);
  const b = normalise(root, composed, ids);
  return { ok: JSON.stringify(a) === JSON.stringify(b), diffs: diff(a, b, '', []), lost: lostOnRecompose(a, b) };
}

/**
 * No-loss guard for the bot bump (the 399155aae2 case: compose itself had lost adaptive_lighting because a
 * driver.settings.compose.json shadowed driver.compose.json, so parity alone passed). An entry present in the
 * base app.json and missing from the new one fails unless its id is gone from that driver's compose files too
 * (a deliberate removal). Driver folders that no longer exist are deliberate removals as well.
 */
function lostVsBase(root, base, next) {
  const out = [];
  for (const l of lostOnRecompose(base, next)) {
    const dir = path.join(root, 'drivers', l.driver);
    if (!fs.existsSync(dir)) { continue; }
    if (l.kind === 'driver') { out.push(l); continue; }
    const raw = fs.readdirSync(dir).filter((f) => /compose\.json$/.test(f))
      .map((f) => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
    if (raw.includes(JSON.stringify(l.id))) { out.push(l); }
  }
  return out;
}

module.exports = { checkParity, normalise, diff, driverFlowIds, lostVsBase };

if (require.main === module) {
  const arg = process.argv.find((x) => x.startsWith('--root='));
  const root = path.resolve(arg ? arg.slice(7) : process.cwd());
  const log = console.log;
  const baseArg = process.argv.find((x) => x.startsWith('--base='));
  checkParity(root).then((r) => {
    if (baseArg) {
      const base = JSON.parse(fs.readFileSync(path.resolve(baseArg.slice(7)), 'utf8'));
      r.lostVsBase = lostVsBase(root, base, JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8')));
      if (r.lostVsBase.length) { r.ok = false; }
      for (const l of r.lostVsBase.slice(0, MAX_DIFFS)) { log(`  DROPPED vs base ${l.driver} ${l.kind} ${l.id || ''} (still named in compose)`); }
    }
    if (process.argv.includes('--json')) { log(JSON.stringify(r)); } else if (r.ok) {
      log('[compose-parity] OK — app.json == rebuild from compose (after flow dedupe + sanitize-manifest)');
    } else {
      log(`[compose-parity] DRIFT — ${r.lost.length} entr(ies) would be LOST at the next re-compose, ${r.diffs.length} diff(s) shown`);
      for (const l of r.lost.slice(0, MAX_DIFFS)) { log(`  LOST ${l.driver} ${l.kind} ${l.id || ''}`); }
      for (const d of r.diffs) { log(`  ${d.path}: app.json=${d.committed} compose=${d.composed}`); }
      log('  Fix: put the value in the compose file the build reads (driver.settings.compose.json replaces driver.compose.json settings).');
    }
    process.exitCode = r.ok ? 0 : 1;
  }).catch((e) => { console.error('[compose-parity] error:', e.message); process.exitCode = 2; });
}
