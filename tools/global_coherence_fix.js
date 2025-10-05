"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = process.cwd();
const DRIVERS = path.join(ROOT, "drivers");
const REPORT_DIR = path.join(ROOT, "project-data");
const REPORT = path.join(REPORT_DIR, "global_coherence_report_v38.json");
function ex(p){ try{ fs.accessSync(p); return true; } catch{ return false; } }
function dj(p){ return JSON.parse(fs.readFileSync(p, "utf8")); }
function uj(a){ return Array.from(new Set(a)); }
function ed(p){ if(!ex(p)) fs.mkdirSync(p,{recursive:true}); }
function drivers(){ return ex(DRIVERS)? fs.readdirSync(DRIVERS).filter(d=>ex(path.join(DRIVERS,d,'driver.compose.json'))):[]; }
function catFor(folder, cls){ const f=(folder||"").toLowerCase(); const c=(cls||"").toLowerCase();
  if(c==='light'||/bulb|strip|spot|ceiling|rgb|tunable|dimmer/.test(f)) return 'lighting';
  if(c==='socket'||/plug|outlet|socket|relay/.test(f)) return 'plugs';
  if(/curtain|roller|shade/.test(f)) return 'curtains';
  if(/door_window|contact/.test(f)) return 'contact';
  if(/motion|pir|presence|radar|vibration/.test(f)) return 'motion';
  if(c==='sensor'||/climate|temperature|humidity|air|tvoc|co2|pm25/.test(f)) return 'climate';
  if(/smoke|co_detector|gas|water_leak/.test(f)) return 'safety';
  if(/lock|fingerprint/.test(f)) return 'locks';
  if(/switch/.test(f)) return 'switches';
  return 'other';
}
function buildIndex(){ const idx=new Map(), seen=new Map();
  for(const folder of drivers()){ const file=path.join(DRIVERS,folder,'driver.compose.json'); let j; try{ j=dj(file);}catch{continue}
    const names=(j.zigbee&&Array.isArray(j.zigbee.manufacturerName))?j.zigbee.manufacturerName:[];
    const cat=catFor(folder,j.class||'');
    for(const n of names){ if(typeof n!=="string") continue; if(!idx.has(n)) idx.set(n,{}); const m=idx.get(n); m[cat]=(m[cat]||0)+1; if(!seen.has(n)) seen.set(n,new Set()); seen.get(n).add(cat); }
  }
  return {idx,seen};
}
function toNumClusters(arr){ if(!Array.isArray(arr)) return []; const map={ basic:0, genbasic:0, identify:3, genidentify:3, groups:4, scenes:5, onoff:6, genonoff:6, levelcontrol:8, genlevelctrl:8, temperaturemeasurement:1026, mstemperaturemeasurement:1026, relativehumidity:1029, msrelativehumidity:1029, ef00:61184};
  const out=[]; for(const v of arr){ if(typeof v==='number'&&Number.isFinite(v)){ out.push(v); continue;} if(typeof v==='string'){ const s=v.trim(); if(/^\d+$/.test(s)){ out.push(Number(s)); continue;} const k=s.replace(/\W+/g,'').toLowerCase(); if(map[k]!=null){ out.push(map[k]); continue; } } }
  return out;
}
(function main(){ ed(REPORT_DIR); const {idx,seen}=buildIndex(); const rep={timestamp:new Date().toISOString(), updated:0, items:[]};
  for(const folder of drivers()){ const file=path.join(DRIVERS,folder,'driver.compose.json'); let j; try{ j=dj(file);}catch{continue}
    const before=JSON.stringify(j); const cat=catFor(folder,j.class||''); j.zigbee=j.zigbee||{};
    // manufacturerName prune
    const src=(Array.isArray(j.zigbee.manufacturerName)?j.zigbee.manufacturerName:[]).filter(s=>typeof s==='string'&&!/x{3,}/i.test(s));
    let keep=[]; for(const n of src){ const f=idx.get(n)||{}; const tot=Object.values(f).reduce((a,b)=>a+b,0); const c=f[cat]||0; const r=tot?(c/tot):0; if((seen.get(n)&&seen.get(n).has(cat))||r>=0.3) keep.push(n); }
    if(!keep.length&&src.length){ const scored=src.map(n=>{const f=idx.get(n)||{}; const c=f[cat]||0; const t=Object.values(f).reduce((a,b)=>a+b,0); return {n,c,t};}).sort((a,b)=>b.c-a.c||b.t-a.t).slice(0,20).map(x=>x.n); keep=keep.concat(scored); }
    j.zigbee.manufacturerName=uj(keep).sort((a,b)=>a.localeCompare(b));
    // productId
    if(Array.isArray(j.zigbee.productId)) j.zigbee.productId=uj(j.zigbee.productId.map(x=>String(x).toUpperCase()));
    // endpoints/clusters
    j.zigbee.endpoints=j.zigbee.endpoints||{}; j.zigbee.endpoints["1"]=j.zigbee.endpoints["1"]||{}; const ep1=j.zigbee.endpoints["1"]; ep1.clusters=toNumClusters(Array.isArray(ep1.clusters)?ep1.clusters:(ep1.clusters?[ep1.clusters]:[]));
    const hasTS0601=Array.isArray(j.zigbee.productId)&&j.zigbee.productId.includes("TS0601"); if(hasTS0601&&!ep1.clusters.includes(61184)) ep1.clusters.push(61184); ep1.clusters=uj(ep1.clusters); ep1.bindings=[1];
    // energy batteries coherence
    const caps=Array.isArray(j.capabilities)?j.capabilities:[]; const hasBatt=caps.includes('measure_battery');
    if(hasBatt){ j.energy=j.energy||{}; if(!Array.isArray(j.energy.batteries)||!j.energy.batteries.length) j.energy.batteries=["CR2032"]; }
    else if(j.energy&&Array.isArray(j.energy.batteries)){ delete j.energy.batteries; if(!Object.keys(j.energy).length) delete j.energy; }
    const after=JSON.stringify(j); if(before!==after){ fs.writeFileSync(file, JSON.stringify(j,null,2)+"\n","utf8"); rep.updated++; rep.items.push({folder, names_before:src.length, names_after:j.zigbee.manufacturerName.length}); }
  }
  fs.writeFileSync(REPORT, JSON.stringify(rep,null,2)+"\n","utf8"); console.log(`Global coherence updated: ${rep.updated} drivers. Report -> ${REPORT}`);
})();
