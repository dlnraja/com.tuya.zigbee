#!/usr/bin/env node
'use strict';

/**
 * coverage-dp-cluster-flow.js (P2247)
 *
 * Single CI report for DP knowledge × cluster lexicon × flow compose coverage.
 * Exit 0 always unless --strict and critical gaps found.
 *
 * Usage:
 *   node tools/ci/coverage-dp-cluster-flow.js
 *   node tools/ci/coverage-dp-cluster-flow.js --strict
 *   node tools/ci/coverage-dp-cluster-flow.js --json
 */

const fs = require('fs');
const path = require('path');
const { CLUSTERS, lookupCluster } = require('../../lib/zigbee/ZclClusterLexicon');
const { resolveFlowCardId, buildPhysicalFlowCandidates, buildCapabilityFlowCandidates } = require('../../lib/flow/FlowCardHeuristics');

const ROOT = path.join(__dirname, '..', '..');
const DATE = new Date().toISOString().slice(0, 10);
const OUT_DIR = path.join(ROOT, 'reports', `coverage-dp-cluster-flow-${DATE}`);
const STRICT = process.argv.includes('--strict');
const JSON_MODE = process.argv.includes('--json');

function loadJson(fp) {
  if (!fs.existsSync(fp)) return null;
  return JSON.parse(fs.readFileSync(fp, 'utf8'));
}

function scanDrivers() {
  const dir = path.join(ROOT, 'drivers');
  const ids = fs.readdirSync(dir).filter((d) => fs.statSync(path.join(dir, d)).isDirectory());
  const clusters = new Set();
  let withFlow = 0;
  const withoutFlow = [];
  let flowCardCount = 0;

  for (const id of ids) {
    const composePath = path.join(dir, id, 'driver.compose.json');
    const flowPath = path.join(dir, id, 'driver.flow.compose.json');
    if (fs.existsSync(flowPath)) {
      withFlow++;
      try {
        const flow = JSON.parse(fs.readFileSync(flowPath, 'utf8'));
        for (const kind of ['triggers', 'actions', 'conditions']) {
          flowCardCount += (flow[kind] || []).length;
        }
      } catch (_e) { /* skip */ }
    } else {
      withoutFlow.push(id);
    }
    if (!fs.existsSync(composePath)) continue;
    try {
      const c = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      for (const ep of Object.values(c.zigbee?.endpoints || {})) {
        for (const cl of [...(ep.clusters || []), ...(ep.bindings || [])]) {
          if (typeof cl === 'number') clusters.add(cl);
        }
      }
    } catch (_e) { /* skip */ }
  }
  return { driverCount: ids.length, withFlow, withoutFlow, flowCardCount, clusters };
}

function clusterCoverage(composeClusters) {
  const lexiconIds = new Set(Object.values(CLUSTERS).map((c) => c.id));
  const missing = [...composeClusters].filter((id) => !lexiconIds.has(id)).sort((a, b) => a - b);
  return {
    composeUnique: composeClusters.size,
    lexiconSize: lexiconIds.size,
    missingFromLexicon: missing.map((id) => ({
      id,
      hex: `0x${id.toString(16).toUpperCase().padStart(4, '0')}`,
      lookup: lookupCluster(id)?.key || null,
    })),
  };
}

function dpCoverage() {
  const knowledge = loadJson(path.join(ROOT, 'data', 'dp_couple_knowledge.json')) || { couples: {} };
  const registry = loadJson(path.join(ROOT, 'data', 'user-misattribution-registry.json')) || { cases: [] };
  const coupleKeys = Object.keys(knowledge.couples || {});
  const knowledgeSet = new Set(coupleKeys.map((k) => k.toLowerCase()));
  // WHY: brand-only (HOBEIAN/Wing) + external soft-watch (no canonicalDriver) are not EF00
  // DP knowledge targets — counting them as gaps falsely tanks coverage after sacred locks.
  const registryCouples = new Set();
  const skipped = [];
  for (const c of registry.cases || []) {
    const mfrs = [].concat(c.mfr || []).filter(Boolean);
    const pids = [].concat(c.productId || []).filter(Boolean);
    if (!mfrs.length || !pids.length) continue;
    const tuyaMfr = mfrs.find((m) => /^_t[yz]/i.test(m));
    if (!tuyaMfr || !c.canonicalDriver) {
      skipped.push(`${mfrs[0]}|${pids[0]}`);
      continue;
    }
    // Prefer TS* pid when present (TY0201 + TS0201 → count against TS0201 knowledge key)
    const pid = pids.find((p) => /^TS/i.test(p)) || pids[0];
    registryCouples.add(`${tuyaMfr}|${String(pid).toUpperCase()}`);
  }
  let covered = 0;
  const uncovered = [];
  for (const k of registryCouples) {
    if (knowledge.couples[k] || knowledgeSet.has(k.toLowerCase())) covered++;
    else uncovered.push(k);
  }
  return {
    knowledgeCouples: coupleKeys.length,
    registryCouples: registryCouples.size,
    registryCovered: covered,
    coveragePct: registryCouples.size
      ? Math.round((1000 * covered) / registryCouples.size) / 10
      : 0,
    skippedBrandOrExternal: skipped.length,
    uncovered,
  };
}

