#!/usr/bin/env node
'use strict';

/**
 * P2543 — Dual-app intelligent benefit (BOTH).
 * WHY: Recent complementary / forfait / RX-TX / AQ advances must land on
 * master Test AND stable LTS in the same session — never tip-lag reliability.
 *
 * Complementary: union dual-case identity (stable→master AQ forms);
 * never shrink; never copy App ID / version.
 *
 *   node tools/ci/dual-app-benefit-recent.js
 *   node tools/ci/dual-app-benefit-recent.js --apply
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const APPLY = process.argv.includes('--apply');
const MASTER = process.env.MASTER_ROOT || 'C:\\Users\\Dell\\Documents\\homey\\master';
const STABLE = process.env.STABLE_ROOT || 'C:\\Users\\Dell\\Documents\\homey\\stable';

const { appendExactIdentityForms, wouldDegradeCompose } = require(path.join(
  MASTER,
  'lib/enrichment/ComplementaryMerge.js'
));

function sha(p) {
  try {
    return crypto.createHash('sha1').update(fs.readFileSync(p)).digest('hex');
  } catch {
    return null;
  }
}

function copyFile(rel, { from = MASTER, to = STABLE } = {}) {
  const src = path.join(from, rel);
  const dst = path.join(to, rel);
  if (!fs.existsSync(src)) return { rel, ok: false, reason: 'missing_src' };
  const before = sha(dst);
  if (APPLY) {
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
  }
  const after = APPLY ? sha(dst) : sha(src);
  return { rel, ok: true, changed: before !== after, direction: `${path.basename(from)}→${path.basename(to)}` };
}

function loadCompose(root, driverId) {
  return JSON.parse(fs.readFileSync(path.join(root, 'drivers', driverId, 'driver.compose.json'), 'utf8'));
}

function saveCompose(root, driverId, compose) {
  const p = path.join(root, 'drivers', driverId, 'driver.compose.json');
  fs.writeFileSync(p, `${JSON.stringify(compose, null, 2)}\n`);
}

function unionAqCompose() {
  const m = loadCompose(MASTER, 'air_quality_co2');
  const s = loadCompose(STABLE, 'air_quality_co2');
  const beforeM = m.zigbee.manufacturerName.length;
  const beforeS = s.zigbee.manufacturerName.length;

  const mergedM = appendExactIdentityForms(m.zigbee.manufacturerName, s.zigbee.manufacturerName);
  const mergedS = appendExactIdentityForms(s.zigbee.manufacturerName, m.zigbee.manufacturerName);

  const nextM = JSON.parse(JSON.stringify(m));
  const nextS = JSON.parse(JSON.stringify(s));
  nextM.zigbee.manufacturerName = mergedM;
  nextS.zigbee.manufacturerName = mergedS;

  // also union productId complementary (exact forms)
  nextM.zigbee.productId = appendExactIdentityForms(m.zigbee.productId, s.zigbee.productId);
  nextS.zigbee.productId = appendExactIdentityForms(s.zigbee.productId, m.zigbee.productId);

  if (wouldDegradeCompose(m, nextM) || wouldDegradeCompose(s, nextS)) {
    return { ok: false, reason: 'degrade_guard' };
  }

  if (APPLY) {
    saveCompose(MASTER, 'air_quality_co2', nextM);
    saveCompose(STABLE, 'air_quality_co2', nextS);
  }

  return {
    ok: true,
    master: { before: beforeM, after: mergedM.length },
    stable: { before: beforeS, after: mergedS.length },
  };
}

function ensureStableScripts() {
  const pkgPath = path.join(STABLE, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const scripts = pkg.scripts || {};
  const want = {
    'check:p2538': 'node --test test/critical/p2538-l99-airbox-mesh-flood.test.js',
    'check:p2539': 'node --test test/critical/p2539-intelligent-zb40-suzi.test.js',
    'check:p2540': 'node --test test/critical/p2540-complementary-dp-cluster-raw.test.js',
    'check:p2541': 'node --test test/critical/p2541-complementary-reinstate-aq.test.js',
    'check:p2542': 'node --test test/critical/p2542-local-auto-improve.test.js && node tools/ci/p2542-local-auto-improve-gate.js',
    'check:p2543': 'node --test test/critical/p2543-dual-app-benefit-recent.test.js',
    'improve:local': 'node tools/ci/local-auto-improve-orchestrator.js',
    'improve:local:quick': 'node tools/ci/local-auto-improve-orchestrator.js --quick',
    'benefit:dual': 'node tools/ci/dual-app-benefit-recent.js',
  };
  let changed = false;
  for (const [k, v] of Object.entries(want)) {
    if (scripts[k] !== v) {
      scripts[k] = v;
      changed = true;
    }
  }
  // extend p253x / p254x families
  const p253xWant =
    'npm run check:p2530 && npm run check:p2530d && npm run check:p2531 && npm run check:p2532 && npm run check:p2533 && npm run check:p2534 && npm run check:p2535 && npm run check:p2536 && npm run check:p2537 && npm run check:p2538 && npm run check:p2539';
  if (scripts['check:p253x'] !== p253xWant && fs.existsSync(path.join(STABLE, 'test/critical/p2538-l99-airbox-mesh-flood.test.js'))) {
    scripts['check:p253x'] = p253xWant;
    changed = true;
  }
  const p254xWant = 'npm run check:p2540 && npm run check:p2541 && npm run check:p2542 && npm run check:p2543';
  if (scripts['check:p254x'] !== p254xWant) {
    scripts['check:p254x'] = p254xWant;
    changed = true;
  }
  pkg.scripts = scripts;
  if (APPLY && changed) fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  return { changed };
}

function ensureMasterScripts() {
  const pkgPath = path.join(MASTER, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const scripts = pkg.scripts || {};
  let changed = false;
  if (!scripts['check:p2543']) {
    scripts['check:p2543'] = 'node --test test/critical/p2543-dual-app-benefit-recent.test.js';
    changed = true;
  }
  if (!scripts['benefit:dual']) {
    scripts['benefit:dual'] = 'node tools/ci/dual-app-benefit-recent.js';
    changed = true;
  }
  const p254x = scripts['check:p254x'] || '';
  if (!p254x.includes('check:p2543')) {
    scripts['check:p254x'] = `${p254x || 'npm run check:p2540 && npm run check:p2541 && npm run check:p2542'} && npm run check:p2543`;
    changed = true;
  }
  pkg.scripts = scripts;
  if (APPLY && changed) fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  return { changed };
}

function main() {
  // Master → Stable reliability ports
  const masterToStable = [
    'lib/io/ProtocolFallbackChain.js',
    'tools/ci/local-intelligent-solver.js',
    'config/architecture/complementary-variant-enrich-ssot.json',
    'config/architecture/fleet-complementary-methods-ssot.json',
    'test/critical/p2538-l99-airbox-mesh-flood.test.js',
    'test/critical/p2539-intelligent-zb40-suzi.test.js',
    'test/critical/p2540-complementary-dp-cluster-raw.test.js',
    'test/critical/p2541-complementary-reinstate-aq.test.js',
    'test/critical/p2542-local-auto-improve.test.js',
    'test/critical/p2502-fleet-complementary-methods.test.js',
    'tools/ci/local-auto-improve-orchestrator.js',
    'tools/ci/p2542-local-auto-improve-gate.js',
    'tools/ci/inject-forfait-env-workflows.js',
    'config/architecture/local-auto-improve-ssot.json',
    'config/architecture/complementary-reinstate-notions-ssot.json',
    'config/architecture/complementary-rx-tx-dp-cluster-ssot.json',
    'config/security/ai-plan-forfait.json',
    'docs/architecture/LOCAL_AUTO_IMPROVE_SSOT.md',
    'docs/architecture/AI_EFFICIENCY_SSOT.md',
    'lib/features/LocalSelfImproveCatalog.js',
    'lib/resilience/HomeyGapCompensator.js',
    'lib/enrichment/ComplementaryMerge.js',
    'lib/clusters/RawClusterFallback.js',
    'lib/layers/ProtocolRxTxChain.js',
    'lib/utils/zigbee-tuya-evolution.js',
    'config/architecture/zigbee-tuya-evolution-ssot.json',
    'drivers/air_quality_co2/device.js',
    'drivers/smart_air_detection_box/device.js',
  ];

  const copies = masterToStable.map((rel) => copyFile(rel));
  const aq = unionAqCompose();
  const stScripts = ensureStableScripts();
  const mScripts = ensureMasterScripts();

  const summary = {
    patch: 'P2543',
    apply: APPLY,
    aqUnion: aq,
    copies: copies.filter((c) => c.changed || !c.ok),
    stableScripts: stScripts,
    masterScripts: mScripts,
    ts: new Date().toISOString(),
  };

  const outDir = path.join(MASTER, 'reports', 'dual-app-benefit-latest');
  try {
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'SUMMARY.json'), `${JSON.stringify(summary, null, 2)}\n`);
  } catch { /* ignore */ }

  console.log(`dual-app-benefit: ${APPLY ? 'APPLIED' : 'dry-run'}`);
  console.log('  AQ union', JSON.stringify(aq));
  console.log('  copies changed', copies.filter((c) => c.changed).length);
  for (const c of copies.filter((c) => c.changed || !c.ok).slice(0, 30)) {
    console.log(`    ${c.ok ? (c.changed ? 'CHG' : 'ok') : 'MISS'} ${c.rel}`);
  }
  process.exit(aq.ok ? 0 : 1);
}

main();
