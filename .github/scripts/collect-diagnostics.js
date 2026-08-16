#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const{fetchWithRetry}=require('./retry-helper');
const privacy=require('./privacy-redactor');
const ROOT=path.join(__dirname,'..','..'),DD=path.join(ROOT,'diagnostics');
const RD=path.join(DD,'reports'),SD=path.join(__dirname,'..','state');
const DDIR=path.join(ROOT,'drivers');
const anonId=id=>id?crypto.createHash('sha256').update(id).digest('hex').slice(0,12):'unk';
const loadJ=f=>{try{return JSON.parse(fs.readFileSync(f,'utf8'))}catch{return null}};
const saveJ=(f,d)=>{const safe=privacy.redactObject(d);privacy.assertNoLeaks(safe,f);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,JSON.stringify(safe,null,2))};
function pushSourceIssues(summary,source,issues,level){
  if(!Array.isArray(issues))return;
  for(const issue of issues){
    const msg=typeof issue==='string'?issue:(issue?.message||issue?.err||issue?.error||issue?.code);
    if(!msg)continue;
    summary.errors.push({err:privacy.redact(msg),source,level:level||issue?.level||'error',code:issue?.code||null});
  }
}

function buildIdx(){
  const idx=new Map(); // key = lowercase mfr
  try{for(const d of fs.readdirSync(DDIR)){try{
    const c=JSON.parse(fs.readFileSync(path.join(DDIR,d,'driver.compose.json')));
    for(const m of(c.zigbee?.manufacturerName||[])){
      const key=String(m).toLowerCase();
      if(!idx.has(key))idx.set(key,[]);
      if(!idx.get(key).includes(d))idx.get(key).push(d);
    }
  }catch{}}}catch{}
  return idx;
}

/** Resolve forum/OCR near-miss FPs (e.g. trailing 'a') against known drivers. */
function resolveKnownFp(fp, idx){
  if(!fp)return null;
  const key=String(fp).toLowerCase();
  if(idx.has(key))return {fp, matched:true, drivers:idx.get(key)};
  const candidates=new Set();
  // Drop last char (common OCR trailing vowel)
  if(fp.length>14){
    const trimmed=fp.slice(0,-1);
    if(idx.has(trimmed.toLowerCase())) candidates.add(trimmed);
  }
  // Collapse doubled letter in suffix (_…aa… / …xx)
  const m=fp.match(/^(_T[A-Za-z0-9]+_)([a-z0-9]+)$/i);
  if(m){
    const pref=m[1];
    const suf=m[2];
    for(let i=0;i<suf.length-1;i++){
      if(suf[i]===suf[i+1]){
        const collapsed=pref+suf.slice(0,i)+suf.slice(i+1);
        if(idx.has(collapsed.toLowerCase())) candidates.add(collapsed);
      }
    }
    // Drop one char at each suffix position (single OCR insert)
    if(suf.length>=7 && suf.length<=12){
      for(let i=0;i<suf.length;i++){
        const dropped=pref+suf.slice(0,i)+suf.slice(i+1);
        if(idx.has(dropped.toLowerCase())) candidates.add(dropped);
      }
    }
  }
  if(candidates.size){
    const canon=[...candidates][0];
    return {fp:canon, matched:true, drivers:idx.get(canon.toLowerCase()), ocrFrom:fp};
  }
  return {fp, matched:false, drivers:[]};
}

