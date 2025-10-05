"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, "drivers");
const CATALOG_DIR = path.join(ROOT, "catalog");
const CATEGORIES_JSON = path.join(CATALOG_DIR, "categories.json");

function exists(p){ try{ fs.accessSync(p); return true; } catch { return false; } }
function readJSON(p){ return JSON.parse(fs.readFileSync(p, "utf8")); }
function ensureDir(p){ if (!exists(p)) fs.mkdirSync(p, { recursive: true }); }

const CLASS_ORDER = [
  "light",
  "socket",
  "sensor",
  "thermostat",
  "curtain",
  "lock",
  "doorbell",
  "button",
  "fan",
  "heater",
  "other"
];

(function main(){
  if (!exists(DRIVERS_DIR)){
    console.error("Drivers directory not found:", DRIVERS_DIR);
    process.exit(1);
  }
  ensureDir(CATALOG_DIR);
  const mapping = new Map(CLASS_ORDER.map(k => [k, new Set()]));

  const folders = fs.readdirSync(DRIVERS_DIR)
    .filter(d => exists(path.join(DRIVERS_DIR, d, 'driver.compose.json')));

  for (const folder of folders){
    const file = path.join(DRIVERS_DIR, folder, 'driver.compose.json');
    let j;
    try { j = readJSON(file); } catch (e) { continue; }
    let cls = (j.class || '').toLowerCase();
    if (!CLASS_ORDER.includes(cls)) cls = 'other';
    mapping.get(cls).add(folder);
  }

  // Build sorted arrays
  const out = {};
  for (const key of CLASS_ORDER){
    const arr = Array.from(mapping.get(key)).sort((a,b)=>a.localeCompare(b));
    out[key] = arr; // keep empty arrays for consistency
  }

  fs.writeFileSync(CATEGORIES_JSON, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log(`Rebuilt categories -> ${CATEGORIES_JSON}`);
})();
