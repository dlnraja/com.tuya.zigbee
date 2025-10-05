"use strict";
/**
 * create_category.js
 *
 * Usage examples:
 *  node tools/create_category.js --name "enki_devices"
 *  node tools/create_category.js --name "enki_devices" --add-driver "enki_leroy_merlin_generic"
 *  node tools/create_category.js --name "smartthings_devices" --add-driver "samsung_smartthings_generic" --add-driver "ikea_tradfri_generic"
 */

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const CATALOG = path.join(ROOT, "catalog", "categories.json");
const DRIVERS = path.join(ROOT, "drivers");

function ex(p){ try{ fs.accessSync(p); return true; } catch { return false; } }

function argvToMap(){
  const map = new Map();
  const list = [];
  for(const arg of process.argv.slice(2)){
    if(arg.startsWith("--")){
      const [k, vRaw] = arg.split("=");
      if(vRaw !== undefined){ map.set(k.replace(/^--/, ''), vRaw); }
      else { map.set(k.replace(/^--/, ''), true); }
    } else {
      list.push(arg);
    }
  }
  return { map, list };
}

function loadJSON(p){ return JSON.parse(fs.readFileSync(p, "utf8")); }
function saveJSON(p, obj){ fs.writeFileSync(p, JSON.stringify(obj, null, 2) + "\n", "utf8"); }

(function main(){
  if(!ex(CATALOG)){
    console.error(`categories.json not found at ${CATALOG}`);
    process.exit(1);
  }

  const { map } = argvToMap();
  const name = (map.get("name") || "").trim();
  const addDrivers = ([]).concat(map.get("add-driver") || []).flatMap(v => String(v).split(",")).map(s=>s.trim()).filter(Boolean);
  if(!name){
    console.error("--name is required (category name)");
    process.exit(1);
  }

  const categories = loadJSON(CATALOG);
  if(!categories[name]){
    categories[name] = [];
  }

  const before = categories[name].length;

  for(const d of addDrivers){
    const driverPath = path.join(DRIVERS, d, 'driver.compose.json');
    if(!ex(driverPath)){
      console.warn(`⚠️  Driver not found, skipping: ${d}`);
      continue;
    }
    if(!categories[name].includes(d)){
      categories[name].push(d);
    }
  }

  categories[name] = Array.from(new Set(categories[name])).sort();
  saveJSON(CATALOG, categories);

  const after = categories[name].length;
  console.log(`✅ Category updated: ${name}`);
  console.log(`   Drivers: ${before} -> ${after}`);
  if(after){
    console.log(`   List: ${categories[name].join(', ')}`);
  }
})();
