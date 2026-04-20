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

/**
 * Step 6: Compare Johan lib/files with ours
 * Detects new cluster definitions, helper functions, and DP constant files
 */
function compareLibFiles(report){
  console.log('Step 6: Comparing lib/files...');
  report.libAnalysis={newClusters:[],newHelpers:[],dpConstantDiffs:[]};

  const johanLib=path.join(TMP,'lib');
  const ourLib=path.join(ROOT,'lib');
  if(!fs.existsSync(johanLib))return;

  const johanFiles=fs.readdirSync(johanLib).filter(f=>f.endsWith('.js'));

  for(const f of johanFiles){
    const johanPath=path.join(johanLib,f);
    const src=fs.readFileSync(johanPath,'utf8');

    // Detect cluster definitions
    if(f.includes('Cluster')){
      const idMatch=src.match(/static\s+get\s+ID\s*\(\)\s*\{\s*return\s+(\d+)/);
      const nameMatch=src.match(/static\s+get\s+NAME\s*\(\)\s*\{\s*return\s+['"](\w+)['"]/);
      const clusterInfo={
        file:f,
        id:idMatch?parseInt(idMatch[1]):null,
        name:nameMatch?nameMatch[1]:null,
        extendsCluster:null
      };

      // Check if extends a standard cluster
      const extendsMatch=src.match(/class\s+\w+\s+extends\s+(\w+)/);
      if(extendsMatch)clusterInfo.extendsCluster=extendsMatch[1];

      // Extract attributes
      const attrNames=[];
      const attrRe=/(\w+)\s*:\s*\{\s*id\s*:\s*(0x[\da-fA-F]+|\d+)/g;
      let am;while((am=attrRe.exec(src))!==null)attrNames.push({name:am[1],id:am[2]});
      clusterInfo.attributes=attrNames;

      // Extract commands
      const cmdNames=[];
      const cmdRe=/(\w+)\s*:\s*\{\s*id\s*:\s*(\d+|0x[\da-fA-F]+)\s*,\s*args/g;
      let cm;while((cm=cmdRe.exec(src))!==null)cmdNames.push({name:cm[1],id:cm[2]});
      clusterInfo.commands=cmdNames;

      // Check if we have equivalent
      const ourClusterDir=path.join(ourLib,'clusters');
      const ourFiles=fs.existsSync(ourClusterDir)?fs.readdirSync(ourClusterDir):[];
      clusterInfo.existsInOurs=ourFiles.some(of=>of.toLowerCase().includes(f.replace('.js','').toLowerCase()))
        ||ourFiles.some(of=>{
          try{
            const oSrc=fs.readFileSync(path.join(ourClusterDir,of),'utf8');
            return clusterInfo.id&&oSrc.includes(String(clusterInfo.id));
          }catch{return false;}
        });

      report.libAnalysis.newClusters.push(clusterInfo);
      const status=clusterInfo.existsInOurs?'EXISTS':'MISSING';
      console.log('  Cluster: '+f+' ('+status+') id='+clusterInfo.id+' attrs='+attrNames.length+' cmds='+cmdNames.length);
    }

    // Detect helper/utility files
    if(f.includes('Helper')||f.includes('DataPoint')){
      const exports=[];
      const expRe=/(\w+)\s*[,:]\s*(?:function|\(|=>)/g;
      let em;while((em=expRe.exec(src))!==null){
        if(!['if','for','while','switch','catch','require','module'].includes(em[1]))
          exports.push(em[1]);
      }
      report.libAnalysis.newHelpers.push({file:f,exports:[...new Set(exports)]});
      console.log('  Helper: '+f+' exports: '+[...new Set(exports)].slice(0,5).join(', ')+(exports.length>5?'...':''));
    }
  }

  // Compare TuyaDataPoints.js constants with our dpMappings
  const dpFile=path.join(johanLib,'TuyaDataPoints.js');
  if(fs.existsSync(dpFile)){
    const dpSrc=fs.readFileSync(dpFile,'utf8');
    const constBlocks=dpSrc.match(/const\s+(\w+)\s*=\s*\{[^}]+\}/gs)||[];
    console.log('  Johan TuyaDataPoints.js: '+constBlocks.length+' DP definition blocks');
    report.libAnalysis.dpConstantBlocks=constBlocks.length;
  }
}

/**
 * Step 7: Analyze device.js code patterns
 * Detects dimmer auto-on/off, readAttributes calls, error handling patterns
 */
function analyzeDevicePatterns(report){
  console.log('Step 7: Analyzing device.js patterns...');
  report.patternAnalysis={readAttributesCalls:0,dimAutoOnOff:0,tuyaListenerPattern:0,errorHandling:0};

  const johanDriverDir=path.join(TMP,'drivers');
  if(!fs.existsSync(johanDriverDir))return;

  for(const d of fs.readdirSync(johanDriverDir)){
    const devFile=path.join(johanDriverDir,d,'device.js');
    if(!fs.existsSync(devFile))continue;
    try{
      const src=fs.readFileSync(devFile,'utf8');

      // Pattern: readAttributes on init
      if(src.includes('readAttributes'))report.patternAnalysis.readAttributesCalls++;

      // Pattern: dimmer auto-on when brightness > 0
      if(src.includes('brightness > 0')&&src.includes('turning on'))report.patternAnalysis.dimAutoOnOff++;

      // Pattern: tuya.on('reporting') + tuya.on('response')
      if(src.includes(".on('reporting'")&&src.includes(".on('response'"))report.patternAnalysis.tuyaListenerPattern++;

      // Pattern: try/catch error handling in DP processing
      if(src.includes('catch (err)')&&src.includes('processDatapoint'))report.patternAnalysis.errorHandling++;
    }catch{}
  }

  console.log('  readAttributes on init: '+report.patternAnalysis.readAttributesCalls+' devices');
  console.log('  Dimmer auto-on/off: '+report.patternAnalysis.dimAutoOnOff+' devices');
  console.log('  Tuya reporting+response listeners: '+report.patternAnalysis.tuyaListenerPattern+' devices');
  console.log('  Error handling in DP processing: '+report.patternAnalysis.errorHandling+' devices');
}

async function main(){
  console.log('=== Johan SDK3 Deep Auto-Sync v2 ===\n');
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

  // Step 6: Compare lib/files (NEW v2)
  compareLibFiles(report);

  // Step 7: Analyze device.js patterns (NEW v2)
  analyzeDevicePatterns(report);

  // Step 8: Save report
  report.summary={
    totalJohanFPs:johanFPs.size,totalOurFPs:ourFPs.size,
    missingFPs:missing.length,addedFPs:report.added.length,
    skippedFPs:report.skipped.length,dpGaps:report.dpGaps.length,
    newDrivers:report.newDrivers.length,
    libClusters:report.libAnalysis?.newClusters?.length||0,
    libHelpers:report.libAnalysis?.newHelpers?.length||0,
    patterns:report.patternAnalysis||{}
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
    out.write('lib_clusters='+report.summary.libClusters+'\n');
    out.write('has_changes='+(report.added.length>0?'true':'false')+'\n');
    out.end();
  }
}

main().catch(e=>{console.error(e);process.exit(1);});
