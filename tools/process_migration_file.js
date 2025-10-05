"use strict";
const fs = require("fs");
const path = require("path");

function arg(name, def){ const i = process.argv.indexOf(name); return (i>=0 && i+1<process.argv.length) ? process.argv[i+1] : def; }
function exists(p){ try{ fs.accessSync(p); return true; } catch { return false; } }
function readJSON(p){ return JSON.parse(fs.readFileSync(p, "utf8")); }
function writeJSON(p, o){ fs.writeFileSync(p, JSON.stringify(o, null, 2) + "\n", "utf8"); }
function uniq(a){ return Array.from(new Set(a)); }

const ROOT = process.cwd();
const FILE = arg("--file", path.join("project-data","migration_temp_V38.txt"));
const DRIVERS_DIR = path.join(ROOT, "drivers");
const REPORT = path.join(ROOT, "project-data", "process_migration_report_v38.json");

const TS_TO_DRIVER = {
  TS0601: "dimmer_switch_1gang_ac",
  TS110E: "dimmer_switch_1gang_ac",
  TS0501A: "dimmer",
  TS0502A: "ceiling_light_controller",
  TS0505A: "ceiling_light_rgb"
};

const HINTS = {
  lighting: new Set(["_TZ3000_ji4araar","_TZ3000_qzjcsmar","_TZ3000_fllyghyj"]),
  plugs: new Set(["_TZ3000_g5xawfcq","_TZ3000_cehuw1lw"]),
  climate: new Set(["_TZE200_cwbvmsar","_TZE200_bjawzodf"]),
  curtains: new Set(["_TZE200_fctwhugx","_TZE200_cowvfni3"]),
  motion: new Set(["_TZ3000_mmtwjmaq","_TZ3000_kmh5qpmb","_TZE200_3towulqd"]),
  contact: new Set(["_TZ3000_26fmupbb","_TZ3000_n2egfsli"]) 
};
const ALL = new Map(); for (const [c, s] of Object.entries(HINTS)) for (const v of s) ALL.set(v, c);

function driverCategory(folder, cls){
  const f = folder.toLowerCase();
  if (cls === 'light' || /bulb|strip|spot|ceiling|rgb|tunable|dimmer/.test(f)) return 'lighting';
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
  const json = readJSON(file);
  return { file, json };
}
function saveManifest(file, json){ fs.writeFileSync(file, JSON.stringify(json, null, 2)+"\n", 'utf8'); }

function findDriverByProductId(ts, manifests){
  const needle = String(ts).toUpperCase();
  for (const [folder, { json }] of manifests){
    const arr = json && json.zigbee && Array.isArray(json.zigbee.productId) ? json.zigbee.productId.map(String) : [];
    if (arr.map(x => x.toUpperCase()).includes(needle)) return folder;
  }
  return TS_TO_DRIVER[needle] || null;
}

function buildCategoryTargets(folders, manifests){
  const targets = {};
  for (const folder of folders){
    const { json } = manifests.get(folder);
    const cat = driverCategory(folder, json.class || '');
    if (!targets[cat]){
      if (cat === 'lighting' && /smart_bulb_rgb|ceiling_light_rgb|led_strip_controller|dimmer_switch_1gang_ac|(^|\b)dimmer(\b|$)/.test(folder)) targets[cat] = folder;
      else if (cat === 'climate' && /comprehensive_air_monitor|air_quality_monitor/.test(folder)) targets[cat] = folder;
      else if (cat === 'plugs' && /smart_plug|smart_outlet/.test(folder)) targets[cat] = folder;
      else targets[cat] = folder;
    }
  }
  return targets;
}

(function main(){
  const report = { timestamp: new Date().toISOString(), actions: [], errors: [] };
  const folders = listDriverFolders();
  const manifests = new Map();
  for (const folder of folders){ manifests.set(folder, loadManifest(folder)); }
  const catTargets = buildCategoryTargets(folders, manifests);

  if (!exists(FILE)){
    writeJSON(REPORT, report);
    console.log(`No migration file found: ${FILE}`);
    return;
  }

  const lines = fs.readFileSync(FILE, 'utf8').split(/\r?\n/).filter(Boolean);
  for (const line of lines){
    const parts = line.split("::");
    if (parts.length < 3){ report.errors.push({ line, reason: 'invalid_format' }); continue; }
    const idOrUnknown = parts[0];
    const tsOrUnknown = parts[1];
    const from = parts[2];
    if (!manifests.has(from)){ report.errors.push({ line, reason: 'source_not_found' }); continue; }

    if (/^TS\d+/i.test(tsOrUnknown)){
      // Relocate productId
      const ts = tsOrUnknown.toUpperCase();
      const target = findDriverByProductId(ts, manifests);
      if (!target || !manifests.has(target)){ report.errors.push({ line, reason: 'target_not_found_for_ts', target }); continue; }
      const src = manifests.get(from); const dst = manifests.get(target);
      src.json.zigbee = src.json.zigbee || {}; dst.json.zigbee = dst.json.zigbee || {};
      src.json.zigbee.productId = Array.isArray(src.json.zigbee.productId) ? src.json.zigbee.productId : [];
      dst.json.zigbee.productId = Array.isArray(dst.json.zigbee.productId) ? dst.json.zigbee.productId : [];
      // remove from src
      src.json.zigbee.productId = src.json.zigbee.productId.filter(x => String(x).toUpperCase() !== ts);
      // add to dst
      if (!dst.json.zigbee.productId.map(x=>String(x).toUpperCase()).includes(ts)) dst.json.zigbee.productId.push(ts);
      dst.json.zigbee.productId = uniq(dst.json.zigbee.productId);
      report.actions.push({ type: 'move_productId', ts, from, to: target });
      continue;
    }

    // manufacturerName relocation by heuristic category
    const id = idOrUnknown;
    const predicted = ALL.get(id) || null;
    const src = manifests.get(from);
    const srcArr = (src.json.zigbee && Array.isArray(src.json.zigbee.manufacturerName)) ? src.json.zigbee.manufacturerName : [];
    // remove from src
    src.json.zigbee = src.json.zigbee || {};
    src.json.zigbee.manufacturerName = srcArr.filter(x => x !== id);

    const cat = predicted || driverCategory(from, src.json.class || '');
    const target = catTargets[cat] || from;
    const dst = manifests.get(target);
    dst.json.zigbee = dst.json.zigbee || {};
    dst.json.zigbee.manufacturerName = Array.isArray(dst.json.zigbee.manufacturerName) ? dst.json.zigbee.manufacturerName : [];
    if (!dst.json.zigbee.manufacturerName.includes(id)) dst.json.zigbee.manufacturerName.push(id);
    dst.json.zigbee.manufacturerName = uniq(dst.json.zigbee.manufacturerName).sort((a,b)=>a.localeCompare(b));
    report.actions.push({ type: 'move_manufacturerName', id, from, to: target, category: cat });
  }

  // Save manifests
  for (const [folder, { file, json }] of manifests){ saveManifest(file, json); }

  // Remove migration file after applying
  try { fs.unlinkSync(FILE); report.actions.push({ type: 'unlink', file: FILE }); } catch {}

  writeJSON(REPORT, report);
  console.log(`Processed migration file. Report: ${REPORT}`);
})();
