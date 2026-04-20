#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..','..');
const STATE=path.join(__dirname,'..','state');
const REPORT_FILE=path.join(STATE,'driver-conflict-audit.json');
fs.mkdirSync(STATE,{recursive:true});

function loadDrivers(){
  const map=new Map();
  const ddir=path.join(ROOT,'drivers');
  for(const d of fs.readdirSync(ddir)){
    const cf=path.join(ddir,d,'driver.compose.json');
    if(!fs.existsSync(cf))continue;
    try{const j=JSON.parse(fs.readFileSync(cf,'utf8'));map.set(d,{pids:j.zigbee?.productId||[],mfrs:j.zigbee?.manufacturerName||[],class:j.class||'other',caps:j.capabilities||[]});}catch{}
  }
  return map;
}

function auditPIDConflicts(drivers){
  const pidIdx=new Map();
  const skip=new Set(['universal_fallback','generic_diy','generic_tuya','diy_custom_zigbee']);
  for(const [d,info] of drivers){
    if(skip.has(d))continue;
    for(const p of info.pids){
      const norm = typeof p === 'string' ? p.toUpperCase() : p;
      if(!pidIdx.has(norm))pidIdx.set(norm,[]);
      if(!pidIdx.get(norm).includes(d)) pidIdx.get(norm).push(d);
    }
  }
  const conflicts=[];
  for(const [pid,drvs] of pidIdx){
    if(drvs.length<=1||pid==='TS0601')continue;
    const classes=[...new Set(drvs.map(d=>drivers.get(d)?.class))];
    const severity=classes.length>1?'high':drvs.length>3?'medium':'low';
    conflicts.push({pid,drivers:drvs,classes,crossClass:classes.length>1,severity});
  }
  return conflicts.sort((a,b)=>b.drivers.length-a.drivers.length);
}

function auditMfrConflicts(drivers){
  const mfrIdx=new Map();
  const caseIdx=new Map(); // Track normalized case collisions
  const skip=new Set(['universal_fallback','generic_diy','generic_tuya','diy_custom_zigbee']);
  
  for(const [d,info] of drivers){
    if(skip.has(d))continue;
    for(const m of info.mfrs){
      if(!mfrIdx.has(m))mfrIdx.set(m,[]);
      mfrIdx.get(m).push(d);
      
      const norm = m.toLowerCase();
      if(!caseIdx.has(norm))caseIdx.set(norm,new Set());
      caseIdx.get(norm).add(m);
    }
  }

  const dupes=[];
  for(const [mfr,drvs] of mfrIdx){
    if(drvs.length<=1)continue;
    const pidsPerDriver=drvs.map(d=>({driver:d,pids:drivers.get(d)?.pids||[]}));
    const sharedPids=pidsPerDriver[0].pids.filter(p=>pidsPerDriver.every(pd=>pd.pids.includes(p)));
    if(sharedPids.length>0){
      dupes.push({mfr,drivers:drvs,sharedPids,risk:'high'});
    }
  }

  const caseCollisions=[];
  for(const [norm,variants] of caseIdx){
    if(variants.size>1){
      const drvs = [...variants].flatMap(v=>mfrIdx.get(v)||[]);
      const uniqueDrvs = [...new Set(drvs)];
      if(uniqueDrvs.length>1){
        caseCollisions.push({norm,variants:[...variants],drivers:uniqueDrvs,risk:'medium'});
      }
    }
  }

  return {mfrConflicts:dupes,caseCollisions};
}

function auditOrphanDrivers(drivers){
  const orphans=[];
  for(const [d,info] of drivers){
    if(info.mfrs.length===0&&info.pids.length===0){orphans.push({driver:d,reason:'no_fingerprints'});}
    else if(info.mfrs.length===0){orphans.push({driver:d,reason:'no_manufacturer_names',pids:info.pids});}
    else if(info.pids.length===0){orphans.push({driver:d,reason:'no_product_ids',mfrs:info.mfrs});}
    const devFile=path.join(ROOT,'drivers',d,'device.js');
    if(!fs.existsSync(devFile)){orphans.push({driver:d,reason:'no_device_js'});}
  }
  return orphans;
}

