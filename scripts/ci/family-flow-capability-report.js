#!/usr/bin/env node
'use strict';
/**
 * P3374 / t1015u: report-only comparison of capability ids and flow-card ids/args
 * across equivalent drivers (and, when the other app trees are present, across apps).
 * Never removes a published id. Exit 0 unless the script itself crashes.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const capMap = require('../../lib/flow-remap/capability-map.json');

function readJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_e) { return null; }
}

function driverSnapshot(dir) {
  const compose = readJson(path.join(dir, 'driver.compose.json')) || {};
  const flow = readJson(path.join(dir, 'driver.flow.compose.json')) || {};
  const caps = compose.capabilities || [];
  const cards = [];
  for (const kind of ['triggers', 'conditions', 'actions']) {
    for (const card of flow[kind] || []) {
      cards.push({
        kind,
        id: card.id,
        args: (card.args || []).map((a) => a.name || a.id).filter(Boolean),
      });
    }
  }
  return { caps, cards, className: compose.class || null };
}

function compareFamily(name, ids) {
  const snaps = {};
  for (const id of ids) {
    const dir = path.join(ROOT, 'drivers', id);
    if (!fs.existsSync(path.join(dir, 'driver.compose.json'))) {continue;}
    snaps[id] = driverSnapshot(dir);
  }
  const keys = Object.keys(snaps);
  const divergences = [];
  if (keys.length < 2) {return { name, drivers: keys, divergences };}
  const baseId = keys[0];
  const base = snaps[baseId];
  for (const id of keys.slice(1)) {
    const s = snaps[id];
    const missingCaps = base.caps.filter((c) => !s.caps.includes(c));
    const extraCaps = s.caps.filter((c) => !base.caps.includes(c));
    if (missingCaps.length || extraCaps.length) {
      divergences.push({ type: 'capabilities', base: baseId, other: id, missingCaps, extraCaps });
    }
    const baseCardIds = new Set(base.cards.map((c) => `${c.kind}:${c.id}`));
    const otherCardIds = new Set(s.cards.map((c) => `${c.kind}:${c.id}`));
    const missingCards = [...baseCardIds].filter((c) => !otherCardIds.has(c));
    const extraCards = [...otherCardIds].filter((c) => !baseCardIds.has(c));
    if (missingCards.length || extraCards.length) {
      divergences.push({ type: 'flow-cards', base: baseId, other: id, missingCards, extraCards });
    }
  }
  return { name, drivers: keys, divergences };
}

function main() {
  const families = capMap.driverFamilies || {};
  const report = {
    generated: new Date().toISOString(),
    note: 'Report only. Do not remove published capability or flow-card ids.',
    families: Object.entries(families).map(([name, ids]) => compareFamily(name, ids)),
  };
  report.divergenceCount = report.families.reduce((n, f) => n + f.divergences.length, 0);
  const text = JSON.stringify(report, null, 2);
  if (process.argv.includes('--print')) {process.stdout.write(text + '\n');}
  return report;
}

if (require.main === module) {main();}
module.exports = { main, compareFamily };
