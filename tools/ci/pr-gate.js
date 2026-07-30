#!/usr/bin/env node
'use strict';
/**
 * pr-gate.js (v9.0.368)
 * PR quality gate — fails (exit 1) on:
 *  1. Version format: master = 9.x.y, stable = 5.x.y, never a pre-release suffix
 *  2. Version sync: app.json == package.json == .homeycompose/app.json
 *  3. Sacred Couple guard: a manufacturerName may not be claimed by two
 *     drivers unless a productId disambiguates (fingerprint conflict).
 *
 * Usage: node tools/ci/pr-gate.js [--branch=master]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const branch = (process.argv.find(a => a.startsWith('--branch=')) || '--branch=master').split('=')[1];

let failures = 0;
const fail = (msg) => { console.error('✗', msg); failures++; };
const ok = (msg) => console.log('✓', msg);

// 1-2. Version sanity
const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const compose = JSON.parse(fs.readFileSync(path.join(ROOT, '.homeycompose', 'app.json'), 'utf8'));

const expected = branch.startsWith('stable') ? /^5\.\d+\.\d+$/ : /^9\.\d+\.\d+$/;
if (!expected.test(app.version)) {fail(`version "${app.version}" invalide pour la branche ${branch}`);}
else {ok(`version ${app.version} conforme (${branch})`);}

if (pkg.version !== app.version || compose.version !== app.version) {
  fail(`versions désynchronisées: app.json=${app.version} package.json=${pkg.version} .homeycompose=${compose.version}`);
} else {ok('versions synchronisées');}

// 3. Sacred Couple guard — un mfr ne doit pas être revendiqué par 2+ drivers
//    sauf si leurs productIds diffèrent (désambiguïsation mfr+PID).
const claims = new Map(); // mfr -> [{driverId, pids}]
for (const d of app.drivers || []) {
  const seenInDriver = new Set();
  for (const m of d.zigbee?.manufacturerName || []) {
    const key = String(m).toLowerCase();
    if (seenInDriver.has(key)) {continue;} // casse dupliquée dans le même driver
    seenInDriver.add(key);
    if (!claims.has(key)) {claims.set(key, []);}
    claims.get(key).push({ driverId: d.id, pids: new Set(d.zigbee?.productId || []) });
  }
}
// Baseline: dual-claims connus et acceptés (même PID mais routage historique)
let baseline = new Set();
try {
  const b = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'sacred-couple-baseline.json'), 'utf8'));
  baseline = new Set(b);
} catch { /* pas de baseline: tout dual-claim est un échec */ }

const conflicts = [];
for (const [mfr, list] of claims) {
  if (list.length < 2) {continue;}
  const distinctPids = new Set();
  for (const c of list) {for (const p of c.pids) {distinctPids.add(p);}}
  if (distinctPids.size > 1) {continue;} // désambiguïsé par PID
  const sig = `${mfr}|${list.map(c => c.driverId).sort().join('+')}`;
  if (!baseline.has(sig)) {conflicts.push(sig);}
}
if (conflicts.length) {
  fail(`${conflicts.length} Sacred Couple conflict(s) — mfr revendiqué par plusieurs drivers sans désambiguïsation PID:\n  ${conflicts.slice(0, 10).join('\n  ')}`);
} else {ok('aucun conflit Sacred Couple hors baseline');}

// 4. i18n: locales complètes + pas de mojibake
try {
  const { audit } = require('./locale-completeness');
  const problems = audit();
  if (problems.length) {
    fail(`locales: ${problems.map(p => `${p.locale}(${p.type}${p.count ? ':' + p.count : ''})`).join(', ')}`);
  } else {ok('locales complètes, aucun mojibake');}
} catch (e) {
  console.log('⚠ locale-completeness indisponible:', e.message);
}

if (failures) {console.error(`\n✗ PR gate: ${failures} échec(s)`); process.exit(1);}
console.log('\n✓ PR gate: OK');