async function main(){
  fs.mkdirSync(RD,{recursive:true});
  const idx=buildIdx(),now=new Date().toISOString();
  console.log('Driver index:',idx.size,'fingerprints');
  const summary={timestamp:now,devices:[],unmatchedFPs:[],errors:[],sources:{}};

  // Source 1: Gmail diagnostics report
  const gmailR=loadJ(path.join(SD,'diagnostics-report.json'));
  if(gmailR){
    pushSourceIssues(summary,'gmail',gmailR.errors,'error');
    if(gmailR.access?.gmail?.ok===false){
      summary.sources.gmail_access='unavailable';
    }
  }
  if(gmailR?.diagnostics){
    summary.sources.gmail=gmailR.diagnostics.length;
    for(const d of gmailR.diagnostics){
      if(d.fps?.mfr?.length) for(const fp of d.fps.mfr){
        const resolved=resolveKnownFp(fp, idx);
        if(!resolved.matched) summary.unmatchedFPs.push({fp,source:'gmail',subj:(d.subj||'').slice(0,60)});
        else if(resolved.ocrFrom) summary.ocrResolved=(summary.ocrResolved||[]).concat([{from:resolved.ocrFrom,to:resolved.fp,drivers:resolved.drivers}]);
      }
      if(d.errs?.length) summary.errors.push(...d.errs.map(e=>({err:e,source:'gmail'})));
    }
  }

  // Source 2: Homey device report (from homey-device-diagnostics.js)
  const homeyR=loadJ(path.join(SD,'homey-device-report.json'));
  if(homeyR){
    pushSourceIssues(summary,'homey_report',homeyR.errors,'error');
    pushSourceIssues(summary,'homey_report',homeyR.warnings,'warning');
    if(!homeyR.auth?.canListHomeys){
      summary.sources.homey_runtime='unavailable';
    }
  }
  if(homeyR?.homeys){
    summary.sources.homey_report=homeyR.homeys.length;
    for(const h of homeyR.homeys){
      summary.devices.push({homey:anonId(h.id||h.name),fw:h.firmware,app:h.appVersion,
        total:h.totalDevices,tuya:h.tuyaDevices,matched:h.matched,unmatched:h.unmatched});
      if(h.unmatchedList) for(const u of h.unmatchedList)
        summary.unmatchedFPs.push({fp:u.mfr,model:u.model,name:u.name,source:'homey_report'});
    }
  }

  // Source 3: Live Homey API (if token available)
  const pat=process.env.HOMEY_PAT_API||process.env.HOMEY_PAT;
  if(pat){
    try{
      const opts={headers:{Authorization:'Bearer '+pat}};
      const mr=await fetchWithRetry('https://api.athom.com/user/me',opts,{retries:2,label:'list'});
      if(!mr.ok) throw new Error('Homey list: '+mr.status);
      const me=await mr.json();
      const homeys=me.homeys||[];
      summary.sources.live_api=homeys.length;
      for(const h of homeys){
        const base='https://'+h.id+'.connect.athom.com/api';
        let devs=[];
        try{const r=await fetchWithRetry(base+'/manager/devices/device',opts,{retries:2,label:'devs'});
          if(r.ok) devs=Object.values(await r.json());
        }catch{}
        const tuya=devs.filter(d=>(d.settings?.zb_manufacturer_name||'').startsWith('_T'));
        for(const d of tuya){
          const mfr=d.settings?.zb_manufacturer_name||'';
          const model=d.settings?.zb_model_id||'';
          const drv=d.driverUri?.split(':').pop()||'?';
          const report={id:anonId(d.id),name:privacy.alias('device',d.name||d.id),mfr,model,driver:drv,
            online:!!d.available,
            caps:d.capabilitiesObj?Object.keys(d.capabilitiesObj).sort():[],
            warning:d.warning||null,matched:idx.has(String(mfr).toLowerCase()),
            drivers:idx.get(String(mfr).toLowerCase())||[],multiDriver:(idx.get(String(mfr).toLowerCase())||[]).length>1};
          saveJ(path.join(RD,anonId(d.id)+'.json'),report);
          if(mfr && !idx.has(String(mfr).toLowerCase())){
            const resolved=resolveKnownFp(mfr, idx);
            if(!resolved.matched) summary.unmatchedFPs.push({fp:mfr,model,name:privacy.alias('device',d.name||d.id),source:'live_api'});
          }
        }
      }
    }catch(e){console.error('Live API:',privacy.redact(e.message))}
  }

  // Deduplicate unmatched FPs
  summary.unmatchedFPs=[...new Map(summary.unmatchedFPs.map(u=>[u.fp,u])).values()];

  // Source 4: Map to open GitHub issues
  const issMap=[];
  try{
    const tk=process.env.GH_PAT||process.env.GITHUB_TOKEN;
    if(tk){
      const r=await fetchWithRetry('https://api.github.com/repos/dlnraja/com.tuya.zigbee/issues?state=open&per_page=50',
        {headers:{Authorization:'Bearer '+tk,Accept:'application/vnd.github+json'}},{retries:2,label:'ghIss'});
      if(r.ok){
        const issues=await r.json();
        for(const iss of issues){
          const body=(iss.title+' '+(iss.body||'')).toLowerCase();
          const relFPs=summary.unmatchedFPs.filter(u=>body.includes(u.fp.toLowerCase()));
          if(relFPs.length) issMap.push({issue:iss.number,title:iss.title,fps:relFPs.map(u=>u.fp)});
        }
      }
    }
  }catch{}
  if(issMap.length) saveJ(path.join(DD,'issues-map.json'),{timestamp:now,mappings:issMap});

  saveJ(path.join(DD,'summary.json'),summary);
  console.log('Summary:',summary.devices.length||0,'device records,',summary.unmatchedFPs.length,'unmatched FPs,',summary.errors.length,'errors');
  console.log('Sources:',JSON.stringify(summary.sources));
  if(issMap.length) console.log('Issue mappings:',issMap.length);
}
main().catch(e=>{console.error(e.message);process.exit(1)});
