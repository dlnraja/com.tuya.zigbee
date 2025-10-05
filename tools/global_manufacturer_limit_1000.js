"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = process.cwd();
const DRIVERS = path.join(ROOT, "drivers");
const REPORT_DIR = path.join(ROOT, "project-data");
const REPORT = path.join(REPORT_DIR, "global_1000_limit_report_v38.json");

const MAX_GLOBAL_MANUFACTURERS = 1000;

function ex(p){ try{ fs.accessSync(p); return true; } catch{ return false; } }
function dj(p){ return JSON.parse(fs.readFileSync(p, "utf8")); }
function wj(p, obj){ fs.writeFileSync(p, JSON.stringify(obj, null, 2) + "\n", "utf8"); }
function uj(a){ return Array.from(new Set(a)); }
function ed(p){ if(!ex(p)) fs.mkdirSync(p,{recursive:true}); }
function drivers(){ return ex(DRIVERS)? fs.readdirSync(DRIVERS).filter(d=>ex(path.join(DRIVERS,d,'driver.compose.json'))):[]; }

function getDriverType(folder){
  const f = folder.toLowerCase();
  if(/dimmer/.test(f)) return 'dimmer';
  if(/switch/.test(f) && !/dimmer/.test(f)) return 'switch';
  if(/plug|outlet|socket/.test(f)) return 'plug';
  if(/bulb|spot|strip/.test(f)) return 'bulb';
  if(/curtain|roller|shade/.test(f)) return 'curtain';
  if(/lock/.test(f)) return 'lock';
  if(/valve/.test(f)) return 'valve';
  if(/thermostat|radiator/.test(f)) return 'thermostat';
  if(/contact|door.*window/.test(f)) return 'contact';
  if(/motion|pir|radar|presence/.test(f)) return 'motion';
  if(/water.*leak/.test(f)) return 'water_leak';
  if(/smoke/.test(f)) return 'smoke';
  if(/air|co2|pm25|tvoc|formaldehyde/.test(f)) return 'air_quality';
  if(/temp|humidity|climate/.test(f)) return 'climate';
  if(/sensor|detector|monitor/.test(f)) return 'sensor';
  return 'other';
}

(function main(){
  ed(REPORT_DIR);
  
  // Phase 1: Collect all manufacturerName with frequency and type mapping
  const globalIndex = new Map(); // name -> { count, types: Set }
  const driverData = new Map(); // folder -> { type, names }
  
  for(const folder of drivers()){
    const file = path.join(DRIVERS, folder, 'driver.compose.json');
    let j; try{ j = dj(file); } catch{ continue; }
    
    const type = getDriverType(folder);
    const names = (j.zigbee && Array.isArray(j.zigbee.manufacturerName)) ? j.zigbee.manufacturerName : [];
    const cleanNames = names.filter(n => typeof n === 'string' && !/x{3,}/i.test(n) && n.trim().length > 3);
    
    driverData.set(folder, { type, names: cleanNames, file, json: j });
    
    for(const name of cleanNames){
      if(!globalIndex.has(name)) globalIndex.set(name, { count: 0, types: new Set() });
      const entry = globalIndex.get(name);
      entry.count++;
      entry.types.add(type);
    }
  }
  
  // Phase 2: Rank and select top 1000 manufacturers
  const ranked = Array.from(globalIndex.entries())
    .map(([name, data]) => ({
      name,
      count: data.count,
      typeCount: data.types.size,
      types: Array.from(data.types),
      score: data.count * 10 + data.types.size // prioritize frequency then diversity
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_GLOBAL_MANUFACTURERS);
  
  const allowedNames = new Set(ranked.map(r => r.name));
  
  // Phase 3: Rebuild each driver with only allowed names
  let updated = 0;
  const stats = { 
    totalBefore: globalIndex.size, 
    totalAfter: allowedNames.size,
    driversUpdated: 0,
    removedCount: 0
  };
  
  for(const [folder, data] of driverData.entries()){
    const before = data.names.length;
    const filtered = data.names.filter(n => allowedNames.has(n));
    
    // If empty after filtering, add generic fallback
    if(filtered.length === 0){
      // Find top 3 for this type from allowed list
      const typeNames = ranked
        .filter(r => r.types.includes(data.type))
        .slice(0, 3)
        .map(r => r.name);
      filtered.push(...typeNames);
    }
    
    data.json.zigbee = data.json.zigbee || {};
    data.json.zigbee.manufacturerName = uj(filtered).sort((a,b)=>a.localeCompare(b));
    
    if(before !== data.json.zigbee.manufacturerName.length){
      wj(data.file, data.json);
      stats.driversUpdated++;
      stats.removedCount += (before - data.json.zigbee.manufacturerName.length);
    }
  }
  
  const rep = {
    timestamp: new Date().toISOString(),
    limit: MAX_GLOBAL_MANUFACTURERS,
    stats,
    top50: ranked.slice(0, 50).map(r => ({ name: r.name, count: r.count, types: r.types }))
  };
  
  wj(REPORT, rep);
  console.log(`Global limit applied: ${stats.totalBefore} -> ${stats.totalAfter} unique manufacturers`);
  console.log(`Updated ${stats.driversUpdated} drivers, removed ${stats.removedCount} entries total`);
  console.log(`Report -> ${REPORT}`);
})();
