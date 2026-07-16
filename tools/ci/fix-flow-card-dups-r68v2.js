#!/usr/bin/env node
/**
 * R68 v2: Fix flow card ID collisions across drivers (R65 had a bug)
 *
 * For each cross-driver collision, rename the subdriver's copy by prepending
 * the driver name to make it unique.
 *
 * Examples fixed:
 *   bulb_dimmable_dimmer_turned_on in BOTH bulb_dimmable and bulb_dimmable_dimmer
 *     → renamed in bulb_dimmable to bulb_dimmable_bulb_dimmable_dimmer_turned_on
 *   (the parent/subdriver ambiguity is too complex to handle generically, so
 *   we just rename the FIRST occurrence in driver-name order)
 */
'use strict';

const fs = require('fs');
const path = require('path');

const DRIVERS = path.resolve(__dirname, '..', '..', 'drivers');

// Phase 1: collect all flow card IDs grouped by driver
const byDriver = new Map(); // driver → {triggers, actions, conditions}
for (const d of fs.readdirSync(DRIVERS)) {
  const f = path.join(DRIVERS, d, 'driver.flow.compose.json');
  if (!fs.existsSync(f)) continue;
  const c = JSON.parse(fs.readFileSync(f, 'utf8'));
  byDriver.set(d, c);
}

// Phase 2: find IDs that appear in multiple drivers
const idToDrivers = new Map();
for (const [driver, c] of byDriver) {
  for (const section of ['triggers', 'actions', 'conditions']) {
    if (!c[section]) continue;
    for (const card of c[section]) {
      if (!idToDrivers.has(card.id)) idToDrivers.set(card.id, new Set());
      idToDrivers.get(card.id).add(driver);
    }
  }
}

const collisions = [];
for (const [id, drivers] of idToDrivers) {
  if (drivers.size > 1) collisions.push({ id, drivers: [...drivers] });
}
console.log(`Found ${collisions.length} cross-driver flow card ID collisions`);

// Phase 3: for each collision, decide which driver keeps the original ID
// and rename the others. Strategy: sort by driver name length, longest keeps
// original (most specific), shorter drivers get the prefix prepended.
let totalRenamed = 0;
const changesByFile = new Map();

for (const { id, drivers } of collisions) {
  // Sort: longer names first → they keep the original
  drivers.sort((a, b) => b.length - a.length);
  const owner = drivers[0];
  const others = drivers.slice(1);
  for (const d of others) {
    const newId = `${d}_${id}`;
    if (newId === id) continue;
    if (!changesByFile.has(d)) changesByFile.set(d, []);
    changesByFile.get(d).push({ oldId: id, newId });
  }
}

// Phase 4: apply changes
for (const [driver, changes] of changesByFile) {
  const f = path.join(DRIVERS, driver, 'driver.flow.compose.json');
  const c = JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const section of ['triggers', 'actions', 'conditions']) {
    if (!c[section]) continue;
    for (const card of c[section]) {
      for (const ch of changes) {
        if (card.id === ch.oldId) {
          card.id = ch.newId;
          totalRenamed++;
        }
      }
    }
  }
  fs.writeFileSync(f, JSON.stringify(c, null, 2));
}

console.log(`\n=== R68 v2 SUMMARY ===`);
console.log(`Cross-driver collisions fixed: ${totalRenamed}`);
console.log(`Files modified: ${changesByFile.size}`);
// Show top drivers
const sorted = [...changesByFile.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 5);
for (const [d, ch] of sorted) console.log(`  ${d}: ${ch.length} IDs renamed`);
