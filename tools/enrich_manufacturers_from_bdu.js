"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = process.cwd();
const DRIVERS = path.join(ROOT, "drivers");
const BDU_N4 = path.join(ROOT, "references", "BDU_v38_n4.json");
const REPORT = path.join(ROOT, "project-data", "bdu_enrichment_report_v38.json");

function ex(p){ try{ fs.accessSync(p); return true; } catch{ return false; } }
function dj(p){ return JSON.parse(fs.readFileSync(p, "utf8")); }
function wj(p, obj){ fs.writeFileSync(p, JSON.stringify(obj, null, 2) + "\n", "utf8"); }
function uj(a){ return Array.from(new Set(a)); }
function drivers(){ return ex(DRIVERS)? fs.readdirSync(DRIVERS).filter(d=>ex(path.join(DRIVERS,d,'driver.compose.json'))):[]; }

(function main(){
  if(!ex(BDU_N4)){ console.log("BDU N4 not found, skipping enrichment"); process.exit(0); }
  
  const bdu = dj(BDU_N4);
  const devices = (bdu && Array.isArray(bdu.devices)) ? bdu.devices : [];
  
  // Build productId -> manufacturerNames mapping from BDU
  const pidMap = new Map();
  for(const dev of devices){
    const pid = dev.productId || dev.model;
    const mfg = dev.manufacturerName || dev.manufacturer;
    if(pid && mfg){
      if(!pidMap.has(pid)) pidMap.set(pid, new Set());
      pidMap.get(pid).add(mfg);
    }
  }
  
  let enriched = 0;
  const changes = [];
  
  for(const folder of drivers()){
    const file = path.join(DRIVERS, folder, 'driver.compose.json');
    let j; try{ j = dj(file); } catch{ continue; }
    
    const pids = (j.zigbee && Array.isArray(j.zigbee.productId)) ? j.zigbee.productId : [];
    const currentNames = (j.zigbee && Array.isArray(j.zigbee.manufacturerName)) ? j.zigbee.manufacturerName : [];
    
    const suggestions = new Set(currentNames);
    for(const pid of pids){
      if(pidMap.has(pid)){
        for(const name of pidMap.get(pid)){
          suggestions.add(name);
        }
      }
    }
    
    const before = currentNames.length;
    const newNames = uj(Array.from(suggestions).filter(n => typeof n === 'string' && n.trim().length > 3)).sort((a,b)=>a.localeCompare(b)).slice(0, 15);
    
    if(newNames.length > before && newNames.length <= 15){
      j.zigbee.manufacturerName = newNames;
      wj(file, j);
      enriched++;
      changes.push({ folder, before, after: newNames.length, added: newNames.length - before });
    }
  }
  
  wj(REPORT, { timestamp: new Date().toISOString(), enriched, sampleChanges: changes.slice(0, 20) });
  console.log(`BDU Enrichment: ${enriched} drivers enriched. Report -> ${REPORT}`);
})();
