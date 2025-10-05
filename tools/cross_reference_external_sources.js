"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = process.cwd();
const EXT_DIR = path.join(ROOT, ".external_sources");
const REPORT = path.join(ROOT, "project-data", "cross_reference_report_v38.json");

function ex(p){ try{ fs.accessSync(p); return true; } catch{ return false; } }
function dj(p){ return JSON.parse(fs.readFileSync(p, "utf8")); }
function wj(p, obj){ fs.writeFileSync(p, JSON.stringify(obj, null, 2) + "\n", "utf8"); }

(function main(){
  if(!ex(EXT_DIR)){
    console.log("No .external_sources directory, skipping cross-reference");
    process.exit(0);
  }
  
  // Load all external JSON files (blakadder, zigbee2mqtt, etc.)
  const files = fs.readdirSync(EXT_DIR).filter(f => f.endsWith('.json'));
  const externalDevices = [];
  
  for(const file of files){
    try{
      const data = dj(path.join(EXT_DIR, file));
      if(Array.isArray(data)){
        externalDevices.push(...data);
      } else if(data.devices && Array.isArray(data.devices)){
        externalDevices.push(...data.devices);
      }
    } catch{}
  }
  
  // Build manufacturer -> productId mapping from external sources
  const externalMap = new Map(); // manufacturer -> Set(productIds)
  for(const dev of externalDevices){
    const mfg = dev.manufacturerName || dev.manufacturer || dev.vendor;
    const pid = dev.productId || dev.model || dev.modelID;
    if(mfg && pid){
      if(!externalMap.has(mfg)) externalMap.set(mfg, new Set());
      externalMap.get(mfg).add(pid);
    }
  }
  
  const rep = {
    timestamp: new Date().toISOString(),
    externalSources: files.length,
    externalDevicesCount: externalDevices.length,
    uniqueManufacturers: externalMap.size,
    topManufacturers: Array.from(externalMap.entries())
      .map(([mfg, pids]) => ({ manufacturer: mfg, productCount: pids.size }))
      .sort((a,b) => b.productCount - a.productCount)
      .slice(0, 30)
  };
  
  wj(REPORT, rep);
  console.log(`Cross-Reference: ${externalMap.size} manufacturers from ${files.length} external sources. Report -> ${REPORT}`);
})();
