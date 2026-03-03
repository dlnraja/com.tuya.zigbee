#!/usr/bin/env node
'use strict';
/**
 * Master AI Battle Orchestrator v1.0
 * Combines ALL intelligence sources + multi-AI ensemble for fingerprint
 * discovery, variant generation, cross-referencing and auto-implementation.
 */
const fs=require('fs'),path=require('path');
const DDIR=path.join(__dirname,'..','..','drivers');
const STATE=path.join(__dirname,'..','state');
const REPORT=path.join(STATE,'ai-battle-report.json');
const DRY=process.env.DRY_RUN==='true';
const loadJ=f=>{try{return JSON.parse(fs.readFileSync(f,'utf8'))}catch{return null}};
const saveJ=(f,d)=>{fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,JSON.stringify(d,null,2)+'\n')};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let ens,fpEng;
try{ens=require('./ai-ensemble')}catch{ens=null}
try{fpEng=require('./fp-research-engine')}catch{fpEng=null}
const TOKEN=process.env.GH_PAT||process.env.GITHUB_TOKEN;
const ghH=()=>{const h={Accept:'application/vnd.github+json','User-Agent':'tuya-ai-battle'};if(TOKEN)h.Authorization='Bearer '+TOKEN;return h};

// === VARIANT GROUPS (prefix swaps) ===
const VGROUPS=[['_TZE200_','_TZE204_','_TZE284_'],['_TZ3000_','_TZ3210_','_TZ3400_'],['_TYZB01_','_TYST11_']];
function generateVariants(fp){
  const vars=[];if(!fp)return vars;
  for(const g of VGROUPS){const pfx=g.find(p=>fp.startsWith(p));
    if(pfx){const suffix=fp.slice(pfx.length);for(const p of g){if(p!==pfx)vars.push(p+suffix)}}}
  return vars;
}

// === BUILD DRIVER INDEX ===
function buildDriverIndex(){
  const mIdx=new Map(),pIdx=new Map(),meta=new Map();
  if(!fs.existsSync(DDIR))return{mIdx,pIdx,meta};
  for(const d of fs.readdirSync(DDIR)){
    const f=path.join(DDIR,d,'driver.compose.json');if(!fs.existsSync(f))continue;
    try{const j=JSON.parse(fs.readFileSync(f,'utf8'));
      const mfrs=j.zigbee?.manufacturerName||[],pids=j.zigbee?.productId||[];
      meta.set(d,{mfrs,pids,caps:j.capabilities||[],cls:j.class||'other',path:f});
      for(const m of mfrs){if(!mIdx.has(m))mIdx.set(m,[]);if(!mIdx.get(m).includes(d))mIdx.get(m).push(d)}
      for(const p of pids){if(!pIdx.has(p))pIdx.set(p,[]);if(!pIdx.get(p).includes(d))pIdx.get(p).push(d)}
    }catch{}
  }
  return{mIdx,pIdx,meta};
}

// === PSEUDONYMIZE (emails, usernames) ===
const _pCache=new Map();let _pIdx=0;
function pseudonymize(str){
  if(!str)return str;
  return str.replace(/[\w.-]+@[\w.-]+\.\w+/g,m=>{if(!_pCache.has(m))_pCache.set(m,'user_'+(_pIdx++));return _pCache.get(m)+'@redacted'})
    .replace(/(?:ieee|mac)[:\s]*([0-9a-f:]{17,23})/gi,'ieee:XX:XX:XX:XX:XX:XX:XX:XX')
    .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,'X.X.X.X');
}

