"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = process.cwd();
const DRIVERS = path.join(ROOT, "drivers");
const REPORT_DIR = path.join(ROOT, "project-data");
const REPORT = path.join(REPORT_DIR, "individual_driver_check_v38.json");

function ex(p){ try{ fs.accessSync(p); return true; } catch{ return false; } }

// Per-type limits for manufacturerName count, with absolute cap
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
function dj(p){ return JSON.parse(fs.readFileSync(p, "utf8")); }
function wj(p, obj){ fs.writeFileSync(p, JSON.stringify(obj, null, 2) + "\n", "utf8"); }
function ed(p){ if(!ex(p)) fs.mkdirSync(p,{recursive:true}); }
function drivers(){ return ex(DRIVERS)? fs.readdirSync(DRIVERS).filter(d=>ex(path.join(DRIVERS,d,'driver.compose.json'))):[]; }

// Infer driver type from folder name and class to apply per-type limits
function inferType(folder, cls){
  const f = String(folder || '').toLowerCase();
  const c = String(cls || '').toLowerCase();
  if(/dimmer/.test(f)) return 'dimmer';
  if(/switch/.test(f) && !/dimmer/.test(f)) return 'switch';
  if(/plug|outlet|socket/.test(f)) return 'plug';
  if(/bulb|spot|strip|ceiling.*light/.test(f)) return 'bulb';
  if(/curtain|roller|shade/.test(f)) return 'curtain';
  if(/lock/.test(f)) return 'lock';
  if(/thermostat|radiator/.test(f)) return 'thermostat';
  if(/contact|door.*window/.test(f)) return 'contact';
  if(/motion|pir|radar|presence/.test(f)) return 'motion';
  if(/water.*leak/.test(f)) return 'water_leak';
  if(/smoke/.test(f)) return 'smoke';
  if(/air|co2|pm25|tvoc|formaldehyde/.test(f)) return 'air_quality';
  if(/temp|humidity|climate/.test(f) || c === 'sensor') return 'climate';
  if(/sensor|detector|monitor/.test(f)) return 'sensor';
  return 'other';
}

