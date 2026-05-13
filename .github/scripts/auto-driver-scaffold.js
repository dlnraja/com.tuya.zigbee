#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path'),{execSync:ex}=require('child_process');
const ROOT=path.join(__dirname,'..','..');
const TMP='/tmp/johan-sdk3';
const STATE=path.join(__dirname,'..','state');
const REPORT_FILE=path.join(STATE,'driver-scaffold-report.json');
fs.mkdirSync(STATE,{recursive:true});

function run(cmd,cwd){try{return ex(cmd,{encoding:'utf8',cwd:cwd||ROOT,timeout:60000}).trim();}catch{return '';}}

const CLASS_MAP={light:'UnifiedLightBase',socket:'UnifiedSwitchBase',sensor:'UnifiedSensorBase',thermostat:'UnifiedSensorBase',fan:'BaseUnifiedDevice',windowcoverings:'UnifiedCoverBase',other:'BaseUnifiedDevice'};
const CLASS_IMPORTS={UnifiedLightBase:"const UnifiedLightBase=require('../../lib/devices/UnifiedLightBase');",UnifiedSwitchBase:"const UnifiedSwitchBase=require('../../lib/devices/UnifiedSwitchBase');",UnifiedSensorBase:"const UnifiedSensorBase=require('../../lib/devices/UnifiedSensorBase');",UnifiedCoverBase:"const UnifiedCoverBase=require('../../lib/devices/UnifiedCoverBase');",BaseUnifiedDevice:"const {ZigBeeDevice}=require('homey-zigbeedriver');"};

function loadDrivers(dir){
  const map=new Map();
  if(!fs.existsSync(dir))return map;
  for(const d of fs.readdirSync(dir)){
    const cf=path.join(dir,d,'driver.compose.json');
    if(!fs.existsSync(cf))continue;
    try{const j=JSON.parse(fs.readFileSync(cf,'utf8'));map.set(d,{pids:j.zigbee?.productId||[],mfrs:j.zigbee?.manufacturerName||[],class:j.class||'other',compose:j});}catch{}
  }
  return map;
}
function buildIdx(drivers,field){
  const idx=new Map();
  for(const [d,info] of drivers){for(const v of info[field]){if(!idx.has(v))idx.set(v,[]);idx.get(v).push(d);}}
  return idx;
}

function detectConflicts(ourDrivers){
  const pidIdx=buildIdx(ourDrivers,'pids');
  const skip=new Set(['universal_fallback','generic_diy','generic_tuya','diy_custom_zigbee']);
  const conflicts=[];
  for(const [pid,drivers] of pidIdx){
    if(pid==='TS0601')continue;
    const real=drivers.filter(d=>!skip.has(d));
    if(real.length>1){
      const classes=new Set(real.map(d=>ourDrivers.get(d)?.class||'other'));
      conflicts.push({pid,drivers:real,classes:[...classes],crossClass:classes.size>1});
    }
  }
  return conflicts;
}

function findUncoveredFPs(ourDrivers,johanDrivers){
  const ourMfrIdx=buildIdx(ourDrivers,'mfrs');
  const ourPidIdx=buildIdx(ourDrivers,'pids');
  const uncovered=[];
  for(const [jd,jInfo] of johanDrivers){
    const missingMfrs=jInfo.mfrs.filter(m=>!ourMfrIdx.has(m));
    if(missingMfrs.length>0){
      const pidsCovered=jInfo.pids.every(p=>ourPidIdx.has(p));
      uncovered.push({johanDriver:jd,missingMfrs,pids:jInfo.pids,class:jInfo.class,pidsCovered});
    }
  }
  return uncovered;
}