// === GATHER ALL INTELLIGENCE FROM STATE FILES ===
function gatherAllIntel(){
  const intel={};
  // External sources (Z2M, ZHA, Blakadder, deCONZ, Hubitat)
  const ext=loadJ(path.join(STATE,'external-sources-report.json'));
  if(ext){intel.external={total:ext.totalExternal||0,supported:ext.supported||0,unsupported:ext.unsupported||0,
    topUnsupported:(ext.topUnsupported||[]).slice(0,50).map(u=>({fp:u.fp,src:u.sources,pid:u.pid})),
    newFPs:(ext.newFPs||[]).slice(0,100)}}
  // GitHub scan
  const gh=loadJ(path.join(STATE,'github-scan-report.json'));
  if(gh&&gh.findings){
    intel.github={issues:(gh.findings.issues||[]).filter(i=>i.state==='open').slice(0,20),
      prs:(gh.findings.prs||[]).filter(p=>p.state==='open').slice(0,20),
      newFPs:gh.findings.newFPs||[]}}
  // Fork scan
  const forks=loadJ(path.join(STATE,'fork-scan-state.json'));
  if(forks)intel.forks={newFPs:Array.isArray(forks.newFPs)?forks.newFPs:[]};
  // JohanBendz
  const johan=loadJ(path.join(STATE,'johan-full-scan.json'));
  if(johan)intel.johan={allNewFPs:(johan.allNewFPs||[]).slice(0,50)};
  // Enrichment
  const enr=loadJ(path.join(STATE,'enrichment-report.json'));
  if(enr)intel.enrichment={newDevices:enr.newDevices||0,newDPs:enr.newDPs||0};
  // Comp scan
  const comp=loadJ(path.join(STATE,'comprehensive-scan.json'));
  if(comp)intel.compScan={newFPs:comp.newFPs||[],fromForks:comp.fromForks||[]};
  // FP research
  const fpR=loadJ(path.join(STATE,'fp-research-results.json'));
  if(fpR)intel.fpResearch=fpR;
  // Variant scan
  const vs=loadJ(path.join(STATE,'variant-scan-results.json'));
  if(vs)intel.variantScan=vs;
  // Gmail diagnostics (pseudonymized)
  const gm=loadJ(path.join(STATE,'gmail-diagnostics.json'));
  if(gm){intel.gmail={count:gm.processed||gm.total||0,
    fps:(gm.fingerprints||gm.fps||[]).map(f=>({fp:f.fp||f.manufacturerName,pid:f.pid||f.productId,issue:pseudonymize(f.issue||f.subject||'')}))}}
  // Deep search
  const ds=loadJ(path.join(STATE,'github-deep-search.json'));
  if(ds)intel.deepSearch={newFPs:ds.newFPs||[],fromProjects:ds.fromProjects||[]};
  // Pattern data
  const pat=loadJ(path.join(STATE,'pattern-data.json'));
  if(pat)intel.patterns=pat;
  // Forum intel
  const fi=loadJ(path.join(STATE,'forum-intel.json'));
  if(fi)intel.forumIntel={fps:fi.fingerprints||[],deviceRequests:fi.deviceRequests||[]};
  // Diagnostics
  const diag=loadJ(path.join(STATE,'diagnostics-aggregated.json'));
  if(diag)intel.diagnostics={devices:diag.devices||[],issues:diag.issues||[]};
  return intel;
}

// === GITHUB SEARCH API (find variants in the wild) ===
let ghCalls=0;const MAX_GH=parseInt(process.env.MAX_GH_CALLS||'100');
async function ghSearch(endpoint,query,perPage){
  if(!TOKEN||ghCalls>=MAX_GH)return null;ghCalls++;
  await sleep(2500);
  try{const u='https://api.github.com/search/'+endpoint+'?q='+encodeURIComponent(query)+'&per_page='+(perPage||5);
    const r=await fetch(u,{headers:ghH(),signal:AbortSignal.timeout(15000)});
    if(r.ok)return r.json();
    if(r.status===403||r.status===429){console.log('  [GH] Rate limited, sleeping 60s');await sleep(60000)}
    return null;
  }catch{return null}
}

// === Z2M RAW (cached) ===
let _z2mCache=null;
async function getZ2MRaw(){
  if(_z2mCache)return _z2mCache;
  const cf=path.join(STATE,'z2m-tuya-raw.txt');
  try{const st=fs.statSync(cf);if(Date.now()-st.mtimeMs<86400000){_z2mCache=fs.readFileSync(cf,'utf8');return _z2mCache}}catch{}
  try{const r=await fetch('https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/tuya.ts',
    {headers:{'User-Agent':'tuya-ai-battle'},signal:AbortSignal.timeout(30000)});
    if(r.ok){_z2mCache=await r.text();try{fs.mkdirSync(STATE,{recursive:true});fs.writeFileSync(cf,_z2mCache)}catch{}}
  }catch{}_z2mCache=_z2mCache||'';return _z2mCache;
}

