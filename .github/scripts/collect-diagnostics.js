#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const{fetchWithRetry}=require('./retry-helper');
const ROOT=path.join(__dirname,'..','..'),DD=path.join(ROOT,'diagnostics');
const RD=path.join(DD,'reports'),SD=path.join(__dirname,'..','state');
const DDIR=path.join(ROOT,'drivers');
const anonId=id=>id?crypto.createHash('sha256').update(id).digest('hex').slice(0,12):'unk';
const loadJ=f=>{try{return JSON.parse(fs.readFileSync(f,'utf8'))}catch{return null}};
const saveJ=(f,d)=>{fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,JSON.stringify(d,null,2))};

function buildIdx(){
  const idx=new Map();
  try{for(const d of fs.readdirSync(DDIR)){try{
    const c=JSON.parse(fs.readFileSync(path.join(DDIR,d,'driver.compose.json'),'utf8'));
    for(const m of(c.zigbee?.manufacturerName||[]))
      {if(!idx.has(m))idx.set(m,[]);if(!idx.get(m).includes(d))idx.get(m).push(d)}
  }catch{}}}catch{}
  return idx;
}

async function main(){
  fs.mkdirSync(RD,{recursive:true});
  const idx=buildIdx(),now=new Date().toISOString();
  console.log('Driver index:',idx.size,'fingerprints');
  const summary={timestamp:now,devices:[],unmatchedFPs:[],errors:[],sources:{}};

  // Source 1: Gmail diagnostics report
  const gmailR=loadJ(path.join(SD,'diagnostics-report.json'));
  if(gmailR?.diagnostics){
    summary.sources.gmail=gmailR.diagnostics.length;
    for(const d of gmailR.diagnostics){
      if(d.fps?.mfr?.length) for(const fp of d.fps.mfr)
        if(!idx.has(fp)) summary.unmatchedFPs.push({fp,source:'gmail',subj:(d.subj||'').slice(0,60)});
      if(d.errs?.length) summary.errors.push(...d.errs.map(e=>({err:e,source:'gmail'})));
    }
  }

  // Source 2: Homey device report (from homey-device-diagnostics.js)
  const homeyR=loadJ(path.join(SD,'homey-device-report.json'));
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
      const mr=await fetchWithRetry('https://api.athom.com/user/me/homey',opts,{retries:2,label:'list'});
      if(!mr.ok) throw new Error('Homey list: '+mr.status);
      const homeys=await mr.json();
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
          const report={id:anonId(d.id),name:d.name,mfr,model,driver:drv,
            online:!!d.available,
            caps:d.capabilitiesObj?Object.keys(d.capabilitiesObj).sort():[],
            warning:d.warning||null,matched:idx.has(mfr),
            drivers:idx.get(mfr)||[],multiDriver:(idx.get(mfr)||[]).length>1};
          saveJ(path.join(RD,anonId(d.id)+'.json'),report);
          if(!idx.has(mfr)&&mfr) summary.unmatchedFPs.push({fp:mfr,model,name:d.name,source:'live_api'});
        }
      }
    }catch(e){console.error('Live API:',e.message)}
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
