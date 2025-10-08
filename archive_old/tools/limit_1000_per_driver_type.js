"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = process.cwd();
const DRIVERS = path.join(ROOT, "drivers");
const REPORT_DIR = path.join(ROOT, "project-data");
const REPORT = path.join(REPORT_DIR, "limit_1000_per_type_report_v38.json");

const MAX_PER_TYPE = 1000;

function ex(p){ try{ fs.accessSync(p); return true; } catch{ return false; } }
function dj(p){ return JSON.parse(fs.readFileSync(p, "utf8")); }
function wj(p, obj){ fs.writeFileSync(p, JSON.stringify(obj, null, 2) + "\n", "utf8"); }
function uj(a){ return Array.from(new Set(a)); }
function ed(p){ if(!ex(p)) fs.mkdirSync(p,{recursive:true}); }
function drivers(){ return ex(DRIVERS)? fs.readdirSync(DRIVERS).filter(d=>ex(path.join(DRIVERS,d,'driver.compose.json'))):[]; }

function getDriverType(folder, cls){
  const f = folder.toLowerCase();
  const c = (cls||"").toLowerCase();
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
  
  // Phase 1: Group drivers by type and collect names
  const typeIndex = new Map(); // type -> Map(name -> count)
  const driversByType = new Map(); // type -> [{ folder, file, json, names }]
  
  for(const folder of drivers()){
    const file = path.join(DRIVERS, folder, 'driver.compose.json');
    let j; try{ j = dj(file); } catch{ continue; }
    
    const type = getDriverType(folder, j.class);
    const names = (j.zigbee && Array.isArray(j.zigbee.manufacturerName)) ? j.zigbee.manufacturerName : [];
    const cleanNames = names.filter(n => typeof n === 'string' && !/x{3,}/i.test(n) && n.trim().length > 3);
    
    if(!typeIndex.has(type)) typeIndex.set(type, new Map());
    if(!driversByType.has(type)) driversByType.set(type, []);
    
    const nameMap = typeIndex.get(type);
    for(const name of cleanNames){
      nameMap.set(name, (nameMap.get(name) || 0) + 1);
    }
    
    driversByType.get(type).push({ folder, file, json: j, names: cleanNames });
  }
  
  // Phase 2: For each type, select top 1000 names by frequency
  const allowedByType = new Map(); // type -> Set(allowed names)
  const typeStats = [];
  
  for(const [type, nameMap] of typeIndex.entries()){
    const totalNames = nameMap.size;
    const ranked = Array.from(nameMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, MAX_PER_TYPE);
    
    const allowed = new Set(ranked.map(r => r.name));
    allowedByType.set(type, allowed);
    
    typeStats.push({
      type,
      totalBefore: totalNames,
      totalAfter: allowed.size,
      driversCount: driversByType.get(type).length,
      top10: ranked.slice(0, 10).map(r => ({ name: r.name, count: r.count }))
    });
  }
  
  // Phase 3: Update each driver with filtered names
  let updated = 0;
  const changes = [];
  
  for(const [type, driversInType] of driversByType.entries()){
    const allowed = allowedByType.get(type);
    
    for(const driverData of driversInType){
      const before = driverData.names.length;
      const filtered = driverData.names.filter(n => allowed.has(n));
      
      // If empty, add top 3 for this type
      if(filtered.length === 0 && allowed.size > 0){
        const top3 = Array.from(allowed).slice(0, 3);
        filtered.push(...top3);
      }
      
      driverData.json.zigbee = driverData.json.zigbee || {};
      driverData.json.zigbee.manufacturerName = uj(filtered).sort((a,b)=>a.localeCompare(b));
      
      if(before !== driverData.json.zigbee.manufacturerName.length){
        wj(driverData.file, driverData.json);
        updated++;
        changes.push({
          folder: driverData.folder,
          type,
          before,
          after: driverData.json.zigbee.manufacturerName.length,
          removed: before - driverData.json.zigbee.manufacturerName.length
        });
      }
    }
  }
  
  const rep = {
    timestamp: new Date().toISOString(),
    maxPerType: MAX_PER_TYPE,
    driversUpdated: updated,
    typeStats: typeStats.sort((a,b) => b.driversCount - a.driversCount),
    sampleChanges: changes.slice(0, 20)
  };
  
  wj(REPORT, rep);
  console.log(`Limit 1000 per type applied: ${updated} drivers updated`);
  console.log(`Report -> ${REPORT}`);
})();