function checkDriver(folder){
  const file = path.join(DRIVERS, folder, 'driver.compose.json');
  const issues = [];
  const info = { folder, file, status: 'ok' };
  
  // Check file exists
  if(!ex(file)){ 
    return { folder, status: 'error', issues: ['driver.compose.json not found'] };
  }
  
  let j;
  try{ j = dj(file); } catch(e){ 
    return { folder, status: 'error', issues: ['JSON parse failed: ' + e.message] };
  }
  
  // Check name
  if(!j.name || !j.name.en || j.name.en.trim().length === 0){
    issues.push('Missing or empty name.en');
  }
  
  // Check class
  const validClasses = ['light', 'socket', 'sensor', 'thermostat', 'curtain', 'lock', 'doorbell', 'button', 'fan', 'heater', 'other'];
  if(!j.class || !validClasses.includes(j.class)){
    issues.push(`Invalid class: "${j.class}" (expected: ${validClasses.join(', ')})`);
  }
  
  // Check capabilities
  if(!Array.isArray(j.capabilities) || j.capabilities.length === 0){
    issues.push('Missing or empty capabilities array');
  }
  
  // Check zigbee section
  if(!j.zigbee){
    issues.push('Missing zigbee section');
  } else {
    // Check manufacturerName
    const dtype = inferType(folder, j.class);
    const typeLimit = MAX_PER_DRIVER_BY_TYPE[dtype] ?? 30;
    const limit = Math.min(typeLimit, ABS_MAX_PER_DRIVER);
    if(!Array.isArray(j.zigbee.manufacturerName)){
      issues.push('manufacturerName is not an array');
    } else if(j.zigbee.manufacturerName.length === 0){
      issues.push('manufacturerName array is empty');
    } else if(j.zigbee.manufacturerName.length > limit){
      issues.push(`manufacturerName has ${j.zigbee.manufacturerName.length} entries (> ${limit} for type ${dtype}, consider reducing)`);
    }
    
    // Check productId
    if(!Array.isArray(j.zigbee.productId)){
      issues.push('productId is not an array');
    } else if(j.zigbee.productId.length === 0){
      issues.push('productId array is empty');
    }
    
    // Check endpoints
    if(!j.zigbee.endpoints || !j.zigbee.endpoints["1"]){
      issues.push('Missing endpoints["1"]');
    } else {
      const ep1 = j.zigbee.endpoints["1"];
      
      // Check clusters
      if(!Array.isArray(ep1.clusters)){
        issues.push('endpoints["1"].clusters is not an array');
      } else if(ep1.clusters.length === 0){
        issues.push('endpoints["1"].clusters is empty');
      } else {
        const nonNumeric = ep1.clusters.filter(c => typeof c !== 'number');
        if(nonNumeric.length > 0){
          issues.push(`endpoints["1"].clusters contains non-numeric values: ${JSON.stringify(nonNumeric)}`);
        }
        
        // Check for EF00 if TS0601
        const hasTS0601 = j.zigbee.productId.includes('TS0601');
        const hasEF00 = ep1.clusters.includes(61184);
        if(hasTS0601 && !hasEF00){
          issues.push('productId includes TS0601 but EF00(61184) cluster is missing');
        }
      }
      
      // Check bindings
      if(!Array.isArray(ep1.bindings)){
        issues.push('endpoints["1"].bindings is not an array');
      } else if(!ep1.bindings.includes(1)){
        issues.push('endpoints["1"].bindings should include 1');
      }
    }
  }
  
  // Check images
  if(!j.images || !j.images.small || !j.images.large){
    issues.push('Missing images (small/large)');
  } else {
    const smallPath = path.join(ROOT, j.images.small);
    const largePath = path.join(ROOT, j.images.large);
    if(!ex(smallPath)) issues.push(`Image not found: ${j.images.small}`);
    if(!ex(largePath)) issues.push(`Image not found: ${j.images.large}`);
  }
  
  // Check energy.batteries coherence
  const hasBatteryCap = Array.isArray(j.capabilities) && j.capabilities.includes('measure_battery');
  const hasBatteryEnergy = j.energy && Array.isArray(j.energy.batteries) && j.energy.batteries.length > 0;
  
  if(hasBatteryCap && !hasBatteryEnergy){
    issues.push('Has measure_battery capability but no energy.batteries defined');
  }
  if(!hasBatteryCap && hasBatteryEnergy){
    issues.push('Has energy.batteries but no measure_battery capability');
  }
  
  // Check platforms
  if(!Array.isArray(j.platforms) || !j.platforms.includes('local')){
    issues.push('Missing or invalid platforms (should include "local")');
  }
  
  info.issues = issues;
  info.data = {
    name: j.name?.en || 'N/A',
    class: j.class || 'N/A',
    capabilitiesCount: Array.isArray(j.capabilities) ? j.capabilities.length : 0,
    manufacturerNameCount: (j.zigbee && Array.isArray(j.zigbee.manufacturerName)) ? j.zigbee.manufacturerName.length : 0,
    productIdCount: (j.zigbee && Array.isArray(j.zigbee.productId)) ? j.zigbee.productId.length : 0,
    clustersCount: (j.zigbee?.endpoints?.["1"]?.clusters) ? j.zigbee.endpoints["1"].clusters.length : 0
  };
  
  if(issues.length > 0){
    info.status = 'issues_found';
  }
  
  return info;
}

(function main(){
  ed(REPORT_DIR);
  console.log("\n🔍 Checking each driver individually...\n");
  
  const allDrivers = drivers().sort();
  const results = [];
  let okCount = 0;
  let issuesCount = 0;
  let errorCount = 0;
  
  for(const folder of allDrivers){
    const result = checkDriver(folder);
    results.push(result);
    
    if(result.status === 'ok'){
      okCount++;
      console.log(`✅ ${folder}`);
    } else if(result.status === 'issues_found'){
      issuesCount++;
      console.log(`⚠️  ${folder} (${result.issues.length} issues)`);
      result.issues.forEach(issue => console.log(`   - ${issue}`));
    } else {
      errorCount++;
      console.log(`❌ ${folder} (ERROR)`);
      result.issues.forEach(issue => console.log(`   - ${issue}`));
    }
  }
  
  const report = {
    timestamp: new Date().toISOString(),
    total: allDrivers.length,
    summary: {
      ok: okCount,
      issues: issuesCount,
      errors: errorCount
    },
    results: results
  };
  
  wj(REPORT, report);
  
  console.log(`\n📊 Summary:`);
  console.log(`   Total drivers: ${allDrivers.length}`);
  console.log(`   ✅ OK: ${okCount}`);
  console.log(`   ⚠️  Issues: ${issuesCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`\n📝 Detailed report: ${REPORT}`);
})();
