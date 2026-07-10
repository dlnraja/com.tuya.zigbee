#!/usr/bin/env node
'use strict';

const fs = require('fs');
const p = require('path');
const DD = 'drivers';

// Build map of FPs in dedicated drivers
const specific = new Map();
for (const d of fs.readdirSync(DD)) {
  if (d === 'generic_tuya' || d === 'universal_fallback') continue;
  const f = p.join(DD, d, 'driver.compose.json');
  if (!fs.existsSync(f)) continue;
  try {
    const j = JSON.parse(fs.readFileSync(f, 'utf8'));
    for (const m of (j.zigbee?.manufacturerName || [])) {
      specific.set(m.toLowerCase(), d);
    }
  } catch (e) { /* skip invalid */ }
}

// Check generic_tuya for FPs that belong in dedicated drivers
const gf = p.join(DD, 'generic_tuya', 'driver.compose.json');
if (!fs.existsSync(gf)) process.exit(0);
const g = JSON.parse(fs.readFileSync(gf, 'utf8'));
let warn = 0;
for (const fp of (g.zigbee?.manufacturerName || [])) {
  const dd = specific.get(fp.toLowerCase());
  if (dd) {
    console.log('::warning::' + fp + ' in generic_tuya has dedicated: ' + dd);
    warn++;
  }
}
console.log('Misplaced FP check: ' + warn + ' warnings');
