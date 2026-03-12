#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path'),{execSync:ex}=require('child_process');
const ROOT=path.join(__dirname,'..','..');
const TMP='/tmp/johan-sdk3';
const STATE=path.join(__dirname,'..','state');
const REPORT=path.join(STATE,'johan-sdk3-sync.json');
fs.mkdirSync(STATE,{recursive:true});

function run(cmd,cwd){try{return ex(cmd,{encoding:'utf8',cwd:cwd||ROOT,timeout:60000}).trim();}catch(e){return '';}}

function loadOurFPs(){
  const fps=new Map();
  const ddir=path.join(ROOT,'drivers');
  for(const d of fs.readdirSync(ddir)){
    const cf=path.join(ddir,d,'driver.compose.json');
    if(!fs.existsSync(cf))continue;
    try{
      const r=JSON.parse(fs.readFileSync(cf,'utf8'));
      const mfrs=r.zigbee?.manufacturerName||[];
      const pids=r.zigbee?.productId||[];
      mfrs.forEach(m=>fps.set(m,{driver:d,pids}));
    }catch{}
  }
  return fps;
}

function loadJohanFPs(){
  const fps=new Map();
  const ddir=path.join(TMP,'drivers');
  if(!fs.existsSync(ddir))return fps;
  for(const d of fs.readdirSync(ddir)){
    const cf=path.join(ddir,d,'driver.compose.json');
    if(!fs.existsSync(cf))continue;
    try{
      const r=JSON.parse(fs.readFileSync(cf,'utf8'));
      const mfrs=r.zigbee?.manufacturerName||[];
      const pids=r.zigbee?.productId||[];
      mfrs.forEach(m=>fps.set(m,{driver:d,pids}));
    }catch{}
  }
  return fps;
}

function findBestDriver(fp,johanDriver,johanPids){
  const ddir=path.join(ROOT,'drivers');
  for(const d of fs.readdirSync(ddir)){
    const cf=path.join(ddir,d,'driver.compose.json');
    if(!fs.existsSync(cf))continue;
    try{
      const r=JSON.parse(fs.readFileSync(cf,'utf8'));
      const pids=r.zigbee?.productId||[];
      if(johanPids.some(p=>pids.includes(p)))return {driver:d,file:cf,json:r};
    }catch{}
  }
  return null;
}

function addFPtoDriver(driverPath,json,fp,newPids){
  let changed=false;
  if(!json.zigbee.manufacturerName.includes(fp)){
    json.zigbee.manufacturerName.push(fp);
    changed=true;
  }
  for(const pid of newPids){
    if(!json.zigbee.productId.includes(pid)){
      json.zigbee.productId.push(pid);
      changed=true;
    }
  }
  if(changed){
    fs.writeFileSync(driverPath,JSON.stringify(json,null,2)+'\n');
  }
  return changed;
}

function extractDPMappings(src){
  const dps=[];
  const re=/case\s+(\d+|[\w.]+):/g;
  let m;while((m=re.exec(src))!==null)dps.push(m[1]);
  const dpObj={};
  const re2=/(\d+)\s*:\s*\{[^}]*capability\s*:\s*['"]([^'"]+)['"]/g;
  while((m=re2.exec(src))!==null)dpObj[m[1]]=m[2];
  return {switchCases:dps,dpMappings:dpObj};
}

