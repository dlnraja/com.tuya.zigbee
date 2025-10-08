"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, "drivers");
const REPORT_DIR = path.join(ROOT, "project-data");
const REPORT_FILE = path.join(REPORT_DIR, "audit_relocations_v38.json");
const MIGRATION_TXT = path.join(REPORT_DIR, "migration_temp_V38.txt");

function exists(p){ try{ fs.accessSync(p); return true; } catch{ return false; } }
function readJSON(p){ return JSON.parse(fs.readFileSync(p, "utf8")); }
function writeJSON(p, obj){ fs.writeFileSync(p, JSON.stringify(obj, null, 2) + "\n", "utf8"); }
function ensureDir(p){ if (!exists(p)) fs.mkdirSync(p, { recursive: true }); }
function uniq(arr){ return Array.from(new Set(arr)); }

function listDriverFolders(){
  if (!exists(DRIVERS_DIR)) return [];
  return fs.readdirSync(DRIVERS_DIR).filter(d => exists(path.join(DRIVERS_DIR, d, 'driver.compose.json')));
}

// Mapping: driver folder → expected TS set (heuristic)
function expectedTSForDriver(folder){
  const f = folder.toLowerCase();
  if (/(rgb|led_strip|rgb_led|ceiling_light_rgb|ceiling_light_controller)/.test(f)) return new Set(["TS0505A"]);
  if (/(tunable|cct)/.test(f)) return new Set(["TS0502A"]);
  if (/\bdimmer\b/.test(f) && !/switch_\d+gang/.test(f)) return new Set(["TS0501A"]);
  if (/dimmer_switch_1gang_ac/.test(f)) return new Set(["TS110E","TS0601"]);
  if (/(plug|outlet|extension_plug|energy_)/.test(f)) return new Set(["TS011F","TS0601"]);
  if (/(climate|temperature|humidity|air|sensor_advanced|comprehensive_air_monitor)/.test(f)) return new Set(["TS0201","TS0601"]);
  if (/(motion|pir)/.test(f)) return new Set(["TS0202","TS0601"]);
  if (/(door_window|contact)/.test(f)) return new Set(["TS0203"]);
  if (/(curtain|shade|roller_shutter)/.test(f)) return new Set(["TS130F","TS0601"]);
  if (/(co_detector|gas_detector)/.test(f)) return new Set(["TS0601"]);
  return new Set();
}

// Mapping TS → default target driver (must exist)
const tsToTarget = {
  TS0505A: 'smart_bulb_rgb',
  TS0502A: 'smart_bulb_tunable',
  TS0501A: 'dimmer',
  TS110E: 'dimmer_switch_1gang_ac',
  TS011F: 'smart_plug',
  TS0201: 'climate_monitor',
  TS0202: 'motion_sensor_pir_battery',
  TS0203: 'door_window_sensor_battery',
  TS130F: 'curtain_motor'
};

function chooseTargetForTS(ts, sourceFolder, sourceClass){
  if (ts === 'TS0601'){
    // EF00 fallback: choose by class/folder hints
    if (sourceClass === 'light' && /dimmer/.test(sourceFolder)) return 'dimmer_switch_1gang_ac';
    if (sourceClass === 'sensor' && /co_detector|gas/.test(sourceFolder)) return 'co_detector_pro';
    if (sourceClass === 'socket' || /plug|outlet/.test(sourceFolder)) return 'smart_plug';
    // default: keep in place if unsure
    return null;
  }
  const t = tsToTarget[ts];
  if (!t) return null;
  return t;
}

