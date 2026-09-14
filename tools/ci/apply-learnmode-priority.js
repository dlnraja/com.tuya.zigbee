'use strict';

/**
 * P2498 — apply class-aware learnmode to priority Zigbee drivers missing it.
 * Usage: node tools/ci/apply-learnmode-priority.js [--dry-run]
 */
const fs = require('fs');
const path = require('path');
const { buildLearnmode } = require('../../lib/pairing/LearnmodeTemplates');

const ROOT = path.join(__dirname, '..', '..');
const SSOT = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'config/architecture/pairing-discovery-ssot.json'), 'utf8'),
);
const DRY = process.argv.includes('--dry-run');

function isPriority(id) {
  return (SSOT.priorityDriverPrefixes || []).some((p) => String(id).startsWith(p) || String(id).includes(p.replace(/_$/, '')));
}

let applied = 0;
let skipped = 0;
for (const id of fs.readdirSync(path.join(ROOT, 'drivers'))) {
  if (!isPriority(id)) continue;
  const composePath = path.join(ROOT, 'drivers', id, 'driver.compose.json');
  if (!fs.existsSync(composePath)) continue;
  let j;
  try {
    j = JSON.parse(fs.readFileSync(composePath, 'utf8'));
  } catch (_e) {
    continue;
  }
  if (!j.zigbee) continue;
  if (j.zigbee.learnmode && j.zigbee.learnmode.instruction) {
    skipped++;
    continue;
  }
  const lm = buildLearnmode(id, j.class);
  j.zigbee.learnmode = lm;
  if (!DRY) {
    fs.writeFileSync(composePath, `${JSON.stringify(j, null, 2)}\n`);
  }
  console.log(DRY ? 'DRY' : 'SET', id, '→', lm.instruction.en.slice(0, 60) + '…');
  applied++;
}
console.log(`P2498 learnmode apply: ${applied} set, ${skipped} already had, dry=${DRY}`);
