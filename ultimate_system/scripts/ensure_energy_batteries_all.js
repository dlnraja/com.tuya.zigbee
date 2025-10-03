#!/usr/bin/env node
/*
 * ensure_energy_batteries_all.js
 * --------------------------------------------------------------
 * For each drivers/<id>/driver.compose.json:
 * - If capabilities include 'measure_battery' and energy.batteries is missing/empty,
 *   set energy.batteries = ['CR2032'] (conservative default).
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, 'drivers');

function readJsonSafe(filePath) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch (_) { return null; }
}
function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function fixOne(file) {
  const manifest = readJsonSafe(file);
  if (!manifest) return false;
  const caps = Array.isArray(manifest.capabilities) ? manifest.capabilities : [];
  const needs = caps.includes('measure_battery');
  if (!needs) return false;
  manifest.energy = manifest.energy || {};
  if (!Array.isArray(manifest.energy.batteries) || manifest.energy.batteries.length === 0) {
    manifest.energy.batteries = ['CR2032'];
    writeJson(file, manifest);
    return true;
  }
  return false;
}

function main() {
  const entries = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name);
  let fixed = 0;
  entries.forEach((driverId, idx) => {
    const file = path.join(DRIVERS_DIR, driverId, 'driver.compose.json');
    if (fs.existsSync(file) && fixOne(file)) fixed++;
    if ((idx + 1) % 25 === 0) console.log(`   • Progression: ${idx + 1}/${entries.length}`);
  });
  console.log(`✅ energy.batteries ensured for ${fixed} drivers`);
}

if (require.main === module) {
  try { main(); } catch (e) { console.error('Failed:', e); process.exit(1); }
}