// === ZHA QUIRKS (cached) ===
let _zhaCache=null;
async function getZHAQuirks(){
  if(_zhaCache)return _zhaCache;
  const cf=path.join(STATE,'zha-tuya-raw.txt');
  try{const st=fs.statSync(cf);if(Date.now()-st.mtimeMs<86400000){_zhaCache=fs.readFileSync(cf,'utf8');return _zhaCache}}catch{}
  try{
    const urls=['https://raw.githubusercontent.com/zigpy/zha-device-handlers/dev/zhaquirks/tuya/__init__.py',
      'https://raw.githubusercontent.com/zigpy/zha-device-handlers/dev/zhaquirks/tuya/ts0601_electric.py'];
    const parts=[];
    for(const u of urls){try{const r=await fetch(u,{headers:{'User-Agent':'tuya-ai-battle'},signal:AbortSignal.timeout(15000)});
      if(r.ok)parts.push(await r.text())}catch{}}
    _zhaCache=parts.join('\n');
    try{fs.mkdirSync(STATE,{recursive:true});fs.writeFileSync(cf,_zhaCache)}catch{}
  }catch{}_zhaCache=_zhaCache||'';return _zhaCache;
}

// === BLAKADDER SEARCH ===
async function searchBlakadder(fp){
  try{const r=await fetch('https://zigbee.blakadder.com/assets/js/devicelist.json',
    {headers:{'User-Agent':'tuya-ai-battle'},signal:AbortSignal.timeout(15000)});
    if(!r.ok)return[];const data=await r.json();
    return(Array.isArray(data)?data:[]).filter(d=>(d.zigbeeModel||'').includes(fp)||(d.manufacturerName||'').includes(fp));
  }catch{return[]}
}

// === VERIFY VARIANT EXISTS IN EXTERNAL SOURCES ===
async function verifyVariantExists(fp){
  const sources=[];
  // Z2M check
  const z2m=await getZ2MRaw();
  if(z2m&&z2m.includes(fp))sources.push('z2m');
  // ZHA check
  const zha=await getZHAQuirks();
  if(zha&&zha.includes(fp))sources.push('zha');
  // Blakadder
  const bl=await searchBlakadder(fp);
  if(bl&&bl.length)sources.push('blakadder');
  // GitHub code search
  if(TOKEN&&ghCalls<MAX_GH){
    const res=await ghSearch('code',fp+' language:json OR language:python OR language:typescript',3);
    if(res&&res.total_count>0)sources.push('github('+res.total_count+')');}
  // GitHub issues
  if(TOKEN&&ghCalls<MAX_GH){
    const res=await ghSearch('issues',fp,3);
    if(res&&res.total_count>0)sources.push('gh-issues('+res.total_count+')');}
  return sources;
}

// === ADD FINGERPRINT TO DRIVER ===
function addFPToDriver(driverName,fp){
  const f=path.join(DDIR,driverName,'driver.compose.json');
  if(!fs.existsSync(f))return false;
  try{const j=JSON.parse(fs.readFileSync(f,'utf8'));
    if(!j.zigbee||!j.zigbee.manufacturerName)return false;
    if(j.zigbee.manufacturerName.includes(fp))return false;
    j.zigbee.manufacturerName.push(fp);
    j.zigbee.manufacturerName.sort();
    if(!DRY)fs.writeFileSync(f,JSON.stringify(j,null,2)+'\n');
    console.log('  [ADD] '+fp+' -> '+driverName+(DRY?' (dry)':''));
    return true;
  }catch{return false}
}

// === AI ENSEMBLE: Multi-AI analysis with voting ===
async function aiAnalyze(task,context,maxTokens){
  if(!ens)return null;
  const providers=ens.pickForTask(task,3);
  if(!providers.length){console.log('  [AI] No providers available');return null}
  const results=[];
  const sysPrompt='You are a Tuya Zigbee device expert. Analyze fingerprints, classify devices, find variants. Be concise JSON only.';
  for(const p of providers){
    try{const r=await ens.qc(p,context,sysPrompt,maxTokens||1500);
      if(r)results.push({provider:p,result:r})}catch(e){console.log('  [AI] '+p+': '+e.message)}
  }
  return results;
}

