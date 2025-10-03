#!/usr/bin/env node
/* Battery_Metadata_Fixer.js
 * - Ensures battery-powered drivers declare energy.batteries
 * - Respects curated overrides first; otherwise defaults to CR2032
 * - Writes a small metrics report
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const STATE_DIR = path.join(ROOT, 'ultimate_system', 'orchestration', 'state');
const OVERRIDES = path.join(STATE_DIR, 'curated_overrides.json');

function ensureDir(d){ if(!fs.existsSync(d)) fs.mkdirSync(d,{recursive:true}); }
function readJson(p){ try { return JSON.parse(fs.readFileSync(p,'utf8')); } catch { return null; } }
function writeJson(p,o){ ensureDir(path.dirname(p)); fs.writeFileSync(p, JSON.stringify(o,null,2),'utf8'); }
function hasBatteryCapability(m){
  const caps = Array.isArray(m.capabilities) ? m.capabilities : [];
  return caps.includes('measure_battery') || caps.includes('alarm_battery');
}

function main(){
  const curated = readJson(OVERRIDES) || {};
  let drivers=0, updated=0, skipped=0;
  for(const name of fs.readdirSync(DRIVERS_DIR)){
    const dir = path.join(DRIVERS_DIR, name);
    if(!fs.statSync(dir).isDirectory()) continue;
    const manifestPath = path.join(dir, 'driver.compose.json');
    if(!fs.existsSync(manifestPath)) continue;
    const m = readJson(manifestPath); if(!m) continue; drivers++;
    if(!hasBatteryCapability(m)) { skipped++; continue; }
    const ov = curated[name];
    const batteries = ov && Array.isArray(ov.batteries) && ov.batteries.length ? ov.batteries : ['CR2032'];
    m.energy = m.energy || {};
    const before = Array.isArray(m.energy.batteries) ? m.energy.batteries.slice() : [];
    if(before.length === 0) {
      m.energy.batteries = batteries;
      fs.writeFileSync(manifestPath, JSON.stringify(m,null,2),'utf8');
      updated++;
    }
  }
  writeJson(path.join(STATE_DIR,'battery_fixer_report.json'), {
    generatedAt: new Date().toISOString(), drivers, updated, skipped
  });
  console.log(`✅ Battery metadata fix complete • drivers=${drivers} • updated=${updated} • skipped=${skipped}`);
}

if(require.main===module) main();
