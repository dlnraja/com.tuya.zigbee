#!/usr/bin/env node
'use strict';

/**
 * P3362 - deterministic Apple Home / Insights coherence (no AI).
 *
 * --apply  add missing standard units on compose (never overwrite)
 * --check  fail if units, official app.json form, flow ids, eager JSON,
 *          Latin-1, ceilings, couples or held-driver theft regress
 *
 * Used by .github/workflows/apple-home-coherence.yml and by pre-push/tests.
 */

const fs = require('fs');
const path = require('path');
const { standardUnitFor, hasDeclaredUnits } = require('../../lib/utils/HomeyCapabilityUx');

const ROOT = path.resolve(__dirname, '..', '..');
const APP_FLOW_IDS = [
  'home_mode_changed',
  'capability_value_changed_generic',
  'device_interaction',
];
const EAGER_JSON_FORBIDDEN = [
  'data/product-reference.json',
  'data/mfs_db.json',
  'data/dp_registry.json',
];

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

function capIds(caps) {
  const out = [];
  for (const c of caps || []) {
    if (typeof c === 'string') {out.push(c);}
    else if (c && typeof c === 'object' && typeof c.id === 'string') {out.push(c.id);}
  }
  return out;
}

function listDrivers() {
  const dir = path.join(ROOT, 'drivers');
  return fs.readdirSync(dir).filter((id) => fs.existsSync(path.join(dir, id, 'driver.compose.json')));
}

function scanMissingUnits() {
  const missing = [];
  const touchedWould = [];
  for (const id of listDrivers()) {
    const rel = path.join('drivers', id, 'driver.compose.json');
    const j = readJson(rel);
    const opts = j.capabilitiesOptions && typeof j.capabilitiesOptions === 'object'
      ? j.capabilitiesOptions : {};
    for (const cap of capIds(j.capabilities)) {
      const unit = standardUnitFor(cap);
      if (!unit) {continue;}
      const cur = opts[cap] && typeof opts[cap] === 'object' ? opts[cap] : null;
      if (hasDeclaredUnits(cur || {})) {continue;}
      missing.push({ driver: id, cap, unit });
    }
  }
  for (const row of missing) {
    if (!touchedWould.includes(row.driver)) {touchedWould.push(row.driver);}
  }
  return { missing, drivers: touchedWould };
}

function applyMissingUnits() {
  const { missing } = scanMissingUnits();
  const byDriver = new Map();
  for (const row of missing) {
    if (!byDriver.has(row.driver)) {byDriver.set(row.driver, []);}
    byDriver.get(row.driver).push(row);
  }
  let files = 0;
  for (const [id, rows] of byDriver) {
    const rel = path.join('drivers', id, 'driver.compose.json');
    const abs = path.join(ROOT, rel);
    const raw = fs.readFileSync(abs, 'utf8');
    const j = JSON.parse(raw);
    if (!j.capabilitiesOptions || typeof j.capabilitiesOptions !== 'object') {
      j.capabilitiesOptions = {};
    }
    for (const row of rows) {
      const cur = j.capabilitiesOptions[row.cap] && typeof j.capabilitiesOptions[row.cap] === 'object'
        ? j.capabilitiesOptions[row.cap] : {};
      j.capabilitiesOptions[row.cap] = { ...cur, units: row.unit };
    }
    const out = `${JSON.stringify(j, null, 2)}\n`;
    if (out !== raw) {
      fs.writeFileSync(abs, out);
      files++;
    }
  }
  return { files, added: missing.length, drivers: byDriver.size };
}

function collectFlowIds(flow) {
  const ids = [];
  if (!flow || typeof flow !== 'object') {return ids;}
  for (const kind of ['triggers', 'conditions', 'actions']) {
    for (const card of flow[kind] || []) {
      if (card && typeof card.id === 'string') {ids.push(card.id);}
    }
  }
  return ids;
}

function checkAppLevelFlowIds() {
  const app = readJson('app.json');
  const ids = new Set(collectFlowIds(app.flow));
  // Also accept compose sources for app-level cards
  const composeDir = path.join(ROOT, '.homeycompose', 'flow');
  if (fs.existsSync(composeDir)) {
    for (const kind of ['triggers', 'conditions', 'actions']) {
      const d = path.join(composeDir, kind);
      if (!fs.existsSync(d)) {continue;}
      for (const f of fs.readdirSync(d)) {
        if (!f.endsWith('.json')) {continue;}
        try {
          const j = JSON.parse(fs.readFileSync(path.join(d, f), 'utf8'));
          if (j && j.id) {ids.add(j.id);}
        } catch (_e) { /* skip */ }
      }
    }
  }
  return APP_FLOW_IDS.filter((id) => !ids.has(id));
}

