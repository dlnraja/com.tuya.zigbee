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
const { resolveFlowCardId, buildPhysicalFlowCandidates } = require('../../lib/flow/FlowCardHeuristics');

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
  const registryCouples = new Set();
  for (const c of registry.cases || []) {
    const mfr = [].concat(c.mfr || [])[0];
    const pid = [].concat(c.productId || [])[0];
    if (mfr && pid) registryCouples.add(`${mfr}|${String(pid).toUpperCase()}`);
  }
  let covered = 0;
  for (const k of registryCouples) {
    if (knowledge.couples[k]) covered++;
  }
  return {
    knowledgeCouples: coupleKeys.length,
    registryCouples: registryCouples.size,
    registryCovered: covered,
    coveragePct: registryCouples.size
      ? Math.round((1000 * covered) / registryCouples.size) / 10
      : 0,
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
  return {
    undeclaredReturnsNull: bad === null,
    remoteResolves: goodRemote === 'button_wireless_4_button_4gang_button_1_pressed',
    sceneResolves: goodScene === 'scene_switch_4_button_1_pressed',
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
  if (!flowSmoke.undeclaredReturnsNull || !flowSmoke.remoteResolves || !flowSmoke.sceneResolves) {
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
    `- Registry couples: ${dps.registryCouples}`,
    `- Covered: ${dps.registryCovered} (${dps.coveragePct}%)`,
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