function flowHeuristicSmoke() {
  const declared = new Set([
    'button_wireless_4_button_4gang_button_1_pressed',
    'scene_switch_4_button_1_pressed',
    'switch_2gang_physical_gang1_on',
  ]);
  const remotes = buildPhysicalFlowCandidates('button_wireless_4', 1, 'single', {
    gangCount: 4,
    isButtonDevice: true,
  });
  const scene = buildPhysicalFlowCandidates('scene_switch_4', 1, 'single', {
    gangCount: 4,
    isButtonDevice: true,
  });
  const bad = resolveFlowCardId(
    ['button_wireless_4_button_1_button_pressed', 'button_wireless_4_button_1gang_button_pressed'],
    declared,
  );
  const goodRemote = resolveFlowCardId(remotes, declared);
  const goodScene = resolveFlowCardId(scene, declared);
  const meterDeclared = new Set(['plug_energy_monitor_measure_power_changed']);
  const meterCandidates = buildCapabilityFlowCandidates('plug_energy_monitor', 'measure_power');
  const goodMeter = resolveFlowCardId(meterCandidates, meterDeclared);
  return {
    undeclaredReturnsNull: bad === null,
    remoteResolves: goodRemote === 'button_wireless_4_button_4gang_button_1_pressed',
    sceneResolves: goodScene === 'scene_switch_4_button_1_pressed',
    capabilityResolves: goodMeter === 'plug_energy_monitor_measure_power_changed',
  };
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const drivers = scanDrivers();
  const clusters = clusterCoverage(drivers.clusters);
  const dps = dpCoverage();
  const flowSmoke = flowHeuristicSmoke();

  const critical = [];
  if (clusters.missingFromLexicon.length) {
    critical.push(`${clusters.missingFromLexicon.length} compose clusters missing from lexicon`);
  }
  if (drivers.withoutFlow.length) {
    critical.push(`drivers without flow compose: ${drivers.withoutFlow.join(', ')}`);
  }
  if (!flowSmoke.undeclaredReturnsNull || !flowSmoke.remoteResolves || !flowSmoke.sceneResolves || !flowSmoke.capabilityResolves) {
    critical.push('flow heuristic smoke failed');
  }

  const report = {
    generatedAt: new Date().toISOString(),
    patch: 'P2247',
    drivers: {
      count: drivers.driverCount,
      withFlowCompose: drivers.withFlow,
      withoutFlowCompose: drivers.withoutFlow,
      flowCardEntries: drivers.flowCardCount,
    },
    clusters,
    dps,
    flowSmoke,
    critical,
  };

  const md = [
    `# DP × Cluster × Flow coverage — ${DATE}`,
    '',
    `Critical gaps: **${critical.length}**`,
    '',
    '## Drivers / Flow',
    `- Drivers: ${drivers.driverCount}`,
    `- With flow.compose: ${drivers.withFlow}`,
    `- Without: ${drivers.withoutFlow.join(', ') || 'none'}`,
    `- Flow card entries (compose): ${drivers.flowCardCount}`,
    '',
    '## Clusters',
    `- Compose unique: ${clusters.composeUnique}`,
    `- Lexicon size: ${clusters.lexiconSize}`,
    `- Missing from lexicon: ${clusters.missingFromLexicon.length}`,
    ...clusters.missingFromLexicon.map((m) => `  - ${m.hex} (${m.id})`),
    '',
    '## DP knowledge',
    `- Knowledge couples: ${dps.knowledgeCouples}`,
    `- Registry couples (Tuya EF00-eligible): ${dps.registryCouples}`,
    `- Covered: ${dps.registryCovered} (${dps.coveragePct}%)`,
    `- Skipped brand/external soft-watch: ${dps.skippedBrandOrExternal || 0}`,
    ...(dps.uncovered && dps.uncovered.length
      ? ['- Uncovered:', ...dps.uncovered.map((u) => `  - ${u}`)]
      : ['- Uncovered: none']),
    '',
    '## Flow heuristic smoke',
    '```json',
    JSON.stringify(flowSmoke, null, 2),
    '```',
    '',
    '## Commands',
    '```bash',
    'node tools/ci/sync-dp-couple-knowledge.js --apply',
    'npm run audit:dp-couples',
    'npm run flow:l99',
    '```',
    '',
  ];

  fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'COVERAGE.md'), md.join('\n'));

  if (JSON_MODE) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(md.join('\n'));
  }

  if (STRICT && critical.length) process.exit(1);
  process.exit(0);
}

main();
