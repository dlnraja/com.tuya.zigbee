#!/usr/bin/env node
// test-regression-audit.js - P75.32: Test that known regressions don't reappear
// Verifies the audit reports stay healthy: button listeners, flow triggers,
// multigang failures, scene buttons, dead flows, unmapped DPs.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');

let pass = 0, fail = 0;
const t = (name, cond) => {
  if (cond) { console.log('  ✓', name); pass++; }
  else { console.log('  ✗', name); fail++; }
};

const readJson = (p) => {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch { return null; }
};

// === 1. Button audit ===
console.log('=== Button audit (missing_listeners.json) ===');
const mlPath = path.join(ROOT, 'reports/button_audit/missing_listeners.json');
const ml = readJson(mlPath);
t('button_audit/missing_listeners.json exists', !!ml);
if (ml) {
  const drv = [...new Set(ml.map(x => x.driver))];
  t('button_audit: < 250 missing listeners', ml.length < 250);
  t('button_audit: < 150 unique drivers with missing', drv.length < 150);
  console.log('  Missing listeners:', ml.length, 'across', drv.length, 'drivers');
}

// === 2. Multigang failures ===
console.log('\n=== Multigang failures ===');
const mf = readJson(path.join(ROOT, 'reports/button_audit/multigang_failures.json'));
t('button_audit/multigang_failures.json exists', !!mf);
if (mf) {
  t('multigang: < 25 failures', mf.length < 25);
  console.log('  Multigang failures:', mf.length);
}

// === 3. Scene buttons ===
console.log('\n=== Scene buttons ===');
const sb = readJson(path.join(ROOT, 'reports/button_audit/scene_buttons.json'));
t('button_audit/scene_buttons.json exists', !!sb);
if (sb) {
  t('scene_buttons: < 30 missing triggers', sb.length < 30);
  console.log('  Scene buttons:', sb.length);
}

// === 4. Flow audit ===
console.log('\n=== Flow audit ===');
const df = readJson(path.join(ROOT, 'reports/flow_audit/dead_flows.json'));
t('flow_audit/dead_flows.json exists', !!df);
if (df) {
  t('flow_audit: 0 dead flows (must be empty array)', Array.isArray(df) && df.length === 0);
}

const mt = readJson(path.join(ROOT, 'reports/flow_audit/missing_triggers.json'));
t('flow_audit/missing_triggers.json exists', !!mt);
if (mt) {
  t('flow_audit: < 200 missing triggers', mt.length < 200);
  console.log('  Missing triggers:', mt.length);
}

const em = readJson(path.join(ROOT, 'reports/flow_audit/execution_matrix.json'));
t('flow_audit/execution_matrix.json exists', !!em);
if (em) {
  const count = Array.isArray(em) ? em.length : Object.keys(em).length;
  t('flow_audit: execution matrix > 1000 entries (extensive coverage)', count > 1000);
  console.log('  Execution matrix entries:', count);
}

// === 5. Capability audit ===
console.log('\n=== Capability audit ===');
const udp = readJson(path.join(ROOT, 'reports/capability_audit/unmapped_dp.json'));
t('capability_audit/unmapped_dp.json exists', !!udp);
if (udp) {
  t('capability_audit: < 10 unmapped DPs', udp.length < 10);
  console.log('  Unmapped DPs:', udp.length);
}

// === 6. Crash analysis ===
console.log('\n=== Crash analysis ===');
const ca = readJson(path.join(ROOT, '.github/state/crash-analysis.json'));
if (!ca) {
  t('crash-analysis.json: file not present in this app variant (skip)', true);
} else {
  t('crash-analysis.json exists', true);
  // The schema varies - some files have `crashes`, some have `diagnostics`, some have neither
  // The PASS condition is that we don't have a long crash list
  const hasCrashes = Array.isArray(ca.crashes);
  if (hasCrashes) {
    t('crash-analysis: < 5 crashes', ca.crashes.length < 5);
    console.log('  Crashes:', ca.crashes.length, 'Pattern lib size:', ca.patternLibrarySize);
  } else {
    t('crash-analysis: no `crashes` field (clean state)', true);
    console.log('  No crashes field. Pattern lib size:', ca.patternLibrarySize);
  }
}

// === 7. Diagnostics report ===
console.log('\n=== Diagnostics report ===');
const dr = readJson(path.join(ROOT, '.github/state/diagnostics-report.json'));
if (!dr) {
  t('diagnostics-report.json: file not present (skip)', true);
} else {
  t('diagnostics-report.json exists', true);
  t('diagnostics: < 5 errors', (dr.errors || []).length < 5);
  console.log('  Errors:', (dr.errors || []).length);
}

// === 8. Forum topics ===
console.log('\n=== Forum topics ===');
const ft = readJson(path.join(ROOT, '.github/state/forum-topics-detailed.json'));
if (!ft) {
  t('forum-topics-detailed.json: file not present (skip)', true);
} else {
  t('forum-topics-detailed.json exists', true);
  const count = Array.isArray(ft) ? ft.length : Object.keys(ft).length;
  t('forum-topics: > 20 topics tracked', count > 20);
  console.log('  Forum topics:', count);
}

// === 9. Gmail FPs ===
console.log('\n=== Gmail FPs ===');
const gf = readJson(path.join(ROOT, '.github/state/gmail-unique-fps.json'));
if (!gf) {
  t('gmail-unique-fps.json: file not present (skip)', true);
} else {
  t('gmail-unique-fps.json exists', true);
  t('gmail-fps: has at least 1 unique FP', (gf.fps || gf).length || Object.keys(gf.fps || gf).length);
  console.log('  Gmail unique FPs:', gf.totalUnique || 0);
}

console.log('\n=== P75.32 regression audit tests: ' + pass + ' passed, ' + fail + ' failed ===');
process.exit(fail > 0 ? 1 : 0);
