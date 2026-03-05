#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path');
const{fetchWithRetry}=require('./retry-helper');
const TOKENS=[process.env.HOMEY_PAT_API,process.env.HOMEY_PAT].filter(Boolean);
let PAT=null;
const SUM=process.env.GITHUB_STEP_SUMMARY||null;
const STATE=path.join(__dirname,'..','state');
const REPORT=path.join(STATE,'homey-device-report.json');
const DDIR=path.join(__dirname,'..','..','drivers');
const APP='com.dlnraja.tuya.zigbee';
if(!TOKENS.length){console.log('HOMEY_PAT_API/HOMEY_PAT not set - skip');process.exit(1);}
function log(t){console.log(t);if(SUM)fs.appendFileSync(SUM,t+'\n');}
async function api(url){
  const r=await fetchWithRetry(url,{headers:{'Authorization':'Bearer '+PAT}},{retries:3,label:'homeyAPI'});
  if(!r.ok)throw new Error(r.status+' '+url);
  return r.json();
}
function getLocalFPs(){
  const fps=new Set();
  try{
    for(const d of fs.readdirSync(DDIR)){
      try{const c=JSON.parse(fs.readFileSync(path.join(DDIR,d,'driver.compose.json'),'utf8'));
        if(c.zigbee?.manufacturerName)c.zigbee.manufacturerName.forEach(m=>fps.add(m));
      }catch{}
    }
  }catch{}
  return fps;
}
async function main(){
  log('## Homey Device Diagnostics');
  let me=null;
  for(const t of TOKENS){
    PAT=t;
    try{me=await api('https://api.athom.com/user/me');log('Auth OK (token ****)');break;}catch(e){log('Token **** failed: '+e.message);}
  }
  if(!me){log('::error::All tokens failed for api.athom.com');process.exit(0);}
  log('User: '+(me.firstname||'')+' '+(me.lastname||''));
  let homeys=[];
  try{homeys=await api('https://api.athom.com/user/me/homey');}catch(e){log('::warning::Cannot list Homeys: '+e.message+' (PAT scope may be limited)');}
  if(!homeys||!homeys.length){log('No Homeys found (try a full-scope OAuth token)');return;}
  log('Found '+homeys.length+' Homey(s)');
  const localFPs=getLocalFPs();
  log('Local fingerprints: '+localFPs.size);
  const report={date:new Date().toISOString(),homeys:[],localFPs:localFPs.size};
  for(const h of homeys){
    log('\n### Homey: '+(h.name||h.id));
    const base='https://'+h.id+'.connect.athom.com/api';
    let devices=[],zigbee=null,appInfo=null,sysInfo=null;
    try{const dd=await api(base+'/manager/devices/device');devices=Object.values(dd);}catch(e){log('Devices err: '+e.message);}
    try{zigbee=await api(base+'/manager/zigbee/state');}catch(e){log('Zigbee err: '+e.message);}
    try{const apps=await api(base+'/manager/apps/app');appInfo=apps[APP]||null;}catch(e){log('Apps err: '+e.message);}
    try{sysInfo=await api(base+'/manager/system');}catch(e){}
    const tuyaDevs=devices.filter(d=>{
      const mfr=d.settings?.zb_manufacturer_name||'';
      return mfr.startsWith('_T')||d.driverUri?.includes('tuya');
    });
    const matched=[],unmatched=[];
    for(const d of tuyaDevs){
      const mfr=d.settings?.zb_manufacturer_name||'';
      if(localFPs.has(mfr))matched.push({name:d.name,mfr,model:d.settings?.zb_model_id||'?',driver:d.driverUri||'?',online:d.available||false});
      else unmatched.push({name:d.name,mfr,model:d.settings?.zb_model_id||'?',online:d.available||false});
    }
    log('Total devices: '+devices.length);
    log('Tuya devices: '+tuyaDevs.length+' (matched: '+matched.length+', unmatched: '+unmatched.length+')');
    if(appInfo)log('App version: '+(appInfo.version||'?'));
    if(sysInfo)log('Firmware: '+(sysInfo.homeyVersion||sysInfo.softwareVersion||'?'));
    if(unmatched.length){
      log('\n**Unmatched fingerprints (not in our DB):**');
      for(const u of unmatched)log('- `'+u.mfr+'` / `'+u.model+'` — '+u.name+(u.online?' (online)':' (offline)'));
    }
    const offline=tuyaDevs.filter(d=>!d.available);
    if(offline.length)log('\nOffline Tuya devices: '+offline.length);
    const hReport={id:h.id,name:h.name,firmware:sysInfo?.homeyVersion||sysInfo?.softwareVersion||'?',
      appVersion:appInfo?.version||null,totalDevices:devices.length,tuyaDevices:tuyaDevs.length,
      matched:matched.length,unmatched:unmatched.length,unmatchedList:unmatched,
      offlineCount:offline.length,zigbeeNodes:zigbee?.nodes?Object.keys(zigbee.nodes).length:null};
    if(zigbee?.nodes)hReport.zigbeeRouters=(Object.values(zigbee.nodes).filter(n=>n.type==='router')).length;
    report.homeys.push(hReport);
  }
  fs.mkdirSync(STATE,{recursive:true});
  fs.writeFileSync(REPORT,JSON.stringify(report,null,2)+'\n');
  log('\nReport saved to '+path.relative(process.cwd(),REPORT));
}
main().catch(e=>{console.error('Fatal:',e.message);process.exit(1);});