function findMissingDriverTypes(ourDrivers,johanDrivers){
  const ourPidIdx=buildIdx(ourDrivers,'pids');
  const missing=[];
  for(const [jd,jInfo] of johanDrivers){
    if(ourDrivers.has(jd))continue;
    const hasOverlap=jInfo.pids.some(p=>{
      const ours=ourPidIdx.get(p)||[];
      return ours.some(od=>ourDrivers.get(od)?.class===jInfo.class);
    });
    if(!hasOverlap&&jInfo.mfrs.length>0){
      missing.push({johanDriver:jd,pids:jInfo.pids,mfrs:jInfo.mfrs,class:jInfo.class});
    }
  }
  return missing;
}
function scaffoldDriver(name,info,johanCompose){
  const driverDir=path.join(ROOT,'drivers',name);
  if(fs.existsSync(driverDir)){console.log('  SKIP '+name+' (exists)');return false;}
  fs.mkdirSync(driverDir,{recursive:true});
  fs.mkdirSync(path.join(driverDir,'assets','images'),{recursive:true});
  const compose=johanCompose||{name:{en:name.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())},class:info.class||'other',capabilities:['onoff'],zigbee:{manufacturerName:info.mfrs||[],productId:info.pids||[],deviceJoinedTriggerFlowId:'_triggerFlowDeviceAdded',learnmode:{instruction:{en:'Put device in pairing mode'}}},images:{small:'{{driverAssetsPath}}/images/small.png',large:'{{driverAssetsPath}}/images/large.png',xlarge:'{{driverAssetsPath}}/images/xlarge.png'}};
  fs.writeFileSync(path.join(driverDir,'driver.compose.json'),JSON.stringify(compose,null,2)+'\n');
  const base=CLASS_MAP[info.class]||'BaseUnifiedDevice';
  const imp=CLASS_IMPORTS[base]||CLASS_IMPORTS.BaseUnifiedDevice;
  const cn=name.split('_').map(w=>w[0].toUpperCase()+w.slice(1)).join('');
  const isTuya=info.pids?.some(p=>p==='TS0601');
  let devJs="'use strict';\n\n"+imp+"\n\nclass "+cn+"Device extends "+(base==='BaseUnifiedDevice'?'ZigBeeDevice':base)+" {\n  async onNodeInit({zclNode}){\n    this.log('["+name.toUpperCase()+"] init');\n    await super.onNodeInit({zclNode});\n    this.log('["+name.toUpperCase()+"] ready');\n  }\n";
  if(isTuya)devJs+="\n  get dpMappings(){\n    return {\n      // TODO: add DP mappings from device logs\n    };\n  }\n";
  devJs+="}\n\nmodule.exports="+cn+"Device;\n";
  fs.writeFileSync(path.join(driverDir,'device.js'),devJs);
  let drvJs="'use strict';\n\nconst {Driver}=require('homey');\n\nclass "+cn+"Driver extends Driver{\n  async onInit(){this.log('"+name+" driver init');}\n}\n\nmodule.exports="+cn+"Driver;\n";
  fs.writeFileSync(path.join(driverDir,'driver.js'),drvJs);
  fs.writeFileSync(path.join(driverDir,'driver.flow.compose.json'),JSON.stringify({triggers:[],conditions:[],actions:[]},null,2)+'\n');
  const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50"><rect width="50" height="50" rx="8" fill="#4A90D9"/><text x="25" y="30" text-anchor="middle" fill="white" font-size="10">NEW</text></svg>';
  fs.writeFileSync(path.join(driverDir,'assets','icon.svg'),svg);
  console.log('  CREATED '+name+' (class='+info.class+', base='+base+', FPs='+(info.mfrs||[]).length+')');
  return true;
}
async function main(){
  console.log('=== Auto Driver Scaffold v1.0 ===\n');
  const report={timestamp:new Date().toISOString(),conflicts:[],uncoveredFPs:[],missingDrivers:[],scaffolded:[],errors:[]};
  if(!fs.existsSync(path.join(TMP,'drivers'))){
    console.log('Cloning Johan SDK3...');
    run('git clone --depth 1 --branch SDK3 https://github.com/JohanBendz/com.tuya.zigbee.git '+TMP);
  }
  console.log('Step 1: Loading drivers...');
  const ourDrivers=loadDrivers(path.join(ROOT,'drivers'));
  const johanDrivers=loadDrivers(path.join(TMP,'drivers'));
  console.log('  Our: '+ourDrivers.size+', Johan: '+johanDrivers.size);

  console.log('\nStep 2: Detecting PID conflicts...');
  report.conflicts=detectConflicts(ourDrivers);
  const crossClass=report.conflicts.filter(c=>c.crossClass);
  console.log('  PID conflicts: '+report.conflicts.length+', cross-class: '+crossClass.length);
  for(const c of crossClass.slice(0,10)){console.log('    '+c.pid+' -> '+c.drivers.join(', ')+' ('+c.classes.join(',')+')');} 

  console.log('\nStep 3: Finding uncovered FPs...');
  report.uncoveredFPs=findUncoveredFPs(ourDrivers,johanDrivers);
  console.log('  Uncovered FP groups: '+report.uncoveredFPs.length);

  console.log('\nStep 4: Finding missing driver types...');
  report.missingDrivers=findMissingDriverTypes(ourDrivers,johanDrivers);
  console.log('  Missing driver types: '+report.missingDrivers.length);
  for(const m of report.missingDrivers){console.log('    '+m.johanDriver+' ('+m.class+', PIDs='+m.pids.join(',')+', FPs='+m.mfrs.length+')');}

  console.log('\nStep 5: Scaffolding missing drivers...');
  for(const m of report.missingDrivers){
    try{const jc=johanDrivers.get(m.johanDriver)?.compose||null;if(scaffoldDriver(m.johanDriver,m,jc))report.scaffolded.push(m.johanDriver);}
    catch(e){report.errors.push({driver:m.johanDriver,error:e.message});console.log('  ERROR '+m.johanDriver+': '+e.message);}
  }

  console.log('\nStep 6: Adding uncovered FPs to existing drivers...');
  let fpAdded=0;
  const ourPidIdx2=buildIdx(ourDrivers,'pids');
  for(const u of report.uncoveredFPs){
    if(!u.pidsCovered)continue;
    for(const pid of u.pids){
      const targets=(ourPidIdx2.get(pid)||[]).filter(t=>ourDrivers.get(t)?.class===u.class);
      if(targets.length===1){
        const cf=path.join(ROOT,'drivers',targets[0],'driver.compose.json');
        try{const j=JSON.parse(fs.readFileSync(cf,'utf8'));let ch=false;
          for(const mfr of u.missingMfrs){if(!j.zigbee.manufacturerName.includes(mfr)){j.zigbee.manufacturerName.push(mfr);ch=true;fpAdded++;}}
          if(ch)fs.writeFileSync(cf,JSON.stringify(j,null,2)+'\n');
        }catch{}
      }
    }
  }
  console.log('  FPs added: '+fpAdded);

  report.summary={ourDrivers:ourDrivers.size,johanDrivers:johanDrivers.size,pidConflicts:report.conflicts.length,crossClassConflicts:crossClass.length,uncoveredFPGroups:report.uncoveredFPs.length,missingDriverTypes:report.missingDrivers.length,scaffolded:report.scaffolded.length,fpsAdded:fpAdded,errors:report.errors.length};
  fs.writeFileSync(REPORT_FILE,JSON.stringify(report,null,2));
  console.log('\n=== Summary ===');
  console.log(JSON.stringify(report.summary,null,2));
  if(process.env.GITHUB_OUTPUT){
    const out=fs.createWriteStream(process.env.GITHUB_OUTPUT,{flags:'a'});
    out.write('scaffolded='+report.scaffolded.length+'\n');
    out.write('fps_added='+fpAdded+'\n');
    out.write('conflicts='+crossClass.length+'\n');
    out.write('has_changes='+(report.scaffolded.length>0||fpAdded>0?'true':'false')+'\n');
    out.end();
  }
}

main().catch(e=>{console.error('FATAL:',e);process.exit(1);});