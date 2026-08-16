#!/usr/bin/env node
'use strict';

/**
 * ensure-physical-flow-cards.js (P205)
 *
 * Scan drivers that use PhysicalButtonMixin / VirtualButtonMixin and ensure
 * driver.flow.compose.json declares {driver}_physical_gang{N}_{on|off} (and
 * 1-gang {driver}_physical_{on|off}) for each gang inferred from capabilities.
 *
 * Rules:
 * - No titleFormatted with [[device]]
 * - Globally unique IDs
 * - Dry-run by default; pass --apply to write
 *
 * Usage:
 *   node tools/ci/ensure-physical-flow-cards.js
 *   node tools/ci/ensure-physical-flow-cards.js --apply
 *   node tools/ci/ensure-physical-flow-cards.js --json
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DRIVERS = path.join(ROOT, 'drivers');
const APPLY = process.argv.includes('--apply');
const JSON_MODE = process.argv.includes('--json');

function readText(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch { return ''; }
}

function usesMixin(deviceJs) {
  return /PhysicalButtonMixin|VirtualButtonMixin/.test(deviceJs);
}

function gangCountFromCompose(compose) {
  const caps = compose.capabilities || [];
  let max = 0;
  for (const c of caps) {
    const s = String(c);
    if (s === 'onoff') max = Math.max(max, 1);
    const m = s.match(/^onoff\.gang(\d+)$/i) || s.match(/^onoff\.(\d+)$/i);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  if (max === 0) {
    const id = String(compose.id || '');
    const gm = id.match(/(\d)gang/i);
    if (gm) max = parseInt(gm[1], 10);
  }
  return Math.max(1, Math.min(8, max || 1));
}

function ensureTrigger(flow, id, titleEn) {
  if (!Array.isArray(flow.triggers)) flow.triggers = [];
  if (flow.triggers.some((t) => t && t.id === id)) return false;
  flow.triggers.push({
    id,
    title: { en: titleEn, fr: titleEn },
    args: [],
  });
  return true;
}

function processDriver(dir) {
  const devicePath = path.join(DRIVERS, dir, 'device.js');
  const composePath = path.join(DRIVERS, dir, 'driver.compose.json');
  const flowPath = path.join(DRIVERS, dir, 'driver.flow.compose.json');
  if (!fs.existsSync(devicePath) || !fs.existsSync(composePath)) {
    return null;
  }
  const deviceJs = readText(devicePath);
  if (!usesMixin(deviceJs)) return null;

  const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
  const driverId = compose.id || dir;
  const gangs = gangCountFromCompose(compose);

  let flow = { triggers: [] };
  if (fs.existsSync(flowPath)) {
    try { flow = JSON.parse(fs.readFileSync(flowPath, 'utf8')); } catch { flow = { triggers: [] }; }
  }
  if (!flow.triggers) flow.triggers = [];

  const added = [];
  for (let g = 1; g <= gangs; g++) {
    for (const state of ['on', 'off']) {
      const id = gangs === 1
        ? `${driverId}_physical_${state}`
        : `${driverId}_physical_gang${g}_${state}`;
      const title = gangs === 1
        ? `Physical button ${state}`
        : `Physical gang ${g} ${state}`;
      if (ensureTrigger(flow, id, title)) added.push(id);
    }
  }

  if (added.length && APPLY) {
    fs.writeFileSync(flowPath, `${JSON.stringify(flow, null, 2)}\n`);
  }

  return {
    driver: dir,
    driverId,
    gangs,
    added,
    wouldWrite: added.length > 0,
  };
}

function main() {
  const dirs = fs.readdirSync(DRIVERS).filter((d) => {
    try { return fs.statSync(path.join(DRIVERS, d)).isDirectory(); } catch { return false; }
  });

  const results = [];
  for (const d of dirs) {
    const r = processDriver(d);
    if (r && (r.added.length || JSON_MODE)) results.push(r);
  }

  const summary = {
    mode: APPLY ? 'apply' : 'dry-run',
    driversScanned: dirs.length,
    driversNeedingCards: results.filter((r) => r.added.length).length,
    totalCardsAdded: results.reduce((n, r) => n + r.added.length, 0),
    results: results.filter((r) => r.added.length),
  };

  if (JSON_MODE) {
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  } else {
    console.log(`[ensure-physical-flow-cards] ${summary.mode}`);
    console.log(`  mixin drivers needing cards: ${summary.driversNeedingCards}`);
    console.log(`  cards ${APPLY ? 'written' : 'would add'}: ${summary.totalCardsAdded}`);
    for (const r of summary.results.slice(0, 40)) {
      console.log(`  - ${r.driver}: +${r.added.length} (gangs=${r.gangs})`);
    }
    if (summary.results.length > 40) {
      console.log(`  ... +${summary.results.length - 40} more`);
    }
  }
  process.exit(0);
}

main();