function auditAndRelocate(){
  ensureDir(REPORT_DIR);
  const report = { timestamp: new Date().toISOString(), records: [] };
  // reset migration file
  fs.writeFileSync(MIGRATION_TXT, "", "utf8");
  const drivers = listDriverFolders();

  // Cache of loaded driver manifests
  const manifests = new Map();
  function load(folder){
    if (manifests.has(folder)) return manifests.get(folder);
    const p = path.join(DRIVERS_DIR, folder, 'driver.compose.json');
    const j = readJSON(p);
    manifests.set(folder, { path: p, json: j });
    return manifests.get(folder);
  }

  // Build set of existing drivers
  const existingDrivers = new Set(drivers);

  // Phase 1: audit and build relocation list
  const relocations = [];
  for (const folder of drivers){
    const { json } = load(folder);
    const exp = expectedTSForDriver(folder);
    const prod = (json.zigbee && Array.isArray(json.zigbee.productId)) ? json.zigbee.productId.slice() : [];
    const cls = json.class || '';

    // Remove manufacturer placeholders if any
    if (json.zigbee && Array.isArray(json.zigbee.manufacturerName)){
      const before = json.zigbee.manufacturerName.length;
      json.zigbee.manufacturerName = json.zigbee.manufacturerName.filter(x => typeof x === 'string' && !/xxxxx/i.test(x));
      const after = json.zigbee.manufacturerName.length;
      if (after < before){
        report.records.push({ type: 'manufacturer_placeholder_removed', folder, removed: before - after });
      }
    }

    for (const ts of prod){
      if (exp.size && !exp.has(ts)){
        const target = chooseTargetForTS(ts, folder, cls);
        if (target && existingDrivers.has(target)){
          relocations.push({ ts, from: folder, to: target, reason: 'ts_not_expected_for_folder' });
        }
      }
    }
  }

  // Phase 2: apply relocations
  for (const r of relocations){
    const src = load(r.from);
    const dst = load(r.to);
    // Remove TS from source
    if (src.json.zigbee && Array.isArray(src.json.zigbee.productId)){
      src.json.zigbee.productId = src.json.zigbee.productId.filter(x => x !== r.ts);
    }
    // Add TS to target
    dst.json.zigbee = dst.json.zigbee || {};
    dst.json.zigbee.productId = Array.isArray(dst.json.zigbee.productId) ? dst.json.zigbee.productId : [];
    if (!dst.json.zigbee.productId.includes(r.ts)) dst.json.zigbee.productId.push(r.ts);

    // Ensure clusters for EF00 if TS0601
    if (r.ts === 'TS0601'){
      dst.json.zigbee.endpoints = dst.json.zigbee.endpoints || {};
      dst.json.zigbee.endpoints["1"] = dst.json.zigbee.endpoints["1"] || {};
      const ep1 = dst.json.zigbee.endpoints["1"];
      ep1.clusters = Array.isArray(ep1.clusters) ? ep1.clusters : [];
      if (!ep1.clusters.includes(61184)) ep1.clusters.push(61184);
      ep1.bindings = [1];
    }

    report.records.push({ type: 'productId_relocated', ts: r.ts, from: r.from, to: r.to });
    // Write migration line: [ID_FABRICANT]::[ID_PRODUIT_TS]::[DRIVER_SOURCE_INCORRECT]
    // Manufacturer unknown at productId level, use 'UNKNOWN' placeholder.
    fs.appendFileSync(MIGRATION_TXT, `UNKNOWN::${r.ts}::${r.from}\n`, "utf8");
  }

  // Phase 3: write back manifests (dedup arrays)
  for (const [folder, { path: p, json: j }] of manifests.entries()){
    if (j.zigbee){
      if (Array.isArray(j.zigbee.productId)) j.zigbee.productId = uniq(j.zigbee.productId);
      if (j.zigbee.endpoints && j.zigbee.endpoints["1"]){
        const ep1 = j.zigbee.endpoints["1"];
        if (Array.isArray(ep1.clusters)) ep1.clusters = uniq(ep1.clusters);
        ep1.bindings = [1];
      }
    }
    fs.writeFileSync(p, JSON.stringify(j, null, 2) + "\n", "utf8");
  }

  writeJSON(REPORT_FILE, report);
  console.log(`Audit & relocation completed. Records: ${report.records.length}`);
  console.log(`Migration file: ${MIGRATION_TXT}`);
}

auditAndRelocate();