// === PHASE 1: Collect all known FPs and find missing variants ===
async function phase1_variants(idx){
  console.log('\n=== PHASE 1: Variant Discovery ===');
  const{mIdx,meta}=idx;const allFPs=[...mIdx.keys()];
  const missing=[];let checked=0;
  for(const fp of allFPs){
    const variants=generateVariants(fp);
    for(const v of variants){
      if(!mIdx.has(v)){
        const drivers=mIdx.get(fp)||[];
        missing.push({original:fp,variant:v,drivers,verified:[]});
      }
    }
  }
  console.log('  Found '+missing.length+' potential missing variants from '+allFPs.length+' FPs');
  // Verify top candidates via external sources (limit to 60 to stay within API limits)
  const toVerify=missing.slice(0,60);
  for(const m of toVerify){
    checked++;if(checked%10===0)console.log('  Verifying... '+checked+'/'+toVerify.length);
    m.verified=await verifyVariantExists(m.variant);
    await sleep(500);
  }
  const confirmed=toVerify.filter(m=>m.verified.length>0);
  console.log('  Verified: '+confirmed.length+' variants confirmed in external sources');
  return{missing,confirmed,totalChecked:allFPs.length};
}

// === PHASE 2: Collect NEW FPs from all intelligence sources ===
function phase2_newFPs(intel,idx){
  console.log('\n=== PHASE 2: Collect New FPs from All Sources ===');
  const{mIdx}=idx;const newFPs=new Map();
  const addNew=(fp,pid,src)=>{
    if(!fp||typeof fp!=='string')return;
    fp=fp.trim();if(mIdx.has(fp))return;
    if(!/_T[A-Z][A-Za-z0-9]{3,5}_[a-z0-9]{4,16}$/.test(fp))return;
    if(!newFPs.has(fp))newFPs.set(fp,{fp,pids:new Set(),sources:new Set()});
    const e=newFPs.get(fp);if(pid)e.pids.add(pid);e.sources.add(src);
  };
  // From external sources
  if(intel.external?.topUnsupported)intel.external.topUnsupported.forEach(u=>addNew(u.fp,u.pid,'external'));
  if(intel.external?.newFPs)intel.external.newFPs.forEach(f=>addNew(f.fp||f,f.pid,'ext-new'));
  // From GitHub
  if(intel.github?.newFPs)intel.github.newFPs.forEach(f=>addNew(f.fp||f,f.pid,'github'));
  // From forks
  if(intel.forks?.newFPs)intel.forks.newFPs.forEach(f=>addNew(typeof f==='string'?f:f.fp,f?.pid,'fork'));
  // From JohanBendz
  if(intel.johan?.allNewFPs)intel.johan.allNewFPs.forEach(f=>addNew(f.fp||f,f.pid,'johan'));
  // From comp scan
  if(intel.compScan?.newFPs)intel.compScan.newFPs.forEach(f=>addNew(f.fp||f,f.pid,'comp'));
  // From deep search
  if(intel.deepSearch?.newFPs)intel.deepSearch.newFPs.forEach(f=>addNew(f.fp||f,f.pid,'deep'));
  // From Gmail diagnostics (pseudonymized)
  if(intel.gmail?.fps)intel.gmail.fps.forEach(f=>addNew(f.fp,f.pid,'gmail'));
  // From forum intel
  if(intel.forumIntel?.fps)intel.forumIntel.fps.forEach(f=>addNew(f.fp||f.manufacturerName,f.pid||f.productId,'forum'));
  // From diagnostics
  if(intel.diagnostics?.devices)intel.diagnostics.devices.forEach(d=>addNew(d.fp||d.manufacturerName,d.pid||d.productId,'diag'));
  const result=[...newFPs.values()].map(e=>({fp:e.fp,pids:[...e.pids],sources:[...e.sources]}));
  console.log('  Collected '+result.length+' new unique FPs from all sources');
  return result;
}

