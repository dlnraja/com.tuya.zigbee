"use strict";
/**
 * INTEGRATE ADDON SOURCES
 * 
 * Intègre les données fetched par addon_global_enrichment_orchestrator.js
 * dans les drivers existants en enrichissant manufacturerName intelligemment.
 */

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const DRIVERS = path.join(ROOT, "drivers");
const ADDON_DATA = path.join(ROOT, "references", "addon_enrichment_data");
const REPORT = path.join(ROOT, "project-data", "addon_integration_report.json");

function ex(p){ try{ fs.accessSync(p); return true; } catch{ return false; } }
function dj(p){ return JSON.parse(fs.readFileSync(p, "utf8")); }
function wj(p, obj){ fs.writeFileSync(p, JSON.stringify(obj, null, 2) + "\n", "utf8"); }
function uj(a){ return Array.from(new Set(a)); }
function drivers(){ return ex(DRIVERS)? fs.readdirSync(DRIVERS).filter(d=>ex(path.join(DRIVERS,d,'driver.compose.json'))):[]; }

// Load all addon data files
function loadAddonData(){
  const allDevices = [];
  
  if(!ex(ADDON_DATA)){
    console.log("⚠️  No addon data found. Run addon_global_enrichment_orchestrator.js first.");
    return allDevices;
  }
  
  const files = fs.readdirSync(ADDON_DATA).filter(f => f.endsWith('.json'));
  
  for(const file of files){
    try{
      const data = dj(path.join(ADDON_DATA, file));
      if(data.devices && Array.isArray(data.devices)){
        allDevices.push(...data.devices);
      }
    } catch{}
  }
  
  return allDevices;
}

// Build productId -> manufacturerNames mapping
function buildProductMap(devices){
  const map = new Map();
  
  for(const dev of devices){
    const pid = dev.productId;
    const mfg = dev.manufacturerName;
    if(!pid || !mfg) continue;
    
    if(!map.has(pid)) map.set(pid, new Set());
    map.get(pid).add(mfg);
  }
  
  return map;
}

// Per-type limits
const MAX_PER_TYPE = {
  switch: 60, dimmer: 45, bulb: 45, plug: 25, curtain: 25,
  motion: 30, contact: 30, air_quality: 30, climate: 30, sensor: 30,
  lock: 25, water_leak: 25, smoke: 20, thermostat: 25, valve: 20, other: 20
};
const ABS_MAX = 200;

function inferType(folder){
  const f = folder.toLowerCase();
  if(/dimmer/.test(f)) return 'dimmer';
  if(/switch/.test(f) && !/dimmer/.test(f)) return 'switch';
  if(/plug|outlet|socket/.test(f)) return 'plug';
  if(/bulb|spot|strip/.test(f)) return 'bulb';
  if(/curtain|roller|shade/.test(f)) return 'curtain';
  if(/lock/.test(f)) return 'lock';
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
  console.log("\n🔗 Integrating Addon Sources into Drivers\n");
  
  const addonDevices = loadAddonData();
  console.log(`   Loaded ${addonDevices.length} devices from addon sources`);
  
  if(addonDevices.length === 0){
    console.log("   No addon data to integrate. Exiting.");
    return;
  }
  
  const productMap = buildProductMap(addonDevices);
  console.log(`   Built mapping for ${productMap.size} product IDs\n`);
  
  const report = {
    timestamp: new Date().toISOString(),
    addonDevices: addonDevices.length,
    driversUpdated: 0,
    changes: []
  };
  
  for(const folder of drivers().sort()){
    const file = path.join(DRIVERS, folder, 'driver.compose.json');
    let j; try{ j = dj(file); } catch{ continue; }
    
    const before = (j.zigbee && Array.isArray(j.zigbee.manufacturerName)) ? j.zigbee.manufacturerName.length : 0;
    const pids = (j.zigbee && Array.isArray(j.zigbee.productId)) ? j.zigbee.productId : [];
    const currentNames = (j.zigbee && Array.isArray(j.zigbee.manufacturerName)) ? j.zigbee.manufacturerName : [];
    
    // Enrichir avec addon data
    const candidateNames = new Set(currentNames);
    for(const pid of pids){
      if(productMap.has(pid)){
        for(const name of productMap.get(pid)){
          if(name && name.length > 3) candidateNames.add(name);
        }
      }
    }
    
    // Apply per-type limit
    const dtype = inferType(folder);
    const typeLimit = MAX_PER_TYPE[dtype] ?? 30;
    const limit = Math.min(typeLimit, ABS_MAX);
    const enrichedNames = uj(Array.from(candidateNames)).sort((a,b)=>a.localeCompare(b)).slice(0, limit);
    
    if(enrichedNames.length !== before){
      j.zigbee = j.zigbee || {};
      j.zigbee.manufacturerName = enrichedNames;
      wj(file, j);
      
      report.driversUpdated++;
      report.changes.push({
        folder,
        type: dtype,
        before,
        after: enrichedNames.length,
        added: enrichedNames.length - before
      });
      
      console.log(`✅ ${folder}: ${before} -> ${enrichedNames.length} (${dtype}, limit=${limit})`);
    } else {
      console.log(`✓  ${folder}: already optimal`);
    }
  }
  
  wj(REPORT, report);
  
  console.log(`\n📊 Summary:`);
  console.log(`   Drivers updated: ${report.driversUpdated}`);
  console.log(`   Total addon devices integrated: ${addonDevices.length}`);
  console.log(`\n📝 Report: ${REPORT}`);
})();
