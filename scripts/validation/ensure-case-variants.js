#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const APPLY = process.argv.includes('--apply');
let driversFixed = 0, variantsAdded = 0;
function processDriver(driverDir) {
  const composePath = path.join(driverDir, 'driver.compose.json');
  if (!fs.existsSync(composePath)) return;
  let content; try { content = JSON.parse(fs.readFileSync(composePath, 'utf8')); } catch (e) { return; }
  const mfr = content?.zigbee?.manufacturerName;
  if (!Array.isArray(mfr)) return;
  const existing = new Set(mfr.map(m => String(m)));
  const toAdd = [];
  for (const m of mfr) {
    const str = String(m);
    if (str.startsWith('_T') || str.startsWith('_t')) continue;
    if (str.length < 3) continue;
    const opposite = str === str.toLowerCase() ? str.toUpperCase() : str.toLowerCase();
    if (!existing.has(opposite)) { toAdd.push(opposite); existing.add(opposite); }
  }
  if (toAdd.length > 0 && APPLY) {
    mfr.push(...toAdd);
    fs.writeFileSync(composePath, JSON.stringify(content, null, 2) + '\n', 'utf8');
    try { JSON.parse(fs.readFileSync(composePath, 'utf8')); } catch (e) { return; }
    driversFixed++; variantsAdded += toAdd.length;
  }
}
const dirs = fs.readdirSync(DRIVERS_DIR);
for (const d of dirs) { const full = path.join(DRIVERS_DIR, d); if (fs.statSync(full).isDirectory()) processDriver(full); }
console.log(`Drivers: ${driversFixed}, Variants: ${variantsAdded}, Mode: ${APPLY ? 'APPLY' : 'DRY'}`);