// === PHASE 3: AI-powered classification + driver matching ===
async function phase3_aiClassify(newFPs,idx){
  console.log('\n=== PHASE 3: AI Classification ===');
  if(!newFPs.length){console.log('  No new FPs to classify');return[]}
  const{pIdx}=idx;
  const PID_MAP={'TS0001':'switch_1gang','TS0011':'switch_1gang','TS0002':'switch_2gang',
    'TS0012':'switch_2gang','TS0003':'switch_3gang','TS0013':'switch_3gang',
    'TS0004':'switch_4gang','TS0014':'switch_4gang','TS0006':'switch_6gang',
    'TS011F':'plug_energy_monitor','TS0121':'plug_energy_monitor',
    'TS0201':'climate_sensor','TS0202':'motion_sensor','TS0203':'contact_sensor',
    'TS0205':'water_leak_sensor','TS0210':'smoke_detector_advanced',
    'TS0216':'siren','TS0041':'button_wireless_1','TS0042':'button_wireless_2',
    'TS0043':'button_wireless_3','TS0044':'button_wireless_4',
    'TS004F':'button_wireless_4','TS130F':'curtain_motor',
    'TS0501':'bulb_dimmable','TS0502':'bulb_tunable_white','TS0504':'bulb_rgbw',
    'TS0505A':'bulb_rgbw','TS0505B':'bulb_rgbw','TS110E':'dimmer_wall_1gang',
    'TS0601':'generic_tuya'};
  // First: rule-based matching via PID
  const classified=[];
  const needAI=[];
  for(const entry of newFPs){
    let driver=null;
    for(const pid of entry.pids){
      if(PID_MAP[pid]){driver=PID_MAP[pid];break}
      const drivers=pIdx.get(pid);if(drivers&&drivers.length===1){driver=drivers[0];break}
    }
    if(driver){classified.push({...entry,driver,method:'pid-map'});continue}
    needAI.push(entry);
  }
  console.log('  PID-mapped: '+classified.length+', need AI: '+needAI.length);
  // AI classification for unknowns (batch of 20)
  if(needAI.length&&ens){
    const batch=needAI.slice(0,20);
    const prompt='Classify these Tuya Zigbee fingerprints into device types. For each, return the most likely driver.\nFingerprints:\n'+
      batch.map(b=>b.fp+' (PIDs: '+(b.pids.join(',')||'unknown')+', sources: '+b.sources.join(',')+')').join('\n')+
      '\n\nAvailable drivers: switch_1gang,switch_2gang,switch_3gang,switch_4gang,switch_6gang,plug_energy_monitor,'+
      'climate_sensor,motion_sensor,contact_sensor,water_leak_sensor,smoke_detector_advanced,siren,curtain_motor,'+
      'bulb_dimmable,bulb_tunable_white,bulb_rgbw,dimmer_wall_1gang,presence_sensor_radar,thermostat_tuya_dp,'+
      'ir_remote,soil_sensor,garage_door,button_wireless_1,button_wireless_2,button_wireless_3,button_wireless_4\n'+
      'Return JSON array: [{"fp":"...","driver":"...","confidence":"high|medium|low"}]';
    const aiResults=await aiAnalyze('classify',prompt,2000);
    if(aiResults&&aiResults.length){
      // Voting: take consensus from multiple AIs
      const votes=new Map();
      for(const ar of aiResults){
        try{const arr=JSON.parse(ar.result.replace(/`json?\n?/g,'').replace(/`/g,'').trim());
          if(Array.isArray(arr)){for(const item of arr){
            if(!item.fp||!item.driver)continue;
            if(!votes.has(item.fp))votes.set(item.fp,{});
            const v=votes.get(item.fp);v[item.driver]=(v[item.driver]||0)+1;
          }}
        }catch{}
      }
      for(const entry of batch){
        const v=votes.get(entry.fp);if(!v)continue;
        const best=Object.entries(v).sort((a,b)=>b[1]-a[1])[0];
        if(best&&best[1]>=2){classified.push({...entry,driver:best[0],method:'ai-consensus('+best[1]+'/'+aiResults.length+')'});}
        else if(best){classified.push({...entry,driver:best[0],method:'ai-single'});}
      }
    }
  }
  console.log('  Total classified: '+classified.length);
  return classified;
}

// === PHASE 4: Auto-implement confirmed variants + classified FPs ===
function phase4_implement(confirmed,classified,idx){
  console.log('\n=== PHASE 4: Auto-Implement ===');
  let added=0,skipped=0;
  // 4a: Add confirmed variants to their parent driver
  for(const v of confirmed){
    if(!v.drivers||!v.drivers.length)continue;
    const driver=v.drivers[0];
    if(addFPToDriver(driver,v.variant)){added++}else{skipped++}
  }
  // 4b: Add classified new FPs
  for(const c of classified){
    if(!c.driver)continue;
    // Only auto-add high confidence (pid-map or ai-consensus)
    if(c.method==='ai-single')continue;
    if(addFPToDriver(c.driver,c.fp)){added++}else{skipped++}
  }
  console.log('  Added: '+added+', Skipped: '+skipped+(DRY?' (DRY RUN)':''));
  return{added,skipped};
}

