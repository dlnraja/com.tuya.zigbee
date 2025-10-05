"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = process.cwd();
const DRIVERS = path.join(ROOT, "drivers");
const REFS = path.join(ROOT, "references");
const EXT = path.join(ROOT, ".external_sources");
const REPORT_DIR = path.join(ROOT, "project-data");
const REPORT = path.join(REPORT_DIR, "ultimate_coherence_check_v38.json");

function ex(p){ try{ fs.accessSync(p); return true; } catch{ return false; } }
function dj(p){ return JSON.parse(fs.readFileSync(p, "utf8")); }
function wj(p, obj){ fs.writeFileSync(p, JSON.stringify(obj, null, 2) + "\n", "utf8"); }
function uj(a){ return Array.from(new Set(a)); }
function ed(p){ if(!ex(p)) fs.mkdirSync(p,{recursive:true}); }
function drivers(){ return ex(DRIVERS)? fs.readdirSync(DRIVERS).filter(d=>ex(path.join(DRIVERS,d,'driver.compose.json'))):[]; }

// Dynamic per-type limits + absolute guard to avoid incoherent oversizing
const MAX_PER_DRIVER_BY_TYPE = {
  switch: 60,
  dimmer: 45,
  bulb: 45,
  plug: 25,
  curtain: 25,
  motion: 30,
  contact: 30,
  air_quality: 30,
  climate: 30,
  sensor: 30,
  lock: 25,
  water_leak: 25,
  smoke: 20,
  thermostat: 25,
  valve: 20,
  other: 20
};
const ABS_MAX_PER_DRIVER = 200;

// Load ALL reference sources
function loadAllReferences(){
  const refs = { allManufacturers: new Set(), currentDriverData: new Map() };
  
  // Load from existing drivers (current state)
  for(const folder of drivers()){
    const file = path.join(DRIVERS, folder, 'driver.compose.json');
    let j; try{ j = dj(file); } catch{ continue; }
    
    const pids = (j.zigbee && Array.isArray(j.zigbee.productId)) ? j.zigbee.productId : [];
    const names = (j.zigbee && Array.isArray(j.zigbee.manufacturerName)) ? j.zigbee.manufacturerName : [];
    
    refs.currentDriverData.set(folder, { productIds: pids, manufacturerNames: names });
    names.forEach(n => refs.allManufacturers.add(n));
  }
  
  // Load from external sources (koenkk, blakadder, etc.)
  if(ex(EXT)){
    const extFiles = fs.readdirSync(EXT).filter(f => f.endsWith('.json') && f.includes('koenkk'));
    for(const file of extFiles.slice(0, 1)){ // Only latest koenkk file
      try{
        const data = dj(path.join(EXT, file));
        if(data.manufacturers && Array.isArray(data.manufacturers)){
          data.manufacturers.forEach(m => refs.allManufacturers.add(m));
        }
      } catch{}
    }
  }
  
  return refs;
}

// Determine driver type and category
function analyzeDriver(folder, json){
  const f = folder.toLowerCase();
  const c = (json.class || '').toLowerCase();
  const caps = Array.isArray(json.capabilities) ? json.capabilities : [];
  
  // Power source
  const hasBattery = caps.includes('measure_battery');
  const powerSource = hasBattery ? 'battery' : 'ac';
  
  // Type detection
  let type = 'other';
  let category = 'other';
  
  if(/dimmer/.test(f)){
    type = 'dimmer'; category = 'lighting';
  } else if(/switch/.test(f) && !/dimmer/.test(f)){
    type = 'switch'; category = 'control';
  } else if(/plug|outlet|socket/.test(f)){
    type = 'plug'; category = 'power';
  } else if(/bulb|spot|strip|ceiling.*light/.test(f)){
    type = 'bulb'; category = 'lighting';
  } else if(/curtain|roller|shade/.test(f)){
    type = 'curtain'; category = 'window';
  } else if(/lock/.test(f)){
    type = 'lock'; category = 'security';
  } else if(/thermostat|radiator/.test(f)){
    type = 'thermostat'; category = 'climate';
  } else if(/contact|door.*window/.test(f)){
    type = 'contact'; category = 'security';
  } else if(/motion|pir|radar|presence/.test(f)){
    type = 'motion'; category = 'security';
  } else if(/water.*leak/.test(f)){
    type = 'water_leak'; category = 'security';
  } else if(/smoke/.test(f)){
    type = 'smoke'; category = 'security';
  } else if(/air|co2|pm25|tvoc|formaldehyde/.test(f)){
    type = 'air_quality'; category = 'climate';
  } else if(/temp|humidity|climate/.test(f)){
    type = 'climate'; category = 'climate';
  } else if(/sensor|detector|monitor/.test(f)){
    type = 'sensor'; category = 'monitoring';
  }
  
  return { type, category, powerSource };
}