async function main(){
  console.log('=== Johan SDK3 Auto-Sync ===\n');
  const report={timestamp:new Date().toISOString(),added:[],skipped:[],dpGaps:[],errors:[]};

  // Step 1: Clone/update Johan SDK3
  console.log('Step 1: Fetching Johan SDK3 branch...');
  if(fs.existsSync(TMP)){
    run('git fetch origin SDK3',TMP);
    run('git checkout SDK3 && git pull',TMP);
  }else{
    run('git clone --depth 1 --branch SDK3 https://github.com/JohanBendz/com.tuya.zigbee.git '+TMP);
  }
  if(!fs.existsSync(path.join(TMP,'drivers'))){
    console.error('Failed to clone Johan repo');
    process.exit(1);
  }

  // Step 2: Compare fingerprints
  console.log('Step 2: Comparing fingerprints...');
  const ourFPs=loadOurFPs();
  const johanFPs=loadJohanFPs();
  console.log('  Our FPs: '+ourFPs.size+', Johan FPs: '+johanFPs.size);

  const missing=[];
  for(const [fp,info] of johanFPs){
    if(!ourFPs.has(fp)){
      missing.push({fp,driver:info.driver,pids:info.pids});
    }
  }
  console.log('  Missing FPs: '+missing.length);

  // Step 3: Auto-add safe missing FPs
  console.log('Step 3: Auto-adding safe FPs...');
  for(const item of missing){
    const match=findBestDriver(item.fp,item.driver,item.pids);
    if(match){
      const ok=addFPtoDriver(match.file,match.json,item.fp,item.pids.filter(p=>!match.json.zigbee.productId.includes(p)));
      if(ok){
        console.log('  ADDED '+item.fp+' -> '+match.driver);
        report.added.push({fp:item.fp,driver:match.driver,pids:item.pids});
      }
    }else{
      console.log('  SKIP '+item.fp+' (no matching driver for PIDs: '+item.pids.join(',')+')');
      report.skipped.push({fp:item.fp,johanDriver:item.driver,pids:item.pids});
    }
  }

  // Step 4: Detect DP mapping gaps
  console.log('Step 4: Scanning DP mapping gaps...');
  const johanDriverDir=path.join(TMP,'drivers');
  const ourDriverDir=path.join(ROOT,'drivers');
  for(const d of fs.readdirSync(johanDriverDir)){
    const jDev=path.join(johanDriverDir,d,'device.js');
    const oDev=path.join(ourDriverDir,d,'device.js');
    if(!fs.existsSync(jDev)||!fs.existsSync(oDev))continue;
    try{
      const jSrc=fs.readFileSync(jDev,'utf8');
      const oSrc=fs.readFileSync(oDev,'utf8');
      const jDP=extractDPMappings(jSrc);
      const oDP=extractDPMappings(oSrc);
      const johanDPs=Object.keys(jDP.dpMappings);
      const ourDPs=Object.keys(oDP.dpMappings);
      const missingDPs=johanDPs.filter(dp=>!ourDPs.includes(dp));
      if(missingDPs.length){
        report.dpGaps.push({driver:d,missingDPs:missingDPs.map(dp=>({dp,capability:jDP.dpMappings[dp]}))});
        console.log('  DP gap in '+d+': missing DPs '+missingDPs.join(','));
      }
    }catch(e){report.errors.push({driver:d,error:e.message});}
  }

  // Step 5: Check for new drivers in Johan not in ours
  console.log('Step 5: Checking for new Johan drivers...');
  report.newDrivers=[];
  const ourDrivers=new Set(fs.readdirSync(ourDriverDir));
  for(const d of fs.readdirSync(johanDriverDir)){
    if(!ourDrivers.has(d)&&fs.existsSync(path.join(johanDriverDir,d,'device.js'))){
      report.newDrivers.push(d);
      console.log('  New Johan driver: '+d);
    }
  }

  // Step 6: Save report
  report.summary={
    totalJohanFPs:johanFPs.size,totalOurFPs:ourFPs.size,
    missingFPs:missing.length,addedFPs:report.added.length,
    skippedFPs:report.skipped.length,dpGaps:report.dpGaps.length,
    newDrivers:report.newDrivers.length
  };
  fs.writeFileSync(REPORT,JSON.stringify(report,null,2));
  console.log('\n=== Summary ===');
  console.log(JSON.stringify(report.summary,null,2));
  console.log('Report: '+REPORT);

  // Output for GitHub Actions
  if(process.env.GITHUB_OUTPUT){
    const out=fs.createWriteStream(process.env.GITHUB_OUTPUT,{flags:'a'});
    out.write('added='+report.added.length+'\n');
    out.write('gaps='+report.dpGaps.length+'\n');
    out.write('new_drivers='+report.newDrivers.length+'\n');
    out.write('has_changes='+(report.added.length>0?'true':'false')+'\n');
    out.end();
  }
}

main().catch(e=>{console.error(e);process.exit(1);});
