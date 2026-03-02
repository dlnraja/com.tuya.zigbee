#!/usr/bin/env node
'use strict';
/**
 * FP Research Engine v1.0 — Codified intelligence for Tuya fingerprint research.
 * Methodology: PID map, Z2M deep search, Blakadder lookup, false positive detection,
 * comprehensive scan correlation, prefix classification, multi-source confidence scoring.
 */
const fs=require('fs'),path=require('path');
const{fetchWithRetry}=require('./retry-helper');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const DDIR=path.join(__dirname,'..','..','drivers');
const STATE=path.join(__dirname,'..','state');
const loadJ=f=>{try{return JSON.parse(fs.readFileSync(f,'utf8'))}catch{return null}};

const PID_DRIVER_MAP={
  'TS0001':'switch_1gang','TS0011':'switch_1gang','TS0002':'switch_2gang',
  'TS0012':'switch_2gang','TS0003':'switch_3gang','TS0013':'switch_3gang',
  'TS0004':'switch_4gang','TS0014':'switch_4gang','TS0006':'switch_6gang',
  'TS0501':'bulb_dimmable','TS0502':'bulb_tunable_white',
  'TS0503':'bulb_rgb','TS0504':'bulb_rgbw','TS0505A':'bulb_rgbw','TS0505B':'bulb_rgbw',
  'TS110E':'dimmer_wall_1gang','TS110F':'dimmer_wall_1gang',
  'TS011F':'plug_energy_monitor','TS0121':'plug_energy_monitor',
  'TS0101':'switch_1gang','TS0112':'switch_1gang',
  'TS0201':'climate_sensor','TS0202':'motion_sensor','TS0203':'contact_sensor',
  'TS0205':'water_leak_sensor','TS0207':'zigbee_repeater',
  'TS0210':'smoke_detector_advanced','TS0216':'siren','TS0219':'siren','TS0224':'siren',
  'TS0041':'button_wireless_1','TS0042':'button_wireless_2',
  'TS0043':'button_wireless_3','TS0044':'button_wireless_4',
  'TS0046':'button_wireless_6','TS004F':'button_wireless_4',
  'TS0215':'button_emergency_sos',
  'TS0601':'generic_tuya','TS1201':'ir_remote',
  'TS130F':'curtain_motor','TS0302':'thermostat_tuya_dp',
  'TS0222':'illuminance_sensor','TS0225':'presence_sensor_radar',
  'TS0726':'hvac_air_conditioner',
};

const PREFIX_TYPE={
  '_TZE200_':'tuya_dp','_TZE204_':'tuya_dp','_TZE284_':'tuya_dp',
  '_TZ3000_':'standard','_TZ3210_':'standard','_TZ3400_':'standard',
  '_TYZB01_':'legacy','_TYST11_':'legacy','_TZB000_':'standard',
  '_TZ3290_':'special','_TZN3000_':'standard','_TZ2000_':'legacy',
};

function isValidFP(fp){
  if(!fp||typeof fp!=='string')return false;
  if(fp.includes('xxxxxxxx')||fp.length>25)return false;
  if(/ts\d{4}/i.test(fp.slice(10)))return false;
  return/_T[A-Z][A-Za-z0-9]{3,5}_[a-z0-9]{4,16}$/.test(fp);
}

