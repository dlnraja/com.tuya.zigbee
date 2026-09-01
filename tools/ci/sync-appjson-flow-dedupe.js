#!/usr/bin/env node
'use strict';

/**
 * sync-appjson-flow-dedupe.js (P2376)
 *
 * Driver flow cards belong in driver.flow.compose.json per driver folder ONLY.
 * Stripping them from app.json.flow AND .homeycompose/flow/* prevents Athom
 * validate duplicates (contact_sensor_illuminance_changed x2 at publish).
 *
 * Usage:
 *   node tools/ci/sync-appjson-flow-dedupe.js
 *   node tools/ci/sync-appjson-flow-dedupe.js --apply
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const APPLY = process.argv.includes('--apply');
const KINDS = ['triggers', 'conditions', 'actions'];
const COMPOSE_FLOW = path.join(ROOT, '.homeycompose', 'flow');

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function collectDriverFlowIds() {
  const ids = { triggers: new Set(), conditions: new Set(), actions: new Set() };
  const driversDir = path.join(ROOT, 'drivers');
  for (const name of fs.readdirSync(driversDir)) {
    const fp = path.join(driversDir, name, 'driver.flow.compose.json');
    if (!fs.existsSync(fp)) continue;
    let flow;
    try {
      flow = readJson(fp);
    } catch {
      continue;
    }
    for (const kind of KINDS) {
      for (const card of flow[kind] || []) {
        if (card?.id) ids[kind].add(card.id);
      }
    }
  }
  return ids;
}

function dedupeHomeyComposeFlow(driverIds) {
  const removed = { triggers: 0, conditions: 0, actions: 0 };
  const files = [];
  if (!fs.existsSync(COMPOSE_FLOW)) return { removed, files };

  for (const kind of KINDS) {
    const dir = path.join(COMPOSE_FLOW, kind);
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      if (!name.endsWith('.json')) continue;
      const id = name.slice(0, -5);
      if (!driverIds[kind].has(id)) continue;
      const fp = path.join(dir, name);
      removed[kind] += 1;
      files.push(path.relative(ROOT, fp));
      if (APPLY) fs.unlinkSync(fp);
    }
  }
  return { removed, files };
}

function main() {
  const appPath = path.join(ROOT, 'app.json');
  const app = readJson(appPath);
  if (!app.flow) app.flow = { triggers: [], conditions: [], actions: [] };
  const driverIds = collectDriverFlowIds();
  const report = {
    removed: { triggers: 0, conditions: 0, actions: 0 },
    kept: {},
    homeycompose: { removed: { triggers: 0, conditions: 0, actions: 0 }, files: [] },
  };

  for (const kind of KINDS) {
    const before = app.flow[kind] || [];
    const kept = before.filter((c) => !c?.id || !driverIds[kind].has(c.id));
    report.removed[kind] = before.length - kept.length;
    report.kept[kind] = kept.length;
    app.flow[kind] = kept;
  }

  report.homeycompose = dedupeHomeyComposeFlow(driverIds);

  if (APPLY) {
    fs.writeFileSync(appPath, JSON.stringify(app));
  }

  console.log(JSON.stringify({ mode: APPLY ? 'apply' : 'dry-run', ...report }, null, 2));
  process.exit(0);
}

main();