function suggestSplits(conflicts,drivers){
  const suggestions=[];
  for(const c of conflicts.filter(x=>x.crossClass)){
    const byClass={};
    for(const d of c.drivers){
      const cls=drivers.get(d)?.class||'other';
      if(!byClass[cls])byClass[cls]=[];
      byClass[cls].push(d);
    }
    if(Object.keys(byClass).length>1){
      suggestions.push({pid:c.pid,splitBy:byClass,recommendation:'Ensure manufacturerName lists are distinct per driver so matching is unambiguous'});
    }
  }
  return suggestions;
}

async function main(){
  console.log('=== Driver Conflict Audit v1.0 ===\n');
  const drivers=loadDrivers();
  console.log('Total drivers: '+drivers.size);
  const report={timestamp:new Date().toISOString()};

  console.log('\n--- PID Conflicts ---');
  report.pidConflicts=auditPIDConflicts(drivers);
  const high=report.pidConflicts.filter(c=>c.severity==='high');
  const med=report.pidConflicts.filter(c=>c.severity==='medium');
  console.log('Total: '+report.pidConflicts.length+' (high='+high.length+', medium='+med.length+')');
  for(const c of high.slice(0,15)){console.log('  [HIGH] '+c.pid+' -> '+c.drivers.join(', ')+' (classes: '+c.classes.join(',')+')');}

  console.log('\n--- Manufacturer Conflicts ---');
  const mfrResult=auditMfrConflicts(drivers);
  report.mfrConflicts=mfrResult.mfrConflicts;
  report.caseCollisions=mfrResult.caseCollisions;
  console.log('MFR+PID duplicates (real risk): '+report.mfrConflicts.length);
  for(const d of report.mfrConflicts.slice(0,10)){console.log('  '+d.mfr+' -> '+d.drivers.join(', ')+' sharedPIDs='+d.sharedPids.join(','));}
  
  if (report.caseCollisions.length) {
    console.log('\n--- MFR Case Collisions (Match Risk) ---');
    console.log('Collisions: ' + report.caseCollisions.length);
    for(const c of report.caseCollisions.slice(0,10)){console.log('  '+c.norm+' -> variants='+c.variants.join(',')+' drivers='+c.drivers.join(','));}
  }

  console.log('\n--- Orphan Drivers ---');
  report.orphans=auditOrphanDrivers(drivers);
  console.log('Orphans: '+report.orphans.length);
  for(const o of report.orphans){console.log('  '+o.driver+': '+o.reason);}

  console.log('\n--- Split Suggestions ---');
  report.splitSuggestions=suggestSplits(report.pidConflicts,drivers);
  console.log('Suggestions: '+report.splitSuggestions.length);
  for(const s of report.splitSuggestions.slice(0,10)){console.log('  '+s.pid+': '+JSON.stringify(Object.keys(s.splitBy)));}

  console.log('\n---  Mfr + PID Pairing Check (Safety v6.3) ---');
  report.pairingAudit = [];
  for(const [d,info] of drivers){
    const hasTuyaMCU = info.mfrs.some(m => m.startsWith('_TZE'));
    if (hasTuyaMCU && info.pids.length === 0) {
      report.pairingAudit.push({driver: d, risk: 'high', reason: 'Tuya MCU (_TZE) driver missing productId triggers (risky generic matching)'});
    }
  }
  console.log('High-risk drivers (missing PIDs): ' + report.pairingAudit.length);
  for(const r of report.pairingAudit){console.log('  [RISK] '+r.driver+': '+r.reason);}

  report.summary={totalDrivers:drivers.size,pidConflicts:report.pidConflicts.length,highSeverity:high.length,mfrConflicts:report.mfrConflicts.length,orphans:report.orphans.length,splitSuggestions:report.splitSuggestions.length};
  fs.writeFileSync(REPORT_FILE,JSON.stringify(report,null,2));
  console.log('\n=== Summary ===');
  console.log(JSON.stringify(report.summary,null,2));

  if(process.env.GITHUB_OUTPUT){
    const out=fs.createWriteStream(process.env.GITHUB_OUTPUT,{flags:'a'});
    out.write('high_conflicts='+high.length+'\n');
    out.write('mfr_conflicts='+report.mfrConflicts.length+'\n');
    out.write('orphans='+report.orphans.length+'\n');
    out.write('split_suggestions='+report.splitSuggestions.length+'\n');
    out.end();
  }
}

main().catch(e=>{console.error('FATAL:',e);process.exit(1);});