function buildDriverIndex(){
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

function classifyByPrefix(fp){
  if(!fp)return null;
  for(const[pfx,type]of Object.entries(PREFIX_TYPE)){if(fp.startsWith(pfx))return type}
  return'unknown';
}

// === COMPREHENSIVE SCAN CORRELATION ===
let _compScanCache=null;
function searchCompScan(fp){
  if(!_compScanCache){
    _compScanCache=loadJ(path.join(STATE,'comprehensive-scan.json'))||loadJ(path.join(STATE,'fork-scan-state.json'));
    if(!_compScanCache)_compScanCache={};
  }
  // Search in various formats the scan data might be in
  const data=_compScanCache;
  if(data.fingerprints&&data.fingerprints[fp])return data.fingerprints[fp];
  if(data.newFingerprints){
    const arr=Array.isArray(data.newFingerprints)?data.newFingerprints:Object.entries(data.newFingerprints).map(([k,v])=>({fp:k,...(typeof v==='object'?v:{driver:v})}));
    const match=arr.find(x=>(x.fp||x.manufacturerName)===fp);
    if(match)return{driver:match.driver||match.suggestedDriver,branch:match.branch,fork:match.fork,pid:match.pid||match.productId};
  }
  if(data.drivers){
    for(const[drv,info]of Object.entries(data.drivers)){
      const mfrs=info.manufacturerName||info.mfrs||[];
      if(mfrs.includes(fp))return{driver:drv,source:'comp-scan'};
    }
  }
  return null;
}

// === BLAKADDER DEEP LOOKUP ===
let _blakadderCache=null;
async function loadBlakadder(){
  if(_blakadderCache)return _blakadderCache;
  // Try local cache first
  const cached=loadJ(path.join(STATE,'blakadder-cache.json'));
  if(cached&&cached.devices&&Date.now()-(cached.ts||0)<86400000){_blakadderCache=cached.devices;return _blakadderCache}
  try{
    const r=await fetchWithRetry('https://zigbee.blakadder.com/assets/js/zigbee.json',{headers:{'User-Agent':'tuya-fp-research'}},{retries:3,label:'blakadder'});
    if(r.ok){
      const data=await r.json();
      if(Array.isArray(data)){
        _blakadderCache=data;
        try{fs.mkdirSync(STATE,{recursive:true});fs.writeFileSync(path.join(STATE,'blakadder-cache.json'),JSON.stringify({ts:Date.now(),devices:data})+'\n')}catch{}
        return _blakadderCache;
      }
    }
  }catch{}
  _blakadderCache=[];return _blakadderCache;
}

async function searchBlakadder(fp){
  const db=await loadBlakadder();
  const matches=db.filter(d=>d.manufacturerName===fp);
  if(!matches.length)return null;
  return matches.map(d=>({
    model:d.model||d.zigbeeModel,pid:d.zigbeeModel,
    vendor:d.manufacturer||d.vendor,
    deviceType:d.category||d.deviceType||null,
    description:d.name||d.description||null,
    url:d.url||null,
    integration:d.integration||null,
  }));
}

// === Z2M HERDSMAN-CONVERTERS DEEP SEARCH ===
async function searchZ2M(fp,token){
  if(!fp)return null;
  try{
    const h={Accept:'application/vnd.github+json','User-Agent':'tuya-fp-research'};
    if(token)h.Authorization='Bearer '+token;
    const q=encodeURIComponent(fp+' repo:Koenkk/zigbee-herdsman-converters path:src/devices');
    const r=await fetchWithRetry('https://api.github.com/search/code?q='+q+'&per_page=5',{headers:h},{retries:2,label:'z2m-search'});
    if(!r.ok)return null;
    const d=await r.json();
    if(!d.items||!d.items.length)return null;
    return d.items.map(i=>({
      file:i.name,path:i.path,
      vendor:i.name.replace('.ts','').replace('.js',''),
      url:i.html_url,
    }));
  }catch{return null}
}

// === FALSE POSITIVE DETECTION ===
function detectFalsePositive(fp,z2mResult,blakadderResult){
  // FP is false positive if:
  // 1. Not found in Z2M converters (only in Z2M issues = user request, not actual support)
  // 2. Not found in Blakadder
  // 3. Format is suspicious (too long, concatenated, etc.)
  if(!isValidFP(fp))return{isFP:true,reason:'invalid_format'};
  if(!z2mResult&&!blakadderResult)return{isFP:false,reason:'unknown_not_false'};
  // If found in Z2M converters src/devices/ => definitely real
  if(z2mResult&&z2mResult.some(r=>r.path?.includes('src/devices')))return{isFP:false,reason:'z2m_confirmed'};
  // If found in Blakadder => definitely real
  if(blakadderResult&&blakadderResult.length)return{isFP:false,reason:'blakadder_confirmed'};
  return{isFP:false,reason:'insufficient_data'};
}

// === CONFIDENCE SCORING ===
function scoreConfidence(result){
  let score=0;
  if(result.pidMatch)score+=40;
  if(result.z2m)score+=25;
  if(result.blakadder)score+=20;
  if(result.compScan)score+=15;
  if(result.driverExists)score+=10;
  if(result.pidMatch&&result.z2m)score+=10;
  if(result.blakadder&&result.z2m)score+=10;
  return Math.min(score,100);
}

// === MAIN RESEARCH PIPELINE ===
async function researchFP(fp,opts={}){
  const{token,index}=opts;
  const idx=index||buildDriverIndex();
  const result={fp,valid:isValidFP(fp),prefix:classifyByPrefix(fp),driver:null,pid:null,confidence:0,sources:[],method:null};
  if(!result.valid)return result;

  // 1. Already supported?
  if(idx.mIdx.has(fp)){result.driver=idx.mIdx.get(fp)[0];result.driverExists=true;result.sources.push('local');result.confidence=100;return result}

  // 2. Comprehensive scan correlation
  const comp=searchCompScan(fp);
  if(comp){result.compScan=comp;result.sources.push('comp-scan');if(comp.driver){result.driver=comp.driver;result.method='comp-scan';result.pid=comp.pid||null}}

  // 3. Blakadder lookup
  const blak=await searchBlakadder(fp);
  if(blak&&blak.length){
    result.blakadder=blak;result.sources.push('blakadder');
    const b=blak[0];
    if(b.pid&&!result.pid)result.pid=b.pid;
    if(b.pid&&PID_DRIVER_MAP[b.pid]&&!result.driver){result.driver=PID_DRIVER_MAP[b.pid];result.method='blakadder-pid';result.pidMatch=true}
    if(b.deviceType)result.deviceType=b.deviceType;
    if(b.vendor)result.vendor=b.vendor;
  }

  // 4. Z2M deep search (rate-limited)
  if(token&&!result.driver){
    await sleep(1500);
    const z2m=await searchZ2M(fp,token);
    if(z2m&&z2m.length){result.z2m=z2m;result.sources.push('z2m');if(!result.vendor)result.vendor=z2m[0].vendor}
  }

  // 5. PID-based driver suggestion
  if(result.pid&&!result.driver){
    const drv=PID_DRIVER_MAP[result.pid];
    if(drv){result.driver=drv;result.method='pid-map';result.pidMatch=true}
    else if(idx.pIdx.has(result.pid)){result.driver=idx.pIdx.get(result.pid)[0];result.method='pid-index';result.pidMatch=true}
  }

  // 6. False positive check
  const fpCheck=detectFalsePositive(fp,result.z2m,result.blakadder);
  result.falsePositive=fpCheck;

  // 7. Confidence score
  result.confidence=scoreConfidence(result);
  return result;
}

async function batchResearch(fps,opts={}){
  const{token,autoAdd=false}=opts;
  const idx=buildDriverIndex();
  const results=[];
  console.log('[FP-RESEARCH] Researching',fps.length,'fingerprints...');
  for(const fp of fps){
    if(!isValidFP(fp)){results.push({fp,valid:false,confidence:0});continue}
    const r=await researchFP(fp,{token,index:idx});
    results.push(r);
    const status=r.driver?r.driver+' ('+r.confidence+'%)':'UNKNOWN';
    console.log('  '+fp+' => '+status+(r.method?' ['+r.method+']':'')+(r.pid?' PID:'+r.pid:''));
  }
  // Auto-add high-confidence FPs to drivers
  if(autoAdd){
    let added=0;
    for(const r of results){
      if(r.confidence>=60&&r.driver&&!r.driverExists&&idx.meta.has(r.driver)){
        try{
          const m=idx.meta.get(r.driver);
          const data=JSON.parse(fs.readFileSync(m.path,'utf8'));
          if(!data.zigbee.manufacturerName.includes(r.fp)){
            data.zigbee.manufacturerName.push(r.fp);data.zigbee.manufacturerName.sort();
            fs.writeFileSync(m.path,JSON.stringify(data,null,2)+'\n');
            added++;console.log('  [AUTO-ADD] '+r.fp+' => '+r.driver);
          }
        }catch(e){console.log('  [ADD-ERR] '+r.fp+': '+e.message)}
      }
    }
    if(added)console.log('[FP-RESEARCH] Auto-added',added,'FPs to drivers');
  }
  return results;
}

// === MAIN (standalone execution) ===
async function main(){
  const token=process.env.GH_PAT||process.env.GITHUB_TOKEN;
  console.log('=== FP Research Engine v1.0 ===');
  // Load new FPs from enrichment report or state files
  const enr=loadJ(path.join(STATE,'enrichment-report.json'));
  const fps=[];
  if(enr?.newFingerprints){for(const f of enr.newFingerprints){if(f.fp&&isValidFP(f.fp))fps.push(f.fp)}}
  // Also from smart-processor skipped
  const sp=loadJ(path.join(STATE,'smart-processor-report.json'));
  if(sp?.skipped){for(const fp of sp.skipped){if(isValidFP(fp)&&!fps.includes(fp))fps.push(fp)}}
  // Also from external sources
  const ext=loadJ(path.join(STATE,'external-sources-data.json'));
  if(ext?.allDevices){for(const d of ext.allDevices){const fp=d.fp||d.manufacturerName;if(fp&&isValidFP(fp)&&!fps.includes(fp))fps.push(fp)}}
  console.log('FPs to research:',fps.length);
  if(!fps.length){console.log('Nothing to research.');return}
  const results=await batchResearch(fps.slice(0,50),{token,autoAdd:process.env.AUTO_ADD==='true'});
  // Save report
  const report={timestamp:new Date().toISOString(),total:results.length,
    resolved:results.filter(r=>r.driver&&r.confidence>=60).length,
    unknown:results.filter(r=>!r.driver).length,
    falsePositives:results.filter(r=>r.falsePositive?.isFP).length,
    results:results.slice(0,100)};
  const rp=path.join(STATE,'fp-research-report.json');
  fs.mkdirSync(STATE,{recursive:true});fs.writeFileSync(rp,JSON.stringify(report,null,2)+'\n');
  console.log('\n=== Results ===');
  console.log('Resolved:',report.resolved,'| Unknown:',report.unknown,'| False positives:',report.falsePositives);
  if(process.env.GITHUB_STEP_SUMMARY){
    let md='## FP Research Engine\n| Metric | Count |\n|---|---|\n';
    md+='| Total researched | '+report.total+' |\n| Resolved (>=60%) | '+report.resolved+' |\n';
    md+='| Unknown | '+report.unknown+' |\n| False positives | '+report.falsePositives+' |\n';
    if(report.resolved){md+='\n### Resolved FPs\n| FP | Driver | PID | Confidence | Method |\n|---|---|---|---|---|\n';
      for(const r of results.filter(x=>x.driver&&x.confidence>=60).slice(0,30))md+='| '+r.fp+' | '+r.driver+' | '+(r.pid||'-')+' | '+r.confidence+'% | '+r.method+' |\n'}
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,md);
  }
}

module.exports={PID_DRIVER_MAP,PREFIX_TYPE,isValidFP,buildDriverIndex,classifyByPrefix,searchCompScan,searchBlakadder,searchZ2M,detectFalsePositive,scoreConfidence,researchFP,batchResearch};
if(require.main===module)main().catch(e=>{console.error('Fatal:',e.message);process.exit(1)});
