'use strict';

// Shared reader for data/native-matrix-reviewed-duals.json (user decision 2026-10-04): reviewed
// exact-pair placements where the old driver keeps the couple. Collision gates treat a collision as
// reviewed only for the same manufacturer and the exact same driver set, never anything wider.
const fs = require('fs');
const path = require('path');

let cache = null;

function load(root) {
  const file = path.join(root || path.join(__dirname, '..', '..', '..'), 'data', 'native-matrix-reviewed-duals.json');
  if (cache && cache.file === file) { return cache.set; }
  const set = new Set();
  if (fs.existsSync(file)) {
    for (const e of JSON.parse(fs.readFileSync(file, 'utf8')).entries || []) {
      if (!e || !e.couple || !Array.isArray(e.drivers) || !e.reason || !e.source || !e.date) { continue; }
      set.add(`${String(e.couple).split('|')[0].toLowerCase()}=>${[...e.drivers].sort().join(',')}`);
    }
  }
  cache = { file, set };
  return set;
}

/** key is "mfr|pid" (any case); drivers is the list of drivers holding it. */
function isReviewedCollision(key, drivers, root) {
  const mfr = String(key).split('|')[0].toLowerCase();
  return load(root).has(`${mfr}=>${[...new Set(drivers)].sort().join(',')}`);
}

module.exports = { isReviewedCollision };
