#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const APPLY = process.argv.includes('--apply');
let driversFixed = 0, variantsAdded = 0;
// P2965: padded manufacturerNames are byte-exact (P2941) and allowlisted dedicated drivers
// (data/rules/padded-mfr-allowlist.json, P2958) hold exact Z2M lists. 9.0.1593: this script
// added "aoyan  "/"aoyan" twins to them and the identifier-audit gate failed every publish run.
function loadExactDrivers() {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'rules', 'padded-mfr-allowlist.json'), 'utf8'));
    return new Set((j.entries || []).map((e) => e.driver));
  } catch (e) { return new Set(); }
}
const EXACT_DRIVERS = loadExactDrivers();
function caseTwins(mfr) {
  const existing = new Set(mfr.map(m => String(m)));
  const toAdd = [];
  for (const m of mfr) {
    const str = String(m);
    if (str.startsWith('_T') || str.startsWith('_t')) {continue;}
    if (str.length < 3) {continue;}
    if (str !== str.trim()) {continue;} // padded form: never invent a case twin
    const opposite = str === str.toLowerCase() ? str.toUpperCase() : str.toLowerCase();
    if (!existing.has(opposite)) { toAdd.push(opposite); existing.add(opposite); }
  }
  return toAdd;
}
function processDriver(driverDir) {
  const composePath = path.join(driverDir, 'driver.compose.json');
  if (!fs.existsSync(composePath)) {return;}
  let content; try { content = JSON.parse(fs.readFileSync(composePath, 'utf8')); } catch (e) { return; }
  const mfr = content?.zigbee?.manufacturerName;
  if (!Array.isArray(mfr)) {return;}
  if (EXACT_DRIVERS.has(path.basename(driverDir))) {return;}
  const toAdd = caseTwins(mfr);
  if (toAdd.length > 0 && APPLY) {
    mfr.push(...toAdd);
    fs.writeFileSync(composePath, `${JSON.stringify(content, null, 2)  }\n`, 'utf8');
    try { JSON.parse(fs.readFileSync(composePath, 'utf8')); } catch (e) { return; }
    driversFixed++; variantsAdded += toAdd.length;
  }
}
module.exports = { caseTwins, EXACT_DRIVERS };
if (require.main === module) {
  const dirs = fs.readdirSync(DRIVERS_DIR);
  for (const d of dirs) { const full = path.join(DRIVERS_DIR, d); if (fs.statSync(full).isDirectory()) {processDriver(full);} }
  console.log(`Drivers: ${driversFixed}, Variants: ${variantsAdded}, Mode: ${APPLY ? 'APPLY' : 'DRY'}`);
}