// === PHASE 5: AI-powered cross-reference report ===
async function phase5_report(intel,confirmed,classified,implResult){
  console.log('\n=== PHASE 5: AI Cross-Reference Report ===');
  const summary={
    timestamp:new Date().toISOString(),
    dryRun:DRY,
    sources:{
      external:intel.external?.total||0,
      github:((intel.github?.issues||[]).length+(intel.github?.prs||[]).length)||0,
      forks:(intel.forks?.newFPs||[]).length,
      johan:(intel.johan?.allNewFPs||[]).length,
      gmail:intel.gmail?.count||0,
      forum:(intel.forumIntel?.fps||[]).length,
      diagnostics:(intel.diagnostics?.devices||[]).length,
      deepSearch:(intel.deepSearch?.newFPs||[]).length,
    },
    variants:{confirmed:confirmed.length,
      details:confirmed.slice(0,30).map(c=>({from:c.original,variant:c.variant,driver:c.drivers[0],sources:c.verified}))},
    classified:{total:classified.length,
      byMethod:{},
      details:classified.slice(0,30).map(c=>({fp:c.fp,driver:c.driver,method:c.method,pids:c.pids,sources:c.sources}))},
    implemented:implResult,
    ghApiCalls:ghCalls,
  };
  // Count by method
  for(const c of classified){summary.classified.byMethod[c.method]=(summary.classified.byMethod[c.method]||0)+1}
  // AI ensemble summary (if available)
  if(ens){
    const ctx='Summarize this Tuya Zigbee device intelligence report in 3 sentences:\n'+
      'Sources scanned: '+JSON.stringify(summary.sources)+'\n'+
      'Confirmed variants: '+confirmed.length+'\n'+
      'New FPs classified: '+classified.length+'\n'+
      'Auto-implemented: '+implResult.added+'\n'+
      'Top patterns: '+(intel.patterns?JSON.stringify(intel.patterns).slice(0,500):'none');
    const aiSummary=await aiAnalyze('analyze',ctx,500);
    if(aiSummary&&aiSummary.length)summary.aiSummary=aiSummary[0].result;
  }
  saveJ(REPORT,summary);
  console.log('\n  Report saved to '+REPORT);
  return summary;
}

// === PHASE 6: GitHub Search for unknown devices (web search equivalent) ===
async function phase6_webSearch(idx){
  console.log('\n=== PHASE 6: GitHub + Web Search for New Devices ===');
  if(!TOKEN){console.log('  No GitHub token, skipping');return[]}
  const findings=[];
  // Search for Tuya Zigbee devices in popular projects not yet in our index
  const queries=[
    'tuya zigbee fingerprint _TZE284_ language:json',
    'tuya zigbee _TZE204_ TS0601 language:typescript',
    'manufacturerName _TZ3000_ productId language:json path:devices',
    'tuya quirk _TZE200_ language:python path:zhaquirks',
    'tuya converter _TZE284_ language:typescript path:src/devices',
  ];
  for(const q of queries){
    if(ghCalls>=MAX_GH)break;
    const res=await ghSearch('code',q,10);
    if(!res||!res.items)continue;
    for(const item of res.items){
      const name=item.name||'';const repo=item.repository?.full_name||'';
      // Extract FPs from file path/name context
      const textH=(item.text_matches||[]).map(t=>t.fragment||'').join(' ');
      const fps=(textH.match(/_T[A-Z][A-Za-z0-9]{3,5}_[a-z0-9]{4,16}/g)||[]);
      const pids=(textH.match(/\bTS[0-9]{4}[A-Z]?\b/g)||[]);
      for(const fp of fps){
        if(!idx.mIdx.has(fp)){findings.push({fp,pids,repo,file:name,src:'gh-code-search'})}}
    }
    await sleep(1000);
  }
  // Search GitHub issues for device requests
  const issueQueries=['tuya zigbee support device _TZE284_','tuya zigbee _TZE204_ not working'];
  for(const q of issueQueries){
    if(ghCalls>=MAX_GH)break;
    const res=await ghSearch('issues',q,10);
    if(!res||!res.items)continue;
    for(const item of res.items){
      const body=(item.title||'')+' '+(item.body||'').slice(0,3000);
      const fps=(body.match(/_T[A-Z][A-Za-z0-9]{3,5}_[a-z0-9]{4,16}/g)||[]);
      const pids=(body.match(/\bTS[0-9]{4}[A-Z]?\b/g)||[]);
      for(const fp of fps){
        if(!idx.mIdx.has(fp)){findings.push({fp,pids,repo:item.repository_url||'',src:'gh-issue-search'})}}
    }
    await sleep(1000);
  }
  // Deduplicate
  const deduped=new Map();
  for(const f of findings){if(!deduped.has(f.fp))deduped.set(f.fp,f);
    else{const e=deduped.get(f.fp);e.pids=[...new Set([...e.pids,...f.pids])]}}
  const result=[...deduped.values()];
  console.log('  Found '+result.length+' new FPs from GitHub search');
  return result;
}

