#!/usr/bin/env node
'use strict';
/**
 * External Sources Scanner - Comprehensive scan of ALL Zigbee community sources
 * - Z2M converters (full device DB) + issues + PRs
 * - ZHA quirks (full quirk DB) + issues
 * - Blakadder new devices DB
 * - deCONZ device DB
 * - Hubitat community drivers
 * - For each device: search for ALL variants, associated bugs
 * - Cross-references everything with our fingerprint DB
 */
const fs=require('fs'),path=require('path');
const{callAI}=require('./ai-helper');
const{loadFingerprints,findAllDrivers,extractMfrFromText}=require('./load-fingerprints');
const{fetchWithRetry}=require('./retry-helper');

const GH='https://api.github.com';
const TOKEN=process.env.GH_PAT||process.env.GITHUB_TOKEN;
const STATE_F=path.join(__dirname,'..','state','external-sources-state.json');
const REPORT_F=path.join(__dirname,'..','state','external-sources-report.json');
const DATA_F=path.join(__dirname,'..','state','external-sources-data.json');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const extractFP=t=>[...new Set((t||'').match(/_T[A-Z][A-Za-z0-9]{3,5}_[a-z0-9]{4,16}/g)||[])];
let appVer='?';try{appVer=JSON.parse(fs.readFileSync(path.join(__dirname,'..','..','app.json'),'utf8')).version}catch{}
const fps=loadFingerprints();
const hdrs=t=>({Accept:'application/vnd.github+json','User-Agent':'tuya-ext-scanner',...(t?{Authorization:'Bearer '+t}:{})});

function loadState(){try{return JSON.parse(fs.readFileSync(STATE_F,'utf8'))}catch{return{lastRun:null,knownDevices:{}}}}
function saveState(s){fs.mkdirSync(path.dirname(STATE_F),{recursive:true});fs.writeFileSync(STATE_F,JSON.stringify(s,null,2)+'\n')}
async function fetchJSON(url,h){try{const r=await fetchWithRetry(url,{headers:h||{'User-Agent':'tuya-bot'}},{retries:3,label:'extJSON'});if(!r.ok)return null;return r.json()}catch{return null}}
async function fetchText(url){try{const r=await fetchWithRetry(url,{headers:{'User-Agent':'tuya-bot'}},{retries:3,label:'extText'});if(!r.ok)return null;return r.text()}catch{return null}}

