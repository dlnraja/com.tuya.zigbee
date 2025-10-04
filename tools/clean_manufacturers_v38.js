"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, "drivers");
const REPORT_DIR = path.join(ROOT, "project-data");
const REPORT_FILE = path.join(REPORT_DIR, "manufacturer_cleanup_report_v38.json");

function exists(p){ try{ fs.accessSync(p); return true; } catch{ return false; } }
function readJSON(p){ return JSON.parse(fs.readFileSync(p, "utf8")); }
function writeJSON(p, obj){ fs.writeFileSync(p, JSON.stringify(obj, null, 2) + "\n", "utf8"); }
function ensureDir(p){ if (!exists(p)) fs.mkdirSync(p, { recursive: true }); }
function uniq(arr){ return Array.from(new Set(arr)); }

function listDriverFolders(){
  if (!exists(DRIVERS_DIR)) return [];
  return fs.readdirSync(DRIVERS_DIR).filter(d => exists(path.join(DRIVERS_DIR, d, 'driver.compose.json')));
}

function isPlaceholder(name){
  if (typeof name !== 'string') return true;
  // remove any with obvious placeholders or incomplete vendor prefix only
  if (/x{5,}/i.test(name)) return true; // _TZ3000_xxxxx / xxxxxxxx
  if (/^_TZ\d+_$/.test(name)) return true; // trailing underscore only
  if (/^_TZE\d+_$/.test(name)) return true;
  if (/^_TZ\d+$/i.test(name)) return true; // no suffix
  if (/^_TZE\d+$/i.test(name)) return true;
  return false;
}

(function main(){
  ensureDir(REPORT_DIR);
  const report = { timestamp: new Date().toISOString(), drivers: [] };
  const folders = listDriverFolders();

  for (const folder of folders){
    const file = path.join(DRIVERS_DIR, folder, 'driver.compose.json');
    let json;
    try {
      json = readJSON(file);
    } catch (e) {
      report.drivers.push({ folder, error: `JSON parse failed: ${e.message}` });
      continue;
    }
    if (!json.zigbee || !Array.isArray(json.zigbee.manufacturerName)) {
      continue;
    }
    const before = json.zigbee.manufacturerName.slice();
    // Clean
    let arr = before.filter(x => !isPlaceholder(x));
    // Dedup and sort
    arr = uniq(arr).sort((a,b) => a.localeCompare(b));
    json.zigbee.manufacturerName = arr;

    // Write back only if changed
    const changed = JSON.stringify(before) !== JSON.stringify(arr);
    if (changed){
      fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n", "utf8");
    }

    report.drivers.push({
      folder,
      removed: before.filter(x => isPlaceholder(x)).length,
      finalCount: arr.length,
      changed
    });
  }

  writeJSON(REPORT_FILE, report);
  console.log(`Manufacturer cleanup complete. Report: ${REPORT_FILE}`);
})();
