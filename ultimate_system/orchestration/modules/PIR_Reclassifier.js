#!/usr/bin/env node
// PIR_Reclassifier.js (v11.0)
// - Enforce mono-product for motion_sensor_pir_battery (TS0202/TS0901)
// - Set class/capabilities/batteries/bindings, and write report
const fs=require('fs');const path=require('path');
const ROOT=path.resolve(__dirname,'../../..');
const DRIVER_DIR=path.join(ROOT,'drivers','motion_sensor_pir_battery');
const MANIFEST=path.join(DRIVER_DIR,'driver.compose.json');
const STATE=path.join(ROOT,'ultimate_system','orchestration','state');
const REPORT=path.join(STATE,'pir_reclass_report.json');
function j(p){try{return JSON.parse(fs.readFileSync(p,'utf8'))}catch{return null}}
function w(p,o){fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(o,null,2),'utf8')}
function uniq(a){return Array.from(new Set(a))}
function main(){const m=j(MANIFEST);if(!m||!m.zigbee){w(REPORT,{ok:false,reason:'missing_manifest'});process.exit(0)}
  const allowed=['TS0202','TS0901'];
  const before=Array.isArray(m.zigbee.productId)?m.zigbee.productId.slice():[];
  const beforeSet=new Set(before.map(x=>String(x).toUpperCase()));
  const kept=allowed.filter(p=>beforeSet.has(p));
  const newPids=kept.length?kept:allowed;
  const purgedCount=before.length-newPids.length;
  m.zigbee.productId=newPids;
  // Class/capabilities
  m.class='sensor';
  const caps=new Set(['alarm_motion','measure_battery','alarm_battery','measure_luminance']);
  if(Array.isArray(m.capabilities)) m.capabilities.forEach(c=>caps.add(c));
  m.capabilities=Array.from(caps);
  // Energy batteries
  m.energy=m.energy||{};m.energy.batteries=['CR2450'];
  // Endpoints/bindings (remove OTA 25 if present; ensure IAS Zone 1280 and Power 1)
  if(!m.zigbee.endpoints)m.zigbee.endpoints={};
  const ep1=m.zigbee.endpoints['1']||(m.zigbee.endpoints['1']={});
  ep1.clusters=Array.isArray(ep1.clusters)?Array.from(new Set(ep1.clusters.filter(c=>c!==25).concat([0,1,1024,1030,1280]))):[0,1,1024,1030,1280];
  ep1.bindings=Array.isArray(ep1.bindings)?Array.from(new Set(ep1.bindings.filter(c=>c!==25).concat([1,1280]))):[1,1280];
  // Write back
  fs.writeFileSync(MANIFEST,JSON.stringify(m,null,2),'utf8');
  w(REPORT,{ok:true,purgedCount,before,after:newPids});
  console.log(`✅ PIR reclassified (purged=${purgedCount})`);
}
if(require.main===module)main();