function walkRelativeRequires(entryRel, visitJson) {
  const reqRe = /require\(\s*['"]([^'"]+)['"]\s*\)/g;
  const visited = new Set();
  const queue = [path.join(ROOT, entryRel)];
  const topLevelJson = [];
  while (queue.length) {
    const file = queue.pop();
    if (visited.has(file) || !fs.existsSync(file)) {continue;}
    visited.add(file);
    if (file.endsWith('.json')) {continue;}
    if (!/\.(js|cjs)$/.test(file)) {continue;}
    let text;
    try { text = fs.readFileSync(file, 'utf8'); } catch (_e) { continue; }
    reqRe.lastIndex = 0;
    let m;
    while ((m = reqRe.exec(text))) {
      const spec = m[1];
      if (!spec.startsWith('.')) {continue;}
      const base = path.resolve(path.dirname(file), spec);
      const cands = [base, `${base}.js`, `${base}.cjs`, `${base}.json`, path.join(base, 'index.js')];
      const nxt = cands.find((c) => fs.existsSync(c) && fs.statSync(c).isFile());
      if (!nxt) {continue;}
      const lineStart = text.lastIndexOf('\n', m.index) + 1;
      const line = text.slice(lineStart, text.indexOf('\n', m.index));
      const indent = line.length - line.trimStart().length;
      if (nxt.endsWith('.json') && indent === 0) {
        topLevelJson.push(path.relative(ROOT, nxt).replace(/\\/g, '/'));
      }
      if (!visited.has(nxt)) {queue.push(nxt);}
    }
  }
  return topLevelJson;
}

function checkEagerJson() {
  const appJs = path.join(ROOT, 'app.js');
  if (!fs.existsSync(appJs)) {return ['missing app.js'];}
  const src = fs.readFileSync(appJs, 'utf8');
  const bad = [];
  if (src.includes('product-reference.json')) {bad.push('app.js references product-reference.json');}
  if (/JSON\.parse\s*=/.test(src)) {bad.push('app.js replaces JSON.parse');}
  const top = walkRelativeRequires('app.js');
  for (const rel of top) {
    if (EAGER_JSON_FORBIDDEN.includes(rel)) {bad.push(`top-level require of ${rel}`);}
    const abs = path.join(ROOT, rel);
    if (fs.existsSync(abs) && fs.statSync(abs).size > 512 * 1024) {
      bad.push(`top-level require of large JSON ${rel} (${fs.statSync(abs).size} bytes)`);
    }
  }
  return bad;
}

function checkLearnings() {
  const learnings = readJson('config/ci/bastien-anon-learnings.json');
  const missing = [];
  const helper = fs.readFileSync(path.join(ROOT, 'lib/utils/HomeyCapabilityUx.js'), 'utf8');
  if (!helper.includes('standardUnitFor') || !helper.includes('P3362')) {
    missing.push('healer missing P3362 standardUnitFor');
  }
  if (!fs.existsSync(path.join(ROOT, 'config/architecture/standard-capability-units.json'))) {
    missing.push('missing standard-capability-units.json');
  }
  const { missing: unitGaps } = scanMissingUnits();
  if (unitGaps.length) {missing.push(`${unitGaps.length} compose caps missing standard units`);}
  return { items: learnings.items || [], gaps: missing };
}

