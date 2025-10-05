"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = process.cwd();
const DRIVERS = path.join(ROOT, "drivers");
const REPORT_DIR = path.join(ROOT, "project-data");
const REPORT = path.join(REPORT_DIR, "strict_audit_report_v38.json");

function ex(p){ try{ fs.accessSync(p); return true; } catch{ return false; } }
function dj(p){ return JSON.parse(fs.readFileSync(p, "utf8")); }
function wj(p, obj){ fs.writeFileSync(p, JSON.stringify(obj, null, 2) + "\n", "utf8"); }
function uj(a){ return Array.from(new Set(a)); }
function ed(p){ if(!ex(p)) fs.mkdirSync(p,{recursive:true}); }
function drivers(){ return ex(DRIVERS)? fs.readdirSync(DRIVERS).filter(d=>ex(path.join(DRIVERS,d,'driver.compose.json'))):[]; }

// Strict type mapping: folder pattern -> expected productId prefixes
const TYPE_MAP = {
  dimmer: ['TS110E','TS0601'],
  switch: ['TS0001','TS0002','TS0003','TS0004','TS0011','TS0012','TS0013','TS0014','TS0042','TS0043','TS0044'],
  plug: ['TS011F','TS0121'],
  bulb: ['TS0501','TS0502','TS0503','TS0504','TS0505'],
  curtain: ['TS130F','TS0601'],
  sensor_temp: ['TS0201','TS0601'],
  sensor_contact: ['TS0203'],
  sensor_motion: ['TS0202','TS0601'],
  sensor_water: ['TS0207'],
  sensor_smoke: ['TS0205'],
  sensor_air: ['TS0601'],
  lock: ['TS0601'],
  valve: ['TS0601'],
  thermostat: ['TS0601']
};

function inferType(folder, cls){
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
  if(/contact|door_window/.test(f)) return 'sensor_contact';
  if(/motion|pir|radar|presence/.test(f)) return 'sensor_motion';
  if(/water_leak/.test(f)) return 'sensor_water';
  if(/smoke/.test(f)) return 'sensor_smoke';
  if(/air|co2|pm25|tvoc|formaldehyde/.test(f)) return 'sensor_air';
  if(/temp|humidity|climate/.test(f)) return 'sensor_temp';
  return 'other';
}

function getExpectedProductIds(type){
  return TYPE_MAP[type] || ['TS0601'];
}

// Strict manufacturerName limit per type
const MAX_NAMES = {
  dimmer: 15,
  switch: 20,
  plug: 15,
  bulb: 10,
  curtain: 10,
  sensor_temp: 20,
  sensor_contact: 15,
  sensor_motion: 20,
  sensor_water: 10,
  sensor_smoke: 10,
  sensor_air: 20,
  lock: 10,
  valve: 10,
  thermostat: 10,
  other: 10
};

function getMaxNames(type){ return MAX_NAMES[type] || 10; }

// Climate-specific manufacturers (curated)
const CLIMATE_NAMES = [
  '_TZE200_cwbvmsar','_TZE200_bjawzodf','_TZE200_3towulqd',
  '_TZ3000_yd2e749y','_TZ3000_zl1kmjqx','_TZE204_3ejwxpmu',
  'TS0201','TS0601'
];

// Motion-specific manufacturers (curated)
const MOTION_NAMES = [
  '_TZ3000_mmtwjmaq','_TZ3000_kmh5qpmb','_TZE200_3towulqd',
  '_TZ3040_bb6xaihh','_TZE204_ztc6ggyl','TS0202'
];

// Switch-specific manufacturers (curated)
const SWITCH_NAMES = [
  '_TZ3000_qzjcsmar','_TZ3000_ji4araar','_TZ3000_adkvzooy',
  '_TZ3000_1obwwnmq','TS0001','TS0002','TS0003','TS0004','TS0011','TS0012','TS0013','TS0014'
];

// Plug-specific manufacturers (curated)
const PLUG_NAMES = [
  '_TZ3000_g5xawfcq','_TZ3000_cehuw1lw','_TZ3000_okaz9tjs',
  '_TZ3000_typdpbpg','TS011F','TS0121'
];

function getCuratedNames(type){
  if(type.startsWith('sensor_')) return CLIMATE_NAMES.concat(MOTION_NAMES).slice(0,20);
  if(type === 'dimmer' || type === 'bulb') return SWITCH_NAMES.slice(0,15);
  if(type === 'switch') return SWITCH_NAMES;
  if(type === 'plug') return PLUG_NAMES;
  return [];
}

