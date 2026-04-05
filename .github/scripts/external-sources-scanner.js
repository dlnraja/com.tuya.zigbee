#!/usr/bin/env node
'use strict';
/**
 * External Sources Scanner - Comprehensive scan of ALL Zigbee community sources
 * - Z2M converters (full device DB) + issues + PRs
 * - ZHA quirks (full quirk DB) + issues
 * - Blakadder new devices DB
 * - deCONZ device DB
 * - Hubitat community drivers
 * - HOMEd Tuya device library (u236, Russian Zigbee community)
 * - For each device: search for ALL variants, associated bugs
 * - Cross-references everything with our fingerprint DB
 */
const fs=require('fs'),path=require('path');
const{callAI}=require('./ai-helper');
const{loadFingerprints,findAllDrivers,extractMfrFromText}=require('./load-fingerprints');
const{fetchWithRetry}=require('./retry-helper');
const{scanHOMEd}=require('./scan-homed');
const{extractFP:_extractFPValid,extractFPWithBrands:_extractFPBrands,extractPID:_extractPIDValid}=require('./fp-validator');

const GH='https://api.github.com';
const TOKEN=process.env.GH_PAT||process.env.GITHUB_TOKEN;
const STATE_F=path.join(__dirname,'..','state','external-sources-state.json');
const REPORT_F=path.join(__dirname,'..','state','external-sources-report.json');
const DATA_F=path.join(__dirname,'..','state','external-sources-data.json');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const extractFP=_extractFPBrands;
const extractPID=_extractPIDValid;
const extractDPs=t=>[...new Set((t||'').match(/(?:dp|DP|datapoint|dataPoints)[:\s=]*(\d{1,3})/gi||[]).map(m=>parseInt(m.match(/\d+/)?.[0])).filter(n=>n>0&&n<256))];
const extractCaps=t=>[...new Set((t||'').match(/e\.(binary|numeric|enum|text)\(['"]([^'"]+)/g||[]).map(m=>{const p=m.match(/\(['"]([^'"]+)/);return p?p[1]:null}).filter(Boolean))];
const extractBugSignals=t=>/bug|fix|wrong|incorrect|broken|not.work|invert|reverse|swap/i.test(t||'');
const extractQuirkSignals=t=>/quirk|workaround|hack|special|override|patch|custom/i.test(t||'');
const getSnippet=(code,fp,before=300,after=600)=>{const i=code.indexOf(fp);if(i<0)return'';return code.substring(Math.max(0,i-before),Math.min(code.length,i+after)).trim().slice(0,900)};
let appVer='?';try{appVer=JSON.parse(fs.readFileSync(path.join(__dirname,'..','..','app.json'),'utf8')).version}catch{}
const fps=loadFingerprints();
const hdrs=t=>({Accept:'application/vnd.github+json','User-Agent':'tuya-ext-scanner',...(t?{Authorization:'Bearer '+t}:{})});
const DDIR=path.join(__dirname,'..','..','drivers');
const FUNC_F=path.join(__dirname,'..','state','device-functionality.json');

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
    'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/sonoff.ts',
  ];
  for(const url of urls){
    const src=await fetchText(url);
    if(!src)continue;
    // Extract fingerprints WITH their DP mappings, capabilities, code context
    const fpMatches=src.match(/fingerprint:\s*\[[\s\S]*?\]/g)||[];
    for(const block of fpMatches){
      const mfrs=extractFP(block);
      const models=[...new Set((block.match(/modelID:\s*'([^']+)'/g)||[]).map(m=>m.replace(/modelID:\s*'/,'').replace(/'/,'')))];
      for(const fp of mfrs){
        const ctx=getSnippet(src,fp,1500,3000);
        const dps=extractDPs(ctx);
        const caps=extractCaps(ctx);
        const snippet=getSnippet(src,fp,300,600);
        // Pair each fp with each modelID — same mfr can have different DPs per productId
        for(const pid of(models.length?models:['?']))devices.push({fp,pid,source:'z2m-converter',dps,caps,snippet});
      }
    }
    // Also extract inline fingerprints with context
    const inlineFPs=extractFP(src);
    for(const fp of inlineFPs)if(!devices.find(d=>d.fp===fp)){
      const ctx=getSnippet(src,fp,1500,3000);
      const dps=extractDPs(ctx);const caps=extractCaps(ctx);
      const pids=extractPID(ctx);
      devices.push({fp,pid:pids[0]||null,source:'z2m-converter',dps,caps});
    }
    console.log('  Parsed',devices.length,'device entries from',url.split('/').pop(),',',devices.filter(d=>d.dps?.length).length,'with DPs');
  }
  return devices;
}

// ====== Z2M: Issues + PRs with Tuya devices ======
async function scanZ2MIssuesPRs(sinceQuery){
  console.log('== Z2M Issues & PRs ==');
  const results=[];
  const queries=['repo:Koenkk/zigbee2mqtt+_TZE+state:open','repo:Koenkk/zigbee2mqtt+tuya+state:open','repo:Koenkk/zigbee-herdsman-converters+tuya+state:open','repo:Koenkk/zigbee-herdsman-converters+_TZE+state:open','repo:Koenkk/zigbee-herdsman-converters+SNZB+state:open','repo:Koenkk/zigbee2mqtt+sonoff+state:open'];
  for(const q of queries){
    const d=await fetchJSON(GH+'/search/issues?q='+encodeURIComponent(q + sinceQuery)+'&per_page=30&sort=updated&order=desc',hdrs(TOKEN));
    if(!d||!d.items)continue;
    for(const iss of d.items){
      const text=(iss.title||'')+' '+(iss.body||'');
      const found=extractFP(text);
      if(found.length){
        const dps=extractDPs(text);const pids=extractPID(text);
        const isBug=extractBugSignals(text);
        const isQuirk=extractQuirkSignals(text);
        results.push(...found.map(fp=>({fp,pid:pids[0]||null,source:'z2m-issue',num:iss.number,title:iss.title?.slice(0,80),url:iss.html_url,isPR:!!iss.pull_request,dps,isBug,isQuirk})));
      }
    }
    await sleep(2000);
  }
  console.log('  Found',results.length,'FP entries from Z2M issues/PRs (Incremental)');
  return results;
}

// ====== ZHA: Quirks database ======
async function scanZHAQuirks(){
  console.log('== ZHA Quirks ==');
  const devices=[];
  const src=await fetchText('https://raw.githubusercontent.com/zigpy/zha-device-handlers/dev/zhaquirks/tuya/__init__.py');
  if(src){const found=extractFP(src);for(const fp of found){
    const ctx=getSnippet(src,fp,800,1500);
    const dps=extractDPs(ctx);const pids=extractPID(ctx);
    devices.push({fp,pid:pids[0]||null,source:'zha-quirk',dps});
  }console.log('  Main tuya init:',found.length,'FPs')}
  // Also scan individual quirk files — extract DPs, clusters, code
  const tree=await fetchJSON(GH+'/repos/zigpy/zha-device-handlers/git/trees/dev?recursive=1',hdrs(TOKEN));
  if(tree?.tree){
    const tuyaFiles=tree.tree.filter(f=>(f.path.startsWith('zhaquirks/tuya/')||f.path.startsWith('zhaquirks/sonoff/'))&&f.path.endsWith('.py')).slice(0,50);
    for(const f of tuyaFiles){
      const content=await fetchText('https://raw.githubusercontent.com/zigpy/zha-device-handlers/dev/'+f.path);
      if(!content)continue;
      const found=extractFP(content);
      for(const fp of found)if(!devices.find(d=>d.fp===fp&&d.pid)){
        const ctx=getSnippet(content,fp,800,1500);
        const dps=extractDPs(ctx);const pids=extractPID(ctx);
        const clusters=[...new Set((ctx.match(/0x[0-9A-Fa-f]{4}/g)||[]))].slice(0,10);
        const snippet=getSnippet(content,fp,200,400);
        devices.push({fp,pid:pids[0]||null,source:'zha-quirk',file:f.path,dps,clusters,snippet});
      }
      await sleep(300);
    }
    console.log('  Total ZHA quirk FPs:',devices.length,', with DPs:',devices.filter(d=>d.dps?.length).length);
  }
  return devices;
}

// ====== ZHA: Issues ======
async function scanZHAIssues(sinceQuery){
  console.log('== ZHA Issues ==');
  const results=[];
  for(const q of['repo:zigpy/zha-device-handlers+tuya+state:open','repo:home-assistant/core+tuya+zigbee+state:open']){
    const d=await fetchJSON(GH+'/search/issues?q='+encodeURIComponent(q + sinceQuery)+'&per_page=20&sort=updated&order=desc',hdrs(TOKEN));
    if(!d||!d.items)continue;
    for(const iss of d.items){const text=(iss.title||'')+' '+(iss.body||'');const found=extractFP(text);
      if(found.length){const dps=extractDPs(text);const pids=extractPID(text);const isBug=extractBugSignals(text);
        results.push(...found.map(fp=>({fp,pid:pids[0]||null,source:'zha-issue',num:iss.number,title:iss.title?.slice(0,80),url:iss.html_url,dps,isBug})))}}
    await sleep(2000);
  }
  console.log('  Found',results.length,'FP entries from ZHA issues (Incremental)');
  return results;
}

// ====== Blakadder: Full Zigbee DB ======
async function scanBlakadder(){
  console.log('== Blakadder ==');
  const data=await fetchJSON('https://zigbee.blakadder.com/assets/js/zigbee.json');
  if(!data||!Array.isArray(data))return[];
  const devices=[];
  for(const dev of data){
    if(!dev.manufacturerName||(!dev.manufacturerName.startsWith('_T')&&!/^(SONOFF|eWeLink|EWELINK)$/i.test(dev.manufacturerName)))continue;
    devices.push({fp:dev.manufacturerName,pid:dev.zigbeeModel||null,model:dev.model,vendor:dev.vendor,zigbeeModel:dev.zigbeeModel,
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
  const jsonFiles=tree.tree.filter(f=>(f.path.startsWith('devices/tuya')||f.path.startsWith('devices/sonoff')||f.path.startsWith('devices/ewelink'))&&f.path.endsWith('.json')).slice(0,80);
  for(const f of jsonFiles){
    const content=await fetchText('https://raw.githubusercontent.com/dresden-elektronik/deconz-rest-plugin/master/'+f.path);
    if(!content)continue;
    const found=extractFP(content);
    for(const fp of found){
      let clusters=[],config=[],pid=null;
      try{const j=JSON.parse(content);clusters=(j.clusters||[]).map(c=>c.id||c);config=(j.config||[]).slice(0,8);pid=j.modelid||j.modelId||null}catch{}
      devices.push({fp,pid,source:'deconz',file:f.path,clusters,config});
    }
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
      const fragments=(item.text_matches?.map(m=>m.fragment).join(' ')||'');
      const found=extractFP((item.name||'')+' '+fragments);
      const dps=extractDPs(fragments);const pids=extractPID(fragments);
      for(const fp of found)results.push({fp,pid:pids[0]||null,source:'hubitat',repo:item.repository?.full_name,file:item.name,dps});
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
  for(const entry of unsupported.slice(0,25)){
    const fp=entry.fp,pid=entry.pid;
    const prefix=fp.substring(0,fp.lastIndexOf('_'));
    const related=allDevices.filter(d=>d.fp.startsWith(prefix)&&(d.fp!==fp||d.pid!==pid));
    const key=fp+'|'+(pid||'?');
    if(related.length){variants.set(key,{fp,pid,prefix,variants:related.map(d=>({fp:d.fp,pid:d.pid,source:d.source,model:d.model||d.zigbeeModel,dps:d.dps||[],caps:d.caps||[],category:d.category}))});
      console.log('  '+key+': '+related.length+' variants (DPs: '+related.filter(r=>r.dps?.length).length+')')}
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

// ====== SmartThings: Community DTH handlers ======
async function scanSmartThings(){
  console.log('== SmartThings ==');
  const results=[];
  const d=await fetchJSON(GH+'/search/code?q=_TZE200+tuya+zigbee+language:groovy&per_page=10',hdrs(TOKEN));
  if(d?.items){for(const item of d.items){
    const fragments=(item.text_matches?.map(m=>m.fragment).join(' ')||'');
    const found=extractFP((item.name||'')+' '+fragments);
    const dps=extractDPs(fragments);const pids=extractPID(fragments);
    for(const fp of found)results.push({fp,pid:pids[0]||null,source:'smartthings',repo:item.repository?.full_name,dps});
  }}
  await sleep(2000);
  console.log('  Found',results.length,'FP entries from SmartThings');
  return results;
}

// ====== HA Community Forum: Device discussions ======
async function scanHAForum(){
  console.log('== HA Forum ==');
  const results=[];
  for(const q of['tuya zigbee DP','TZE200 tuya datapoint','TZE204 tuya']){
    try{
      const r=await fetchJSON('https://community.home-assistant.io/search.json?q='+encodeURIComponent(q)+'&order=latest');
      if(!r?.topics)continue;
      for(const t of(r.topics||[]).slice(0,10)){
        const txt=(t.title||'')+' '+(t.blurb||'');
        const found=extractFP(txt);const dps=extractDPs(txt);const pids=extractPID(txt);
        for(const fp of found)results.push({fp,pid:pids[0]||null,source:'ha-forum',title:t.title?.slice(0,80),topicId:t.id,dps});
      }
    }catch{}
    await sleep(1000);
  }
  console.log('  Found',results.length,'FP entries from HA Forum');
  return results;
}

// ====== Local: Our driver analysis (DPs, caps, gaps) ======
function scanLocalDrivers(){
  console.log('== Local Drivers ==');
  const results=[];
  if(!fs.existsSync(DDIR))return results;
  for(const d of fs.readdirSync(DDIR)){
    const cf=path.join(DDIR,d,'driver.compose.json'),df=path.join(DDIR,d,'device.js');
    if(!fs.existsSync(cf))continue;
    try{
      const c=JSON.parse(fs.readFileSync(cf,'utf8'));
      const mfrs=c.zigbee?.manufacturerName||[];
      const pids=c.zigbee?.productId||[];
      const caps=c.capabilities||[];
      let dps=[],hasEF00=false,hasDPMappings=false;
      if(fs.existsSync(df)){
        const src=fs.readFileSync(df,'utf8');
        dps=extractDPs(src);
        hasEF00=/0xEF00|61184|EF00|TuyaSpecific/i.test(src);
        hasDPMappings=/dpMappings|dp_mappings|dataPoints/i.test(src);
      }
      // Emit one entry per mfr×pid pair — same mfr with different pids = different device!
      for(const fp of mfrs)for(const pid of(pids.length?pids:['?']))results.push({fp,pid,source:'local',driver:d,caps,dps,hasEF00,hasDPMappings});
    }catch{}
  }
  console.log('  Found',results.length,'local FP entries across',new Set(results.map(r=>r.driver)).size,'drivers');
  return results;
}

async function main(){
  console.log('=== External Sources Scanner (10-source, smart functionality) ===');
  console.log('App: v'+appVer,'| Known FPs:',fps.size);
  const state=loadState();
  const sinceQuery = state.lastRun ? ` updated:>${state.lastRun.split('T')[0]}` : '';
  const allDevices=[];

  // Collect from all sources
  const z2mConv=await scanZ2MConverters();allDevices.push(...z2mConv);await sleep(1000);
  const z2mIssues=await scanZ2MIssuesPRs(sinceQuery);allDevices.push(...z2mIssues);await sleep(1000);
  const zhaQuirks=await scanZHAQuirks();allDevices.push(...zhaQuirks);await sleep(1000);
  const zhaIssues=await scanZHAIssues(sinceQuery);allDevices.push(...zhaIssues);await sleep(1000);
  const blakadder=await scanBlakadder();allDevices.push(...blakadder);await sleep(1000);
  const deconz=await scanDeCONZ();allDevices.push(...deconz);await sleep(1000);
  const hubitat=await scanHubitat();allDevices.push(...hubitat);await sleep(1000);
  const smartthings=await scanSmartThings();allDevices.push(...smartthings);await sleep(1000);
  const homed=await scanHOMEd();allDevices.push(...homed);await sleep(1000);
  const haForum=await scanHAForum();allDevices.push(...haForum);await sleep(1000);
  const local=scanLocalDrivers();allDevices.push(...local);

  // Deduplicate by COMPOSITE KEY: fp|pid (manufacturerName|productId)
  // CRITICAL: same mfr with different pids = DIFFERENT device with DIFFERENT DPs!
  const byKey=new Map();
  for(const d of allDevices){
    const key=d.fp+'|'+(d.pid||'?');
    if(!byKey.has(key))byKey.set(key,{fp:d.fp,pid:d.pid||null,sources:[],models:new Set(),dps:new Set(),caps:new Set(),clusters:new Set(),bugs:[],quirks:[],snippets:[],localDriver:null,localCaps:[],localDPs:[]});
    const e=byKey.get(key);
    e.sources.push(d.source);
    if(d.model)e.models.add(d.model);if(d.zigbeeModel)e.models.add(d.zigbeeModel);
    if(d.dps)for(const n of(Array.isArray(d.dps)?d.dps:[]))e.dps.add(n);
    if(d.caps)for(const c of(Array.isArray(d.caps)?d.caps:[]))e.caps.add(c);
    if(d.clusters)for(const c of(Array.isArray(d.clusters)?d.clusters:[]))e.clusters.add(c);
    if(d.isBug)e.bugs.push({src:d.source,num:d.num,title:d.title,url:d.url});
    if(d.isQuirk||d.quirks)e.quirks.push({src:d.source,note:d.title||''});
    if(d.snippet&&e.snippets.length<5)e.snippets.push({src:d.source,code:d.snippet});
    if(d.category)e.caps.add('category:'+d.category);
    if(d.source==='local'){e.localDriver=d.driver;e.localCaps=d.caps||[];e.localDPs=d.dps||[]}
  }
  const uniqueFPs=[...byKey.values()].map(d=>({...d,models:[...d.models],dps:[...d.dps],caps:[...d.caps],clusters:[...d.clusters],sources:[...new Set(d.sources)],inApp:fps.has(d.fp),drivers:findAllDrivers(d.fp)}));
  const supported=uniqueFPs.filter(d=>d.inApp);
  const unsupported=uniqueFPs.filter(d=>!d.inApp);
  console.log('\n== Summary: '+uniqueFPs.length+' unique FPs | '+supported.length+' supported | '+unsupported.length+' unsupported ==');

  // Variant search for unsupported (pass objects with fp+pid)
  const variants=await searchVariants(unsupported,allDevices);await sleep(1000);

  // Bug search for top unsupported
  const bugs=await searchBugs(unsupported.slice(0,10).map(d=>d.fp));

  // Smart AI: implementation plans with DP→capability + quirks + variants
  console.log('\n== AI Implementation Analysis (Cascaded Context) ==');
  const withDPs=uniqueFPs.filter(d=>d.dps.length>0);
  const gapDevs=supported.filter(d=>{const ext=d.dps.filter(n=>!d.localDPs.includes(n));return ext.length>0}).slice(0,10);
  const topNew=unsupported.filter(d=>d.dps.length>0||d.sources.length>=2).slice(0,15);
  
  // Provide the PREVIOUS AI plan as context (cascade method) to save AI reasoning
  const previousPlan = state.lastPlan ? `\nPREVIOUS PLAN RESULTS (do not repeat, just update):\n${state.lastPlan.slice(0,2000)}\n` : '';

  const aiInput={v:appVer,known:fps.size,ext:uniqueFPs.length,
    newDevs:topNew.map(d=>({fp:d.fp,pid:d.pid,dps:d.dps,caps:d.caps.slice(0,6),src:d.sources,bugs:d.bugs.length})),
    gaps:gapDevs.map(d=>({fp:d.fp,pid:d.pid,drv:d.localDriver,missDPs:d.dps.filter(n=>!d.localDPs.includes(n)),missCaps:d.caps.filter(c=>!c.startsWith('cat')).slice(0,5)})),
    src:{z2m:z2mConv.length,zha:zhaQuirks.length,blak:blakadder.length,dec:deconz.length,hub:hubitat.length,st:smartthings.length,ha:haForum.length,loc:local.length}};
  
  const aiPrompt=`Tuya Zigbee expert. For each new device: suggest driver, DP→capability map, quirks. For gaps: missing DPs to add. Markdown table. Max 500 words. IMPORTANT: Cascade intel.${previousPlan}`;
  const ai=await callAI(JSON.stringify(aiInput),aiPrompt,{maxTokens:1500});

  // Save full device functionality
  const data={timestamp:new Date().toISOString(),allDevices:uniqueFPs.slice(0,500),unsupported:unsupported.slice(0,200),withDPs:withDPs.length,gaps:gapDevs,variants:Object.fromEntries(variants),bugs,aiPlan:ai?.text};
  fs.mkdirSync(path.dirname(DATA_F),{recursive:true});
  fs.writeFileSync(DATA_F,JSON.stringify(data,null,2)+'\n');
  // Save device functionality profiles
  fs.writeFileSync(FUNC_F,JSON.stringify({ts:data.timestamp,total:uniqueFPs.length,withDPs:withDPs.length,gaps:gapDevs.length,
    profiles:uniqueFPs.filter(d=>d.dps.length||d.bugs.length).slice(0,200).map(d=>({fp:d.fp,pid:d.pid,dps:d.dps,caps:d.caps.slice(0,10),src:d.sources,bugs:d.bugs.length,drv:d.localDriver,lDPs:d.localDPs})),
    aiPlan:ai?.text},null,2)+'\n');
  const sc={z2mConv:z2mConv.length,z2mIss:z2mIssues.length,zha:zhaQuirks.length,zhaIss:zhaIssues.length,blak:blakadder.length,dec:deconz.length,hub:hubitat.length,st:smartthings.length,homed:homed.length,ha:haForum.length,loc:local.length};
  const report={timestamp:data.timestamp,totalExternal:uniqueFPs.length,supported:supported.length,unsupported:unsupported.length,
    withDPs:withDPs.length,gapsInSupported:gapDevs.length,variantCount:variants.size,bugCount:bugs.length,sources:sc,
    topUnsupported:unsupported.slice(0,30).map(d=>({fp:d.fp,pid:d.pid,dps:d.dps,sources:d.sources})),aiPlan:ai?.text};
  fs.writeFileSync(REPORT_F,JSON.stringify(report,null,2)+'\n');
  saveState({lastRun:new Date().toISOString(),knownDevices:Object.fromEntries(uniqueFPs.slice(0,200).map(d=>[d.fp,d.sources[0]])),lastPlan:ai?.text||state.lastPlan});

  console.log('\n=== Done (11 sources) ===');
  console.log('With DPs:',withDPs.length,'| Gaps in supported:',gapDevs.length);
  if(process.env.GITHUB_STEP_SUMMARY){
    let md='## 11-Source Device Functionality Scanner\n| Source | FPs | With DPs |\n|---|---|---|\n';
    md+='| Z2M Converters | '+z2mConv.length+' | '+z2mConv.filter(d=>d.dps?.length).length+' |\n';
    md+='| Z2M Issues/PRs | '+z2mIssues.length+' | '+z2mIssues.filter(d=>d.dps?.length).length+' |\n';
    md+='| ZHA Quirks | '+zhaQuirks.length+' | '+zhaQuirks.filter(d=>d.dps?.length).length+' |\n';
    md+='| ZHA Issues | '+zhaIssues.length+' | '+zhaIssues.filter(d=>d.dps?.length).length+' |\n';
    md+='| Blakadder | '+blakadder.length+' | — |\n| deCONZ | '+deconz.length+' | — |\n';
    md+='| Hubitat | '+hubitat.length+' | '+hubitat.filter(d=>d.dps?.length).length+' |\n';
    md+='| SmartThings | '+smartthings.length+' | '+smartthings.filter(d=>d.dps?.length).length+' |\n';
    md+='| HOMEd | '+homed.length+' | '+homed.filter(d=>d.dps?.length).length+' |\n';
    md+='| HA Forum | '+haForum.length+' | '+haForum.filter(d=>d.dps?.length).length+' |\n';
    md+='| Local Drivers | '+local.length+' | '+local.filter(d=>d.dps?.length).length+' |\n';
    md+='| **Total unique** | **'+uniqueFPs.length+'** | **'+withDPs.length+'** |\n';
    md+='| **Unsupported** | **'+unsupported.length+'** | |\n';
    md+='| **Gaps in supported** | **'+gapDevs.length+'** | |\n';
    md+='| **Variants** | **'+variants.size+'** | |\n| **Bugs** | **'+bugs.length+'** | |\n';
    if(ai?.text)md+='\n### AI Implementation Plan\n'+ai.text+'\n';
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,md);
  }
}

main().catch(e=>{console.error('Fatal:',e.message);process.exit(1)});