// Intelligent enrichment with strict limits
function enrichDriver(folder, json, refs){
  const analysis = analyzeDriver(folder, json);
  const changes = [];
  let modified = false;
  
  // Get current data
  const currentPids = (json.zigbee && Array.isArray(json.zigbee.productId)) ? json.zigbee.productId : [];
  const currentNames = (json.zigbee && Array.isArray(json.zigbee.manufacturerName)) ? json.zigbee.manufacturerName : [];
  
  // Validate current names against reference (all must be valid)
  const validNames = currentNames.filter(n => {
    return typeof n === 'string' && 
           n.trim().length > 3 && 
           !/x{3,}/i.test(n) &&
           (refs.allManufacturers.has(n) || /^(TS\d{4}|_TZ[EDMSE]\d{3,4}_)/.test(n));
  });
  
  // Limit dynamically by type with absolute guard
  const typeLimit = MAX_PER_DRIVER_BY_TYPE[analysis.type] ?? 30;
  const limit = Math.min(typeLimit, ABS_MAX_PER_DRIVER);
  const limitedNames = validNames.slice(0, limit);
  
  if(limitedNames.length !== currentNames.length || !currentNames.every(n => limitedNames.includes(n))){
    json.zigbee = json.zigbee || {};
    json.zigbee.manufacturerName = uj(limitedNames).sort((a,b)=>a.localeCompare(b));
    changes.push(`manufacturerName: ${currentNames.length} -> ${json.zigbee.manufacturerName.length} (validated & limited to ${limit})`);
    modified = true;
  }
  
  // Verify productId coherence
  const validPids = currentPids.filter(p => typeof p === 'string' && p.length > 0);
  if(validPids.length !== currentPids.length){
    json.zigbee.productId = uj(validPids.map(p => String(p).toUpperCase()));
    changes.push(`productId: cleaned invalid entries`);
    modified = true;
  }
  
  // Verify endpoints structure
  json.zigbee.endpoints = json.zigbee.endpoints || {};
  json.zigbee.endpoints["1"] = json.zigbee.endpoints["1"] || {};
  const ep1 = json.zigbee.endpoints["1"];
  
  // Numeric clusters
  const rawClusters = Array.isArray(ep1.clusters) ? ep1.clusters : [];
  const numClusters = rawClusters.filter(c => typeof c === 'number');
  if(numClusters.length !== rawClusters.length){
    ep1.clusters = uj(numClusters).sort((a,b)=>a-b);
    changes.push(`clusters: converted to numeric only`);
    modified = true;
  }
  
  // EF00 for TS0601
  if(json.zigbee.productId.includes('TS0601') && !ep1.clusters.includes(61184)){
    ep1.clusters.push(61184);
    ep1.clusters = uj(ep1.clusters).sort((a,b)=>a-b);
    changes.push(`clusters: added EF00(61184) for TS0601`);
    modified = true;
  }
  
  // Bindings
  if(!Array.isArray(ep1.bindings) || !ep1.bindings.includes(1)){
    ep1.bindings = [1];
    changes.push(`bindings: set to [1]`);
    modified = true;
  }
  
  // Energy coherence
  const caps = Array.isArray(json.capabilities) ? json.capabilities : [];
  const hasBatt = caps.includes('measure_battery');
  const hasBattEnergy = json.energy && Array.isArray(json.energy.batteries) && json.energy.batteries.length > 0;
  
  if(hasBatt && !hasBattEnergy){
    json.energy = json.energy || {};
    json.energy.batteries = ['CR2032'];
    changes.push(`energy: added batteries for measure_battery`);
    modified = true;
  } else if(!hasBatt && hasBattEnergy){
    delete json.energy.batteries;
    if(json.energy && Object.keys(json.energy).length === 0) delete json.energy;
    changes.push(`energy: removed batteries (no measure_battery)`);
    modified = true;
  }
  
  return { analysis, changes, modified, json };
}

(function main(){
  ed(REPORT_DIR);
  console.log("\n🔍 Ultimate Coherence Check with ALL References\n");
  console.log("Loading all reference sources...");
  
  const refs = loadAllReferences();
  console.log(`  Current drivers in database: ${refs.currentDriverData.size}`);
  console.log(`  Total unique manufacturers (all sources): ${refs.allManufacturers.size}`);
  console.log(`  Limit mode: dynamic by type (abs max ${ABS_MAX_PER_DRIVER})\n`);
  
  const results = [];
  let updatedCount = 0;
  
  for(const folder of drivers().sort()){
    const file = path.join(DRIVERS, folder, 'driver.compose.json');
    let j; try{ j = dj(file); } catch{ continue; }
    
    const result = enrichDriver(folder, j, refs);
    
    if(result.modified){
      wj(file, result.json);
      updatedCount++;
      console.log(`✅ ${folder} (${result.changes.length} changes)`);
      result.changes.forEach(c => console.log(`   - ${c}`));
    } else {
      console.log(`✓  ${folder} (already optimal)`);
    }
    
    results.push({
      folder,
      analysis: result.analysis,
      changes: result.changes,
      modified: result.modified,
      manufacturerCount: result.json.zigbee?.manufacturerName?.length || 0
    });
  }
  
  const report = {
    timestamp: new Date().toISOString(),
    referenceSources: {
      totalManufacturers: refs.allManufacturers.size,
      driversInDatabase: refs.currentDriverData.size
    },
    limitMode: 'dynamic_by_type',
    absMaxPerDriver: ABS_MAX_PER_DRIVER,
    perTypeLimits: MAX_PER_DRIVER_BY_TYPE,
    driversChecked: results.length,
    driversUpdated: updatedCount,
    results: results
  };
  
  wj(REPORT, report);
  console.log(`\n📊 Summary:`);
  console.log(`   Drivers checked: ${results.length}`);
  console.log(`   Drivers updated: ${updatedCount}`);
  console.log(`   Total unique manufacturers: ${refs.allManufacturers.size}`);
  console.log(`   Limit mode: dynamic_by_type, abs max per driver: ${ABS_MAX_PER_DRIVER}`);
  console.log(`\n📝 Report: ${REPORT}`);
})();
