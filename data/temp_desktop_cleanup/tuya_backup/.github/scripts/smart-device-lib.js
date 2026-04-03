#!/usr/bin/env node
'use strict';
/**
 * Smart Device Library — shared functions for smart-device-processor.js
 * Handles: index building, source collection, driver suggestion, fingerprint insertion
 */
const fs=require('fs'),path=require('path');
const loadJ=f=>{try{return JSON.parse(fs.readFileSync(f,'utf8'))}catch{return null}};
let _PM=null;
function getPM(){if(_PM)return _PM;try{_PM=require('./fp-research-engine').PID_DRIVER_MAP}catch{_PM={}}return _PM}

function buildIndex(DDIR){
  const mIdx=new Map(),pIdx=new Map(),meta=new Map();
  if(!fs.existsSync(DDIR))return{mIdx,pIdx,meta};
  for(const d of fs.readdirSync(DDIR)){
    const f=path.join(DDIR,d,'driver.compose.json');
    if(!fs.existsSync(f))continue;
    try{
      const j=JSON.parse(fs.readFileSync(f,'utf8'));
      const mfrs=j.zigbee?.manufacturerName||[],pids=j.zigbee?.productId||[];
      meta.set(d,{mfrs,pids,caps:j.capabilities||[],cls:j.class||'other',path:f});
      for(const m of mfrs){if(!mIdx.has(m))mIdx.set(m,[]);if(!mIdx.get(m).includes(d))mIdx.get(m).push(d)}
      for(const p of pids){if(!pIdx.has(p))pIdx.set(p,[]);if(!pIdx.get(p).includes(d))pIdx.get(p).push(d)}
    }catch{}
  }
  return{mIdx,pIdx,meta};
}

function collectAll(SD){
  const devs=new Map();
  function add(fp,d){
    if(!fp||!fp.startsWith('_T'))return;
    if(!devs.has(fp))devs.set(fp,{fp,src:[],pids:new Set(),users:new Set(),dps:[],caps:[],bugs:[],links:[],interviews:[]});
    const e=devs.get(fp);
    e.src.push(d.src||'?');
    if(d.pid)e.pids.add(d.pid);if(d.user)e.users.add(d.user);
    if(d.dps)e.dps.push(...d.dps);if(d.caps)e.caps.push(...d.caps);
    if(d.bugs)e.bugs.push(...d.bugs);if(d.link)e.links.push(d.link);
    if(d.interview)e.interviews.push(d.interview);
  }
  // 1. Enrichment (Z2M+ZHA+Blakadder+Gmail+Forum+Interviews)
  const enr=loadJ(path.join(SD,'enrichment-report.json'));
  if(enr?.newFingerprints){for(const f of enr.newFingerprints)add(f.fp,{src:'enr-'+(f.source||'?'),pid:f.pid,dps:f.dps||[],caps:f.caps||[],bugs:f.bugs||[],link:f.url});console.log('  Enrichment:',enr.newFingerprints.length)}
  // 2. External sources (10-source scan)
  const ext=loadJ(path.join(SD,'external-sources-data.json'));
  if(ext?.allDevices){for(const d of ext.allDevices)add(d.fp||d.manufacturerName,{src:'ext-'+(d.src||d.source||'?'),pid:d.pid||d.productId,dps:d.dps||[],caps:d.caps||[]});console.log('  External:',ext.allDevices.length)}
  else if(ext&&typeof ext==='object'){
    // Alternate format: keyed by source
    for(const[src,arr]of Object.entries(ext)){if(!Array.isArray(arr))continue;for(const d of arr)add(d.fp||d.manufacturerName,{src:'ext-'+src,pid:d.pid||d.productId,dps:d.dps||[]})}
  }
  // 3. Functionality profiles
  const func=loadJ(path.join(SD,'device-functionality.json'));
  if(func?.profiles){for(const p of func.profiles)add(p.fp,{src:'func',pid:p.pid,dps:p.dps||[],caps:p.caps||[]});console.log('  Func:',func.profiles.length)}
  // 4. Forum activity
  const fa=loadJ(path.join(SD,'forum-activity-data.json'));
  if(fa?.deviceRequests){for(const r of fa.deviceRequests)for(const fp of(r.fps||r.fingerprints||[]))add(fp,{src:'forum',user:r.user||r.username,link:r.url});console.log('  Forum:',fa.deviceRequests.length)}
  else if(fa?.missing){for(const fp of fa.missing)add(fp,{src:'forum'})}
  // 5. Gmail diagnostics
  const diag=loadJ(path.join(SD,'diagnostics-report.json'));
  if(diag?.diagnostics){for(const d of diag.diagnostics){const fps=d.fps?.mfr||d.fingerprints||[];for(const fp of fps)add(fp,{src:'gmail',user:d.from||d.sender})}console.log('  Gmail:',diag.diagnostics.length)}
  if(diag?.newFingerprints){for(const fp of diag.newFingerprints)add(fp,{src:'gmail-new'})}
  // 6. GitHub scan
  const gh=loadJ(path.join(SD,'github-scan-report.json'));
  if(gh?.issues){for(const i of gh.issues){const fps=i.fps||i.fingerprints||[];for(const fp of fps)add(fp,{src:'github',user:i.user,link:i.url||i.html_url,pid:i.pid})}console.log('  GitHub:',gh.issues.length)}
  if(gh?.newFingerprints){for(const fp of(Array.isArray(gh.newFingerprints)?gh.newFingerprints:Object.keys(gh.newFingerprints)))add(fp,{src:'gh-new'})}
  // 7. Interviews
  const iDir=path.join(SD,'interviews');
  if(fs.existsSync(iDir)){let c=0;for(const f of fs.readdirSync(iDir).filter(x=>x.endsWith('.json'))){
    const iv=loadJ(path.join(iDir,f));if(!iv)continue;
    for(const fp of(iv.fingerprints||[])){
      const interview={title:iv.title,user:iv.user,excerpt:(iv.excerpt||'').substring(0,300),analysis:(iv.aiAnalysis||'').substring(0,300)};
      add(fp,{src:'interview',user:iv.user,link:iv.url,interview})}c++}
    console.log('  Interviews:',c)}
  // 8. Fork scan
  const fk=loadJ(path.join(SD,'fork-scan-state.json'));
  if(fk?.newFingerprints){
    const arr=Array.isArray(fk.newFingerprints)?fk.newFingerprints:Object.entries(fk.newFingerprints);
    for(const item of arr){const fp=Array.isArray(item)?item[0]:(item.fp||item);if(typeof fp==='string')add(fp,{src:'fork'})}
    console.log('  Forks:',arr.length)}
  // 9. Nightly report
  const nr=loadJ(path.join(SD,'nightly-report.json'));
  if(nr?.forumDetails){for(const r of nr.forumDetails)for(const fp of(r.fps||[]))add(fp,{src:'nightly',user:r.user})}
  if(nr?.githubDetails){for(const r of nr.githubDetails)for(const fp of(r.fps||[]))add(fp,{src:'nightly-gh',user:r.user})}
  // 10. Issue manager report
  const im=loadJ(path.join(SD,'issue-manager-report.json'));
  if(im?.actions){for(const a of im.actions){const fps=a.fps||a.fingerprints||[];for(const fp of fps)add(fp,{src:'issue-mgr',user:a.user,link:a.url})}}
  return devs;
}

