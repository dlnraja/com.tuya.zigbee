"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, "drivers");
const REPORT_DIR = path.join(ROOT, "project-data");
const REPORT_FILE = path.join(REPORT_DIR, "normalize_report_v38.json");

function exists(p){ try{ fs.accessSync(p); return true; } catch { return false; } }
function ensureDir(p){ if (!exists(p)) fs.mkdirSync(p, { recursive: true }); }
function readJSON(p){ return JSON.parse(fs.readFileSync(p, "utf8")); }
function writeJSON(p, o){ fs.writeFileSync(p, JSON.stringify(o, null, 2) + "\n", "utf8"); }
function uniq(a){ return Array.from(new Set(a)); }
function asNum(x){ const n = Number(x); return Number.isFinite(n) ? n : x; }

function listDriverFolders(){
  if (!exists(DRIVERS_DIR)) return [];
  return fs.readdirSync(DRIVERS_DIR).filter(d => exists(path.join(DRIVERS_DIR, d, 'driver.compose.json')));
}

(function main(){
  ensureDir(REPORT_DIR);
  const report = { timestamp: new Date().toISOString(), drivers: [], errors: [] };
  const folders = listDriverFolders();

  for (const folder of folders){
    const file = path.join(DRIVERS_DIR, folder, 'driver.compose.json');
    let json;
    try {
      json = readJSON(file);
    } catch (e){
      report.errors.push({ folder, error: `JSON parse failed: ${e.message}` });
      continue;
    }
    const before = JSON.stringify(json);

    if (json.zigbee){
      // productId
      if (Array.isArray(json.zigbee.productId)){
        json.zigbee.productId = uniq(json.zigbee.productId.map(String));
      }
      // manufacturerName
      if (Array.isArray(json.zigbee.manufacturerName)){
        json.zigbee.manufacturerName = uniq(json.zigbee.manufacturerName.map(String)).sort((a,b)=>a.localeCompare(b));
      }
      // endpoints normalization
      if (json.zigbee.endpoints && typeof json.zigbee.endpoints === 'object'){
        for (const ep of Object.keys(json.zigbee.endpoints)){
          const e = json.zigbee.endpoints[ep] || {};
          // clusters as numeric unique sorted
          if (Array.isArray(e.clusters)){
            e.clusters = uniq(e.clusters.map(asNum)).filter(x => typeof x === 'number' && Number.isFinite(x)).sort((a,b)=>a-b);
          }
          // bindings numeric unique sorted
          if (Array.isArray(e.bindings)){
            e.bindings = uniq(e.bindings.map(asNum)).filter(x => typeof x === 'number' && Number.isFinite(x)).sort((a,b)=>a-b);
          }
          json.zigbee.endpoints[ep] = e;
        }
      }

      // Ensure EF00 for TS0601
      const hasTS0601 = Array.isArray(json.zigbee.productId) && json.zigbee.productId.includes('TS0601');
      if (hasTS0601){
        json.zigbee.endpoints = json.zigbee.endpoints || {};
        const ep1 = json.zigbee.endpoints["1"] = json.zigbee.endpoints["1"] || {};
        ep1.clusters = Array.isArray(ep1.clusters) ? ep1.clusters : [];
        if (!ep1.clusters.includes(61184)) ep1.clusters.push(61184);
        ep1.bindings = Array.isArray(ep1.bindings) ? ep1.bindings : [];
        if (!ep1.bindings.includes(1)) ep1.bindings.push(1);
        // sort after potential push
        ep1.clusters = uniq(ep1.clusters).sort((a,b)=>a-b);
        ep1.bindings = uniq(ep1.bindings).sort((a,b)=>a-b);
      }
    }

    const after = JSON.stringify(json);
    const changed = before !== after;
    if (changed){
      fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n", "utf8");
    }
    report.drivers.push({ folder, changed });
  }

  writeJSON(REPORT_FILE, report);
  console.log(`Normalization complete. Report: ${REPORT_FILE}`);
})();
