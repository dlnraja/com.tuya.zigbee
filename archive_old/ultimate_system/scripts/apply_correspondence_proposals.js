#!/usr/bin/env node
/*
 * apply_correspondence_proposals.js
 * --------------------------------------------------------------
 * Recompute per-driver proposals from enrichment state and apply safe
 * updates to manifests:
 *  - Add proposed productIds not already present (merge)
 *  - If measure_battery and no batteries set, apply proposed batteries
 * Finally, run sdk3_quick_autofix to normalize and keep compliance.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const STATE_DIR = path.join(ROOT, 'ultimate_system', 'orchestration', 'state');
const ENRICH_FILE = path.join(STATE_DIR, 'data_enrichment.json');

function readJson(p){ try { return JSON.parse(fs.readFileSync(p,'utf8')); } catch { return null; } }
function writeJson(p,d){ fs.writeFileSync(p, JSON.stringify(d,null,2), 'utf8'); }
function asArr(v){ return Array.isArray(v) ? v : (v===undefined||v===null ? [] : [v]); }

function main(){
  const enrich = readJson(ENRICH_FILE);
  if (!enrich || !Array.isArray(enrich.enrichedManufacturers)) {
    console.error('No enrichment state found. Run Data_Enricher.js first.');
    process.exit(1);
  }
  const records = new Map();
  for (const rec of enrich.enrichedManufacturers) records.set(rec.manufacturer, rec);

  const ids = fs.readdirSync(DRIVERS_DIR,{withFileTypes:true}).filter(e=>e.isDirectory()).map(e=>e.name);
  let updated = 0;

  for (const id of ids) {
    const p = path.join(DRIVERS_DIR, id, 'driver.compose.json');
    if (!fs.existsSync(p)) continue;
    const man = readJson(p);
    if (!man || !man.zigbee) continue;

    const mf = man.zigbee.manufacturerName;
    const mfg = typeof mf === 'string' ? mf.trim() : null;
    if (!mfg) continue;
    const rec = records.get(mfg);
    if (!rec) continue;

    let changed = false;
    // ProductIds
    const curPids = new Set(asArr(man.zigbee.productId).map(String));
    const addPids = (rec.productIds||[]).filter(pid => !curPids.has(String(pid)));
    if (addPids.length) {
      man.zigbee.productId = Array.from(new Set([...curPids, ...addPids])).map(String);
      changed = true;
    }

    // Batteries
    const caps = new Set(Array.isArray(man.capabilities)?man.capabilities:[]);
    const hasMB = caps.has('measure_battery');
    const curBat = Array.isArray((man.energy||{}).batteries) ? man.energy.batteries : [];
    if (hasMB && (!curBat.length) && Array.isArray(rec.batteries) && rec.batteries.length) {
      man.energy = man.energy || {};
      man.energy.batteries = rec.batteries.slice(0, 2); // keep conservative
      changed = true;
    }

    if (changed) { writeJson(p, man); updated++; }
  }

  // Normalize once after changes
  try { execSync('node ultimate_system/scripts/sdk3_quick_autofix.js', { cwd: ROOT, stdio: 'inherit' }); } catch {}
  console.log(`✅ Applied correspondence proposals to ${updated} drivers`);
}

if (require.main===module){ try{ main(); } catch(e){ console.error('❌ apply_correspondence_proposals failed:', e.message); process.exit(1);} }

module.exports = { main };