async function checkParityAndCeilings(failures) {
  try {
    const gate = require('./compose-parity-gate.cjs');
    const r = await gate.checkParity(ROOT);
    if (!r.ok) {failures.push(`P3079 compose parity drift: ${JSON.stringify((r.diffs || []).slice(0, 3))}`);}
    if (r.lost && r.lost.length) {failures.push(`P3079 would lose ${r.lost.length} entries`);}
  } catch (e) {
    failures.push(`P3079 parity: ${e.message}`);
  }
  try {
    const latin = path.join(ROOT, 'tools/ci/p3320-shipped-latin1-assets-gate.js');
    if (fs.existsSync(latin)) {
      const { spawnSync } = require('child_process');
      const run = spawnSync(process.execPath, [latin], { cwd: ROOT, encoding: 'utf8' });
      if (run.status !== 0) {failures.push(`P3320 Latin-1 gate failed (exit ${run.status})`);}
    }
  } catch (e) {
    failures.push(`P3320: ${e.message}`);
  }
  try {
    const ceiling = path.join(ROOT, 'scripts/ci/upload-archive-ceiling.cjs');
    const policy = path.join(ROOT, 'config/upload-archive-ceiling.json');
    // The ceiling measures a packed upload dir. Skip when none is present
    // (source-tree --check); the workflow can pass a prepared dir later.
    if (fs.existsSync(ceiling) && fs.existsSync(policy) && process.env.P3362_UPLOAD_DIR) {
      const { spawnSync } = require('child_process');
      const run = spawnSync(process.execPath, [ceiling, process.env.P3362_UPLOAD_DIR], { cwd: ROOT, encoding: 'utf8' });
      if (run.status !== 0) {
        failures.push(`upload-archive-ceiling failed (exit ${run.status})`);
        if (run.stdout) {failures.push(run.stdout.split('\n').slice(-8).join(' | '));}
      }
    }
  } catch (e) {
    failures.push(`ceiling: ${e.message}`);
  }
}

function checkPublishedCouples() {
  const failures = [];
  // Held host profiles must not steal couples already published on a live driver.
  const profiles = path.join(ROOT, 'lib/drivers/held-host-profiles.json');
  if (!fs.existsSync(profiles)) {return failures;}
  try {
    const test = path.join(ROOT, 'test/critical/p3331-held-host-profiles.test.js');
    if (fs.existsSync(test)) {
      const { spawnSync } = require('child_process');
      const run = spawnSync(process.execPath, ['--test', test], { cwd: ROOT, encoding: 'utf8' });
      if (run.status !== 0) {failures.push('P3331 held-host profiles / published couples check failed');}
    }
  } catch (e) {
    failures.push(`held-host: ${e.message}`);
  }
  return failures;
}

function writeSummary(lines) {
  const p = process.env.GITHUB_STEP_SUMMARY;
  if (!p) {return;}
  try { fs.appendFileSync(p, `${lines.join('\n')}\n`); } catch (_e) { /* no summary */ }
}

async function check() {
  const failures = [];
  const { missing, drivers } = scanMissingUnits();
  if (missing.length) {
    failures.push(`missing standard units: ${missing.length} caps on ${drivers.length} drivers (e.g. ${missing.slice(0, 5).map((m) => `${m.driver}:${m.cap}`).join(', ')})`);
  }
  const lostFlow = checkAppLevelFlowIds();
  if (lostFlow.length) {failures.push(`app-level flow ids missing: ${lostFlow.join(', ')}`);}
  failures.push(...checkEagerJson());
  const learn = checkLearnings();
  failures.push(...learn.gaps);
  await checkParityAndCeilings(failures);
  failures.push(...checkPublishedCouples());
  return failures;
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const wantApply = args.has('--apply');
  const wantCheck = args.has('--check') || !wantApply;
  const cfg = readJson('config/ci/apple-home-coherence.json');
  if (cfg.enabled === false) {
    console.log('P3362 skipped: config/ci/apple-home-coherence.json enabled=false');
    writeSummary(['# Apple Home coherence', 'Kill switch: config enabled=false']);
    return;
  }
  let applied = null;
  if (wantApply) {
    applied = applyMissingUnits();
    console.log(`[P3362] apply units: ${JSON.stringify(applied)}`);
  }
  if (!wantCheck) {return;}
  const failures = await check();
  const summary = [
    '# Apple Home / Insights coherence (P3362)',
    applied ? `Apply: ${applied.added} units on ${applied.drivers} drivers, ${applied.files} files` : 'Apply: not requested',
    failures.length ? `FAIL (${failures.length})` : 'OK',
    ...failures.map((f) => `- ${f}`),
  ];
  writeSummary(summary);
  if (failures.length) {
    console.error('P3362 FAIL:');
    for (const f of failures) {console.error(`  - ${f}`);}
    process.exitCode = 1;
    return;
  }
  console.log('P3362 OK - units, official form guards, flow ids, eager JSON');
}

if (require.main === module) {
  main().catch((e) => { console.error(e); process.exitCode = 2; });
}

module.exports = {
  ROOT,
  scanMissingUnits,
  applyMissingUnits,
  checkAppLevelFlowIds,
  checkEagerJson,
  check,
  APP_FLOW_IDS,
};