// ====== Z2M: Full converter database ======
async function scanZ2MConverters(){
  console.log('== Z2M Converters ==');
  const devices=[];
  // Fetch the Tuya converter index
  const urls=[
    'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/tuya.ts',
    'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/tuya.js',
  ];
  for(const url of urls){
    const src=await fetchText(url);
    if(!src)continue;
    // Extract all fingerprints with their model info
    const fpMatches=src.match(/fingerprint:\s*\[[\s\S]*?\]/g)||[];
    for(const block of fpMatches){
      const mfrs=extractFP(block);
      const models=[...new Set((block.match(/modelID:\s*'([^']+)'/g)||[]).map(m=>m.replace(/modelID:\s*'/,'').replace(/'/,'')))];
      for(const fp of mfrs)devices.push({fp,models,source:'z2m-converter'});
    }
    // Also extract inline fingerprints
    const inlineFPs=extractFP(src);
    for(const fp of inlineFPs)if(!devices.find(d=>d.fp===fp))devices.push({fp,models:[],source:'z2m-converter'});
    console.log('  Parsed',devices.length,'device entries from Tuya converter');
    break;
  }
  return devices;
}

// ====== Z2M: Issues + PRs with Tuya devices ======
async function scanZ2MIssuesPRs(){
  console.log('== Z2M Issues & PRs ==');
  const results=[];
  const queries=['repo:Koenkk/zigbee2mqtt+_TZE+state:open','repo:Koenkk/zigbee2mqtt+tuya+state:open','repo:Koenkk/zigbee-herdsman-converters+tuya+state:open','repo:Koenkk/zigbee-herdsman-converters+_TZE+state:open'];
  for(const q of queries){
    const d=await fetchJSON(GH+'/search/issues?q='+encodeURIComponent(q)+'&per_page=30&sort=created&order=desc',hdrs(TOKEN));
    if(!d||!d.items)continue;
    for(const iss of d.items){
      const text=(iss.title||'')+' '+(iss.body||'');
      const found=extractFP(text);
      if(found.length)results.push(...found.map(fp=>({fp,source:'z2m-issue',num:iss.number,title:iss.title?.slice(0,80),url:iss.html_url,isPR:!!iss.pull_request})));
    }
    await sleep(2000);
  }
  console.log('  Found',results.length,'FP entries from Z2M issues/PRs');
  return results;
}

// ====== ZHA: Quirks database ======
async function scanZHAQuirks(){
  console.log('== ZHA Quirks ==');
  const devices=[];
  const src=await fetchText('https://raw.githubusercontent.com/zigpy/zha-device-handlers/dev/zhaquirks/tuya/__init__.py');
  if(src){const found=extractFP(src);for(const fp of found)devices.push({fp,source:'zha-quirk'});console.log('  Main tuya init:',found.length,'FPs')}
  // Also scan individual quirk files listing
  const tree=await fetchJSON(GH+'/repos/zigpy/zha-device-handlers/git/trees/dev?recursive=1',hdrs(TOKEN));
  if(tree?.tree){
    const tuyaFiles=tree.tree.filter(f=>f.path.startsWith('zhaquirks/tuya/')&&f.path.endsWith('.py')).slice(0,30);
    for(const f of tuyaFiles){
      const content=await fetchText('https://raw.githubusercontent.com/zigpy/zha-device-handlers/dev/'+f.path);
      if(!content)continue;
      const found=extractFP(content);
      for(const fp of found)if(!devices.find(d=>d.fp===fp))devices.push({fp,source:'zha-quirk',file:f.path});
      await sleep(300);
    }
    console.log('  Total ZHA quirk FPs:',devices.length);
  }
  return devices;
}

// ====== ZHA: Issues ======
async function scanZHAIssues(){
  console.log('== ZHA Issues ==');
  const results=[];
  for(const q of['repo:zigpy/zha-device-handlers+tuya+state:open','repo:home-assistant/core+tuya+zigbee+state:open']){
    const d=await fetchJSON(GH+'/search/issues?q='+encodeURIComponent(q)+'&per_page=20&sort=created&order=desc',hdrs(TOKEN));
    if(!d||!d.items)continue;
    for(const iss of d.items){const found=extractFP((iss.title||'')+' '+(iss.body||''));
      if(found.length)results.push(...found.map(fp=>({fp,source:'zha-issue',num:iss.number,title:iss.title?.slice(0,80),url:iss.html_url})))}
    await sleep(2000);
  }
  console.log('  Found',results.length,'FP entries from ZHA issues');
  return results;
}

// ====== Blakadder: Full Zigbee DB ======
async function scanBlakadder(){
  console.log('== Blakadder ==');
  const data=await fetchJSON('https://zigbee.blakadder.com/assets/js/zigbee.json');
  if(!data||!Array.isArray(data))return[];
  const devices=[];
  for(const dev of data){
    if(!dev.manufacturerName||!dev.manufacturerName.startsWith('_T'))continue;
    devices.push({fp:dev.manufacturerName,model:dev.model,vendor:dev.vendor,zigbeeModel:dev.zigbeeModel,
      category:dev.category,image:dev.image,source:'blakadder'});
  }
  console.log('  Found',devices.length,'Tuya devices');
  return devices;
}

// ====== deCONZ: Device DB ======
async function scanDeCONZ(){
  console.log('== deCONZ ==');
  const devices=[];
  const tree=await fetchJSON(GH+'/repos/dresden-elektronik/deconz-rest-plugin/git/trees/master?recursive=1',hdrs(TOKEN));
  if(!tree?.tree)return devices;
  const jsonFiles=tree.tree.filter(f=>f.path.startsWith('devices/tuya')&&f.path.endsWith('.json')).slice(0,50);
  for(const f of jsonFiles){
    const content=await fetchText('https://raw.githubusercontent.com/dresden-elektronik/deconz-rest-plugin/master/'+f.path);
    if(!content)continue;
    const found=extractFP(content);
    for(const fp of found)devices.push({fp,source:'deconz',file:f.path});
    await sleep(200);
  }
  console.log('  Found',devices.length,'FP entries from deCONZ');
  return devices;
}

// ====== Hubitat: Community drivers ======
async function scanHubitat(){
  console.log('== Hubitat ==');
  const results=[];
  const d=await fetchJSON(GH+'/search/code?q=_TZE200+language:groovy&per_page=20',hdrs(TOKEN));
  if(d?.items){
    for(const item of d.items){
      const found=extractFP((item.name||'')+' '+(item.text_matches?.map(m=>m.fragment).join(' ')||''));
      for(const fp of found)results.push({fp,source:'hubitat',repo:item.repository?.full_name,file:item.name});
    }
  }
  await sleep(2000);
  console.log('  Found',results.length,'FP entries from Hubitat');
  return results;
}

// ====== Variant search: for each unsupported FP, find all known variants ======
async function searchVariants(unsupported,allDevices){
  console.log('== Variant Search ==');
  const variants=new Map();
  for(const fp of unsupported.slice(0,20)){
    const prefix=fp.substring(0,fp.lastIndexOf('_'));
    const related=allDevices.filter(d=>d.fp.startsWith(prefix)&&d.fp!==fp);
    if(related.length){variants.set(fp,{fp,prefix,variants:related.map(d=>({fp:d.fp,source:d.source,model:d.model||d.zigbeeModel}))});
      console.log('  '+fp+': '+related.length+' variants found')}
  }
  return variants;
}

// ====== Bug search: find associated bugs for FPs ======
async function searchBugs(targetFPs){
  console.log('== Bug Search ==');
  const bugs=[];
  for(const fp of targetFPs.slice(0,10)){
    const d=await fetchJSON(GH+'/search/issues?q='+encodeURIComponent(fp+' state:open')+'&per_page=5',hdrs(TOKEN));
    if(d?.items){for(const iss of d.items)bugs.push({fp,repo:iss.repository_url?.split('/').slice(-2).join('/'),num:iss.number,title:iss.title?.slice(0,80),url:iss.html_url})}
    await sleep(3000);
  }
  console.log('  Found',bugs.length,'associated bugs');
  return bugs;
}

async function main(){
  console.log('=== External Sources Scanner ===');
  console.log('App: v'+appVer,'| Known FPs:',fps.size);
  const state=loadState();
  const allDevices=[];

  // Collect from all sources
  const z2mConv=await scanZ2MConverters();allDevices.push(...z2mConv);await sleep(1000);
  const z2mIssues=await scanZ2MIssuesPRs();allDevices.push(...z2mIssues);await sleep(1000);
  const zhaQuirks=await scanZHAQuirks();allDevices.push(...zhaQuirks);await sleep(1000);
  const zhaIssues=await scanZHAIssues();allDevices.push(...zhaIssues);await sleep(1000);
  const blakadder=await scanBlakadder();allDevices.push(...blakadder);await sleep(1000);
  const deconz=await scanDeCONZ();allDevices.push(...deconz);await sleep(1000);
  const hubitat=await scanHubitat();allDevices.push(...hubitat);await sleep(1000);

  // Deduplicate and classify
  const byFP=new Map();
  for(const d of allDevices){if(!byFP.has(d.fp))byFP.set(d.fp,{fp:d.fp,sources:[],models:new Set()});
    const e=byFP.get(d.fp);e.sources.push(d.source);if(d.model)e.models.add(d.model);if(d.zigbeeModel)e.models.add(d.zigbeeModel)}
  const uniqueFPs=[...byFP.values()].map(d=>({...d,models:[...d.models],inApp:fps.has(d.fp),drivers:findAllDrivers(d.fp)}));
  const supported=uniqueFPs.filter(d=>d.inApp);
  const unsupported=uniqueFPs.filter(d=>!d.inApp);
  console.log('\n== Summary: '+uniqueFPs.length+' unique FPs | '+supported.length+' supported | '+unsupported.length+' unsupported ==');

  // Variant search for unsupported
  const variants=await searchVariants(unsupported.map(d=>d.fp),allDevices);await sleep(1000);

  // Bug search for top unsupported
  const bugs=await searchBugs(unsupported.slice(0,10).map(d=>d.fp));

  // AI analysis
  console.log('\n== AI Analysis ==');
  const aiInput={appVersion:appVer,totalKnown:fps.size,totalExternal:uniqueFPs.length,newCount:unsupported.length,
    topNew:unsupported.slice(0,15).map(d=>({fp:d.fp,sources:d.sources.slice(0,3),models:[...d.models].slice(0,2)})),
    variantCount:variants.size,bugCount:bugs.length,sources:{z2mConv:z2mConv.length,z2mIssues:z2mIssues.length,zhaQuirks:zhaQuirks.length,zhaIssues:zhaIssues.length,blakadder:blakadder.length,deconz:deconz.length,hubitat:hubitat.length}};
  const ai=await callAI(JSON.stringify(aiInput,null,2),'Analyze external Zigbee sources scan for Universal Tuya Zigbee app. Prioritize new devices by: 1) popularity (appears in multiple sources), 2) user demand. Suggest which driver each should use. Output markdown table + action items. Max 400 words.',{maxTokens:1024});

  // Save
  const data={timestamp:new Date().toISOString(),allDevices:uniqueFPs,unsupported,variants:Object.fromEntries(variants),bugs,aiAnalysis:ai?.text};
  fs.mkdirSync(path.dirname(DATA_F),{recursive:true});
  fs.writeFileSync(DATA_F,JSON.stringify(data,null,2)+'\n');
  const report={timestamp:data.timestamp,totalExternal:uniqueFPs.length,supported:supported.length,unsupported:unsupported.length,
    variantCount:variants.size,bugCount:bugs.length,sources:{z2mConv:z2mConv.length,z2mIssues:z2mIssues.length,zhaQuirks:zhaQuirks.length,
      zhaIssues:zhaIssues.length,blakadder:blakadder.length,deconz:deconz.length,hubitat:hubitat.length},
    topUnsupported:unsupported.slice(0,30).map(d=>({fp:d.fp,sources:[...new Set(d.sources)]})),aiAnalysis:ai?.text};
  fs.writeFileSync(REPORT_F,JSON.stringify(report,null,2)+'\n');
  saveState({lastRun:new Date().toISOString(),knownDevices:Object.fromEntries(uniqueFPs.slice(0,200).map(d=>[d.fp,d.sources[0]]))});

  console.log('\n=== Done ===');
  if(process.env.GITHUB_STEP_SUMMARY){
    let md='## External Sources Scanner\n| Source | FPs Found |\n|---|---|\n';
    md+='| Z2M Converters | '+z2mConv.length+' |\n| Z2M Issues/PRs | '+z2mIssues.length+' |\n';
    md+='| ZHA Quirks | '+zhaQuirks.length+' |\n| ZHA Issues | '+zhaIssues.length+' |\n';
    md+='| Blakadder | '+blakadder.length+' |\n| deCONZ | '+deconz.length+' |\n| Hubitat | '+hubitat.length+' |\n';
    md+='| **Total unique** | **'+uniqueFPs.length+'** |\n| **Unsupported** | **'+unsupported.length+'** |\n| **Variants found** | **'+variants.size+'** |\n| **Bugs found** | **'+bugs.length+'** |\n';
    if(ai?.text)md+='\n### AI Analysis\n'+ai.text+'\n';
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,md);
  }
}

main().catch(e=>{console.error('Fatal:',e.message);process.exit(1)});