(function main(){
  ed(REPORT_DIR);
  const rep = {timestamp: new Date().toISOString(), errors: [], fixes: [], drivers: []};
  
  for(const folder of drivers()){
    const file = path.join(DRIVERS, folder, 'driver.compose.json');
    let j; try{ j = dj(file); } catch(e){ rep.errors.push({folder, error: 'parse_failed'}); continue; }
    
    const before = JSON.stringify(j);
    const type = inferType(folder, j.class);
    const expectedPids = getExpectedProductIds(type);
    const maxNames = getMaxNames(type);
    const curatedNames = getCuratedNames(type);
    
    const item = {folder, type, issues: [], actions: []};
    
    // productId check
    j.zigbee = j.zigbee || {};
    const pids = Array.isArray(j.zigbee.productId) ? j.zigbee.productId : [];
    const validPids = pids.filter(p => expectedPids.some(exp => String(p).toUpperCase().startsWith(exp)));
    
    if(validPids.length === 0 && expectedPids.length){
      // Add default
      j.zigbee.productId = [expectedPids[0]];
      item.actions.push(`productId: added default ${expectedPids[0]}`);
    } else if(validPids.length < pids.length){
      j.zigbee.productId = uj(validPids.map(p => String(p).toUpperCase()));
      item.actions.push(`productId: removed ${pids.length - validPids.length} invalid entries`);
    } else {
      j.zigbee.productId = uj(pids.map(p => String(p).toUpperCase()));
    }
    
    // manufacturerName strict reduction
    const names = Array.isArray(j.zigbee.manufacturerName) ? j.zigbee.manufacturerName : [];
    const cleanNames = names.filter(n => typeof n === 'string' && !/x{3,}/i.test(n) && n.trim().length > 5);
    
    let finalNames = [];
    if(curatedNames.length){
      // Use curated list + intersection with existing
      const intersection = cleanNames.filter(n => curatedNames.includes(n));
      finalNames = intersection.length ? intersection : curatedNames.slice(0, maxNames);
    } else {
      // Keep first maxNames
      finalNames = cleanNames.slice(0, maxNames);
    }
    
    if(finalNames.length === 0 && cleanNames.length === 0){
      // Emergency: add generic
      finalNames = ['Tuya'];
    }
    
    j.zigbee.manufacturerName = uj(finalNames).sort((a,b)=>a.localeCompare(b));
    
    if(names.length !== j.zigbee.manufacturerName.length){
      item.actions.push(`manufacturerName: reduced from ${names.length} to ${j.zigbee.manufacturerName.length}`);
    }
    
    // endpoints normalization
    j.zigbee.endpoints = j.zigbee.endpoints || {};
    j.zigbee.endpoints["1"] = j.zigbee.endpoints["1"] || {};
    const ep1 = j.zigbee.endpoints["1"];
    
    // Ensure numeric clusters
    const rawClusters = Array.isArray(ep1.clusters) ? ep1.clusters : [];
    const numClusters = rawClusters.map(c => {
      if(typeof c === 'number') return c;
      if(typeof c === 'string' && /^\d+$/.test(c.trim())) return Number(c.trim());
      return null;
    }).filter(c => c !== null);
    
    // EF00 for TS0601
    const hasTS0601 = j.zigbee.productId.includes('TS0601');
    if(hasTS0601 && !numClusters.includes(61184)){
      numClusters.push(61184);
      item.actions.push('clusters: added EF00(61184) for TS0601');
    }
    
    ep1.clusters = uj(numClusters).sort((a,b)=>a-b);
    ep1.bindings = [1];
    
    // energy.batteries coherence
    const caps = Array.isArray(j.capabilities) ? j.capabilities : [];
    const hasBatt = caps.includes('measure_battery');
    if(hasBatt){
      j.energy = j.energy || {};
      if(!Array.isArray(j.energy.batteries) || !j.energy.batteries.length){
        j.energy.batteries = ['CR2032'];
        item.actions.push('energy: added batteries for measure_battery');
      }
    } else {
      if(j.energy && Array.isArray(j.energy.batteries)){
        delete j.energy.batteries;
        item.actions.push('energy: removed batteries (no measure_battery)');
        if(!Object.keys(j.energy).length) delete j.energy;
      }
    }
    
    const after = JSON.stringify(j);
    if(before !== after){
      wj(file, j);
      rep.fixes.push(folder);
    }
    
    if(item.actions.length) rep.drivers.push(item);
  }
  
  wj(REPORT, rep);
  console.log(`Strict audit: ${rep.fixes.length} drivers fixed. Report -> ${REPORT}`);
})();