function filterNew(devs,mIdx){
  const out=new Map();
  for(const[fp,d]of devs){
    if(!mIdx.has(fp))out.set(fp,{...d,pids:[...d.pids],users:[...d.users],src:[...new Set(d.src)]});
  }
  return out;
}

function suggestDriver(dev,pIdx,meta){
  const PM=getPM();
  // 1. ProductId match — local index first, then static PID map
  for(const pid of dev.pids){
    const drivers=pIdx.get(pid);if(drivers?.length)return{driver:drivers[0],method:'productId',pid};
    if(PM[pid])return{driver:PM[pid],method:'pid-map',pid};
  }
  // 2. DP pattern heuristic
  const dpNums=new Set(dev.dps.map(d=>typeof d==='object'?(d.dp||d.id||d):d).filter(x=>typeof x==='number'));
  // Cover: DP1(control)+DP2(position)+DP5(direction) or DP7
  if(dpNums.has(1)&&dpNums.has(2)&&(dpNums.has(5)||dpNums.has(7)))return{driver:'cover',method:'dp-cover'};
  // Thermostat: DP2(target)+DP3(current)+DP4(mode)
  if(dpNums.has(2)&&dpNums.has(3)&&dpNums.has(4))return{driver:'thermostat',method:'dp-thermo'};
  // Dimmer: DP1(on)+DP2(brightness)
  if(dpNums.has(1)&&dpNums.has(2)&&!dpNums.has(5))return{driver:'switch_dimmer_1gang',method:'dp-dim'};
  // Sensor: DP18(temp)+DP19(humidity) or DP1(contact)
  if(dpNums.has(18)&&dpNums.has(19))return{driver:'climate_sensor',method:'dp-climate'};
  // Siren: DP5(volume)+DP7(duration)+DP13(alarm) or DP104(alarm)+DP116(volume)
  if((dpNums.has(5)&&dpNums.has(13))||(dpNums.has(104)&&dpNums.has(116)))return{driver:'siren',method:'dp-siren'};
  // Air quality: DP2(co2)+DP18(temp)+DP19(humidity)+DP20(pm25)
  if(dpNums.has(2)&&dpNums.has(18)&&dpNums.has(20))return{driver:'air_quality_comprehensive',method:'dp-airq'};
  // Soil sensor: DP3(moisture)+DP5(temp)+DP15(battery)
  if(dpNums.has(3)&&dpNums.has(5)&&dpNums.has(15)&&!dpNums.has(13))return{driver:'soil_sensor',method:'dp-soil'};
  // Valve
  if(dev.interviews?.some(i=>(i.title||'').toLowerCase().includes('valve')))return{driver:'valve_irrigation',method:'interview-valve'};
  // 3. Prefix heuristic
  const fp=dev.fp;
  if(fp.startsWith('_TZE200_')||fp.startsWith('_TZE204_')||fp.startsWith('_TZE284_'))return{driver:null,method:'tuya-dp-unknown'};
  if(fp.startsWith('_TZ3000_')||fp.startsWith('_TYZB01_'))return{driver:null,method:'standard-unknown'};
  return{driver:null,method:'unknown'};
}

function addFpToDriver(driverName,mfr,pid,meta){
  const m=meta.get(driverName);if(!m)return false;
  try{
    const data=JSON.parse(fs.readFileSync(m.path,'utf8'));
    let changed=false;
    if(mfr&&!data.zigbee.manufacturerName.includes(mfr)){data.zigbee.manufacturerName.push(mfr);data.zigbee.manufacturerName.sort();changed=true}
    if(pid&&!data.zigbee.productId.includes(pid)){data.zigbee.productId.push(pid);changed=true}
    if(changed)fs.writeFileSync(m.path,JSON.stringify(data,null,2)+'\n');
    return changed;
  }catch(e){console.log('    Write err:',e.message);return false}
}

module.exports={buildIndex,collectAll,filterNew,suggestDriver,addFpToDriver};
