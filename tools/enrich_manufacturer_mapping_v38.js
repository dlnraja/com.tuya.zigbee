"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, "drivers");
const REPORT_DIR = path.join(ROOT, "project-data");
const REPORT_FILE = path.join(REPORT_DIR, "manufacturer_enrichment_report_v38.json");
const MIGRATION_TXT = path.join(REPORT_DIR, "migration_temp_V38.txt");

function exists(p){ try{ fs.accessSync(p); return true; } catch{ return false; } }
function ensureDir(p){ if (!exists(p)) fs.mkdirSync(p, { recursive: true }); }
function readJSON(p){ return JSON.parse(fs.readFileSync(p, "utf8")); }
function writeJSON(p, o){ fs.writeFileSync(p, JSON.stringify(o, null, 2) + "\n", "utf8"); }
function uniq(a){ return Array.from(new Set(a)); }

// Minimal curated hints derived from previous successes/memories
const HINTS = {
  lighting: new Set([
    "_TZ3000_ji4araar","_TZ3000_qzjcsmar","_TZ3000_fllyghyj"
  ]),
  plugs: new Set([
    "_TZ3000_g5xawfcq","_TZ3000_cehuw1lw"
  ]),
  climate: new Set([
    "_TZE200_cwbvmsar","_TZE200_bjawzodf"
  ]),
  curtains: new Set([
    "_TZE200_fctwhugx","_TZE200_cowvfni3"
  ]),
  motion: new Set([
    "_TZ3000_mmtwjmaq","_TZ3000_kmh5qpmb","_TZE200_3towulqd"
  ]),
  contact: new Set([
    "_TZ3000_26fmupbb","_TZ3000_n2egfsli"
  ])
};

const ALL_HINTS = new Map();
for (const [cat, set] of Object.entries(HINTS)){
  for (const id of set){ ALL_HINTS.set(id, cat); }
}

function driverCategory(folder, cls){
  const f = folder.toLowerCase();
  if (cls === 'light' || /bulb|strip|spot|ceiling|rgb|tunable/.test(f)) return 'lighting';
  if (cls === 'socket' || /plug|outlet|socket/.test(f)) return 'plugs';
  if (/curtain|roller|shade/.test(f)) return 'curtains';
  if (/door_window|contact/.test(f)) return 'contact';
  if (/motion|pir|presence|radar/.test(f)) return 'motion';
  if (cls === 'sensor' || /climate|temperature|humidity|air|tvoc|co2|pm25/.test(f)) return 'climate';
  if (/switch|relay/.test(f)) return 'switches';
  if (/smoke|co_detector|gas|water_leak/.test(f)) return 'safety';
  if (/lock|fingerprint/.test(f)) return 'locks';
  return 'other';
}

function listDriverFolders(){
  if (!exists(DRIVERS_DIR)) return [];
  return fs.readdirSync(DRIVERS_DIR).filter(d => exists(path.join(DRIVERS_DIR, d, 'driver.compose.json')));
}

function loadManifest(folder){
  const file = path.join(DRIVERS_DIR, folder, 'driver.compose.json');
  try{
    const j = readJSON(file);
    return { file, json: j };
  } catch(e){
    return { file, error: e.message };
  }
}

function buildCategoryTargets(folders){
  // choose one canonical target per category by heuristics
  const targets = {};
  for (const folder of folders){
    const { json } = loadManifest(folder);
    if (!json) continue;
    const cat = driverCategory(folder, json.class || '');
    // Prefer stable known targets
    if (!targets[cat]){
      if (cat === 'lighting' && /smart_bulb_rgb|ceiling_light_rgb|led_strip_controller/.test(folder)) targets[cat] = folder;
      else if (cat === 'climate' && /comprehensive_air_monitor|climate_monitor/.test(folder)) targets[cat] = folder;
      else if (cat === 'plugs' && /smart_plug|smart_outlet_monitor/.test(folder)) targets[cat] = folder;
      else if (cat === 'motion' && /motion_sensor_pir_battery|motion_sensor_mmwave/.test(folder)) targets[cat] = folder;
      else if (cat === 'contact' && /door_window_sensor/.test(folder)) targets[cat] = folder;
      else if (cat === 'curtains' && /curtain_motor|smart_curtain_motor/.test(folder)) targets[cat] = folder;
      else targets[cat] = folder; // fallback first seen
    }
  }
  return targets;
}

(function main(){
  ensureDir(REPORT_DIR);
  const report = { timestamp: new Date().toISOString(), moved: [], skipped: [], errors: [] };
  const folders = listDriverFolders();
  const targets = buildCategoryTargets(folders);

  // Load all manifests once
  const manifests = new Map();
  for (const folder of folders){
    const m = loadManifest(folder);
    manifests.set(folder, m);
    if (m.error) report.errors.push({ folder, error: m.error });
  }

  // Process manufacturerName relocation using hints only
  for (const folder of folders){
    const m = manifests.get(folder);
    if (!m || m.error) continue;
    const j = m.json;
    const cls = j.class || '';
    const cat = driverCategory(folder, cls);
    const names = (j.zigbee && Array.isArray(j.zigbee.manufacturerName)) ? j.zigbee.manufacturerName.slice() : [];
    if (!names.length) continue;

    let keep = [];
    const moveOut = [];
    for (const id of names){
      const hintedCat = ALL_HINTS.get(id);
      if (!hintedCat){
        keep.push(id); // unknown → keep to avoid over-pruning
        continue;
        }
      if (hintedCat === cat){
        keep.push(id);
      } else {
        // relocate to target of hintedCat if available
        const toFolder = targets[hintedCat];
        if (toFolder && manifests.has(toFolder)){
          moveOut.push({ id, toFolder });
        } else {
          // no known target → keep
          keep.push(id);
        }
      }
    }

    // Apply changes to source
    const beforeStr = JSON.stringify(names);
    const after = uniq(keep).sort((a,b)=>a.localeCompare(b));
    if (!j.zigbee) j.zigbee = {};
    j.zigbee.manufacturerName = after;

    // Inject into targets
    for (const { id, toFolder } of moveOut){
      const tm = manifests.get(toFolder);
      if (!tm || tm.error) continue;
      const tj = tm.json;
      tj.zigbee = tj.zigbee || {};
      tj.zigbee.manufacturerName = Array.isArray(tj.zigbee.manufacturerName) ? tj.zigbee.manufacturerName : [];
      if (!tj.zigbee.manufacturerName.includes(id)){
        tj.zigbee.manufacturerName.push(id);
        tj.zigbee.manufacturerName = uniq(tj.zigbee.manufacturerName).sort((a,b)=>a.localeCompare(b));
        report.moved.push({ id, from: folder, to: toFolder });
        fs.appendFileSync(MIGRATION_TXT, `${id}::MANUFACTURER::${folder}->${toFolder}\n`, "utf8");
      } else {
        report.skipped.push({ id, from: folder, to: toFolder, reason: 'duplicate' });
      }
    }

    const changed = beforeStr !== JSON.stringify(j.zigbee.manufacturerName);
    if (changed){
      fs.writeFileSync(m.file, JSON.stringify(j, null, 2) + "\n", "utf8");
    }
  }

  // Write all updated targets back
  for (const [folder, m] of manifests.entries()){
    if (!m || m.error) continue;
    fs.writeFileSync(m.file, JSON.stringify(m.json, null, 2) + "\n", "utf8");
  }

  writeJSON(REPORT_FILE, report);
  console.log(`Manufacturer enrichment complete. Moves: ${report.moved.length}, Skipped: ${report.skipped.length}`);
  console.log(`Report: ${REPORT_FILE}`);
})();