// === MAIN ORCHESTRATOR ===
async function main(){
  console.log('=== Master AI Battle Orchestrator v1.0 ===');
  console.log('DRY_RUN: '+DRY+' | GH_TOKEN: '+(TOKEN?'yes':'no')+' | AI Ensemble: '+(ens?'loaded':'unavailable'));
  const startTime=Date.now();
  // Build driver index
  const idx=buildDriverIndex();
  console.log('Driver index: '+idx.meta.size+' drivers, '+idx.mIdx.size+' FPs');
  // Gather all intelligence
  const intel=gatherAllIntel();
  const srcCount=Object.keys(intel).length;
  console.log('Intelligence sources loaded: '+srcCount);
  // Phase 1: Variant discovery
  const{confirmed}=await phase1_variants(idx);
  // Phase 2: Collect new FPs from all sources
  const newFPs=phase2_newFPs(intel,idx);
  // Phase 6: GitHub web search (before classify so we include those FPs)
  const webFPs=await phase6_webSearch(idx);
  const allNew=[...newFPs,...webFPs.map(w=>({fp:w.fp,pids:w.pids||[],sources:[w.src]}))];
  // Deduplicate
  const deduped=new Map();
  for(const f of allNew){if(!deduped.has(f.fp)){deduped.set(f.fp,f)}
    else{const e=deduped.get(f.fp);e.pids=[...new Set([...e.pids,...(f.pids||[])])];e.sources=[...new Set([...e.sources,...(f.sources||[])])]}}
  const uniqueNew=[...deduped.values()];
  console.log('Total unique new FPs (all sources + web): '+uniqueNew.length);
  // Phase 3: AI classification
  const classified=await phase3_aiClassify(uniqueNew,idx);
  // Phase 4: Auto-implement
  const implResult=phase4_implement(confirmed,classified,idx);
  // Phase 5: Report
  const report=await phase5_report(intel,confirmed,classified,implResult);
  // GitHub Step Summary
  const elapsed=((Date.now()-startTime)/1000).toFixed(1);
  if(process.env.GITHUB_STEP_SUMMARY){
    const s=[];
    s.push('## AI Battle Report');
    s.push('**Duration:** '+elapsed+'s | **GH API calls:** '+ghCalls+'/'+MAX_GH);
    s.push('');s.push('| Source | Count |');s.push('|--------|-------|');
    for(const[k,v]of Object.entries(report.sources))s.push('| '+k+' | '+v+' |');
    s.push('');
    s.push('**Confirmed variants:** '+confirmed.length);
    s.push('**Classified new FPs:** '+classified.length);
    s.push('**Auto-implemented:** '+implResult.added+(DRY?' (dry run)':''));
    if(report.aiSummary)s.push('\n> '+report.aiSummary.replace(/\n/g,'\n> '));
    try{fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,s.join('\n')+'\n')}catch{}
  }
  console.log('\n=== AI Battle Complete in '+elapsed+'s ===');
  console.log('  Variants confirmed: '+confirmed.length);
  console.log('  New FPs classified: '+classified.length);
  console.log('  Auto-implemented: '+implResult.added);
  console.log('  GH API calls: '+ghCalls+'/'+MAX_GH);
}

main().catch(e=>{console.error('FATAL:',e.message);process.exit(1)});
