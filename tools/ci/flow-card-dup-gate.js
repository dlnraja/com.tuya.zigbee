#!/usr/bin/env node
'use strict';

// flow-card-dup-gate.js
// Detect duplicate Flow card IDs the way Homey compose merges them:
// global .homeycompose/flow/(triggers|conditions|actions)/*.json
// + each drivers/*/driver.flow.compose.json

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const KINDS = ['triggers', 'conditions', 'actions'];
const byKind = {
  triggers: new Map(),
  conditions: new Map(),
  actions: new Map(),
};

function add(kind, id, where) {
  if (!id || typeof id !== 'string') return;
  const map = byKind[kind];
  const prev = map.get(id) || [];
  prev.push(where);
  map.set(id, prev);
}

function readJson(fp) {
  try {
    return JSON.parse(fs.readFileSync(fp, 'utf8'));
  } catch (e) {
    return null;
  }
}

for (let ki = 0; ki < KINDS.length; ki++) {
  const kind = KINDS[ki];
  const dir = path.join(ROOT, '.homeycompose', 'flow', kind);
  if (!fs.existsSync(dir)) continue;
  const files = fs.readdirSync(dir).filter(function (f) { return f.endsWith('.json'); });
  for (let fi = 0; fi < files.length; fi++) {
    const file = files[fi];
    const j = readJson(path.join(dir, file));
    const cardId = (j && j.id) ? j.id : path.basename(file, '.json');
    add(kind, cardId, '.homeycompose/flow/' + kind + '/' + file);
  }
}

const driversDir = path.join(ROOT, 'drivers');
const driverIds = fs.readdirSync(driversDir);
for (let di = 0; di < driverIds.length; di++) {
  const id = driverIds[di];
  const fp = path.join(driversDir, id, 'driver.flow.compose.json');
  if (!fs.existsSync(fp)) continue;
  const j = readJson(fp);
  if (!j) continue;
  for (let ki = 0; ki < KINDS.length; ki++) {
    const kind = KINDS[ki];
    const cards = j[kind] || [];
    for (let ci = 0; ci < cards.length; ci++) {
      const card = cards[ci];
      add(kind, card && card.id, 'drivers/' + id + '/driver.flow.compose.json');
    }
  }
}

let failed = false;
let total = 0;
for (let ki = 0; ki < KINDS.length; ki++) {
  const kind = KINDS[ki];
  total += byKind[kind].size;
  const dups = [];
  byKind[kind].forEach(function (locs, cardId) {
    if (locs.length > 1) dups.push([cardId, locs]);
  });
  if (!dups.length) continue;
  failed = true;
  console.error('Duplicate Flow ' + kind + ': ' + dups.length);
  for (let i = 0; i < Math.min(dups.length, 50); i++) {
    console.error('  - ' + dups[i][0]);
    for (let j = 0; j < dups[i][1].length; j++) {
      console.error('      ' + dups[i][1][j]);
    }
  }
}

if (failed) process.exit(1);
console.log('Flow card ID uniqueness OK (' + total + ' compose ids)');
