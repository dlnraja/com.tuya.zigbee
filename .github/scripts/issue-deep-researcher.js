#!/usr/bin/env node
'use strict';
/**
 * Issue Deep Researcher v1.0
 * Scans ALL open PRs/issues on both repos, extracts FPs+PIDs,
 * deep-researches ALL variants + ALL productIds from internet,
 * auto-implements all confirmed combinations. All FREE tier.
 */
const fs=require('fs'),path=require('path');
const{fetchWithRetry}=require('./retry-helper');
const eng=require('./fp-research-engine');
const{extractFP:_vFP,extractFPWithBrands:_vFPB,extractPID:_vPID,isValidTuyaFP}=require('./fp-validator');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const STATE=path.join(__dirname,'..','state');
const loadJ=f=>{try{return JSON.parse(fs.readFileSync(f,'utf8'))}catch{return null}};
const saveJ=(f,d)=>{fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,JSON.stringify(d,null,2)+'\n')};
const TOKEN=process.env.GH_PAT||process.env.GITHUB_TOKEN;
const DRY=process.env.DRY_RUN==='true';
const REPOS=(process.env.REPOS||'dlnraja/com.tuya.zigbee,JohanBendz/com.tuya.zigbee').split(',').map(s=>s.trim());
const GH='https://api.github.com';
const GH_DELAY=1500;let ghCalls=0;
const MAX_GH=parseInt(process.env.MAX_GH_CALLS||'120');
const ghH=()=>{const h={Accept:'application/vnd.github+json','User-Agent':'tuya-deep-res'};if(TOKEN)h.Authorization='Bearer '+TOKEN;return h};
// === GitHub API fetch with rate limiting ===
async function ghGet(ep){
  if(ghCalls>=MAX_GH)return null;ghCalls++;await sleep(GH_DELAY);
  try{const r=await fetchWithRetry(GH+ep,{headers:ghH()},{retries:1,label:'gh'});
    if(!r.ok){if(r.status===403||r.status===429){console.log('[GH] Rate limited');await sleep(60000)}return null}
    return r.json();
  }catch{return null}
}

// === Extract FPs + PIDs from text ===
// FP_RE replaced by fp-validator
const PID_RE=/\bTS[0-9]{4}[A-Z]?\b/g;
function extractFromText(text){
  if(!text)return{fps:[],pids:[]};
  const fps=[...new Set((_vFP(text)).filter(f=>eng.isValidFP(f)))];
  const pids=[...new Set(text.match(PID_RE)||[])];
  return{fps,pids};
}
// === Scan all open PRs + issues, extract FPs+PIDs from body+comments ===
async function fetchAllItems(repo){
  const items=[];
  // Open issues
  for(let p=1;p<=10;p++){
    const b=await ghGet('/repos/'+repo+'/issues?state=open&per_page=100&page='+p);
    if(!b||!b.length)break;items.push(...b.filter(i=>!i.pull_request));if(b.length<100)break;
  }
  // Open PRs
  for(let p=1;p<=5;p++){
    const b=await ghGet('/repos/'+repo+'/pulls?state=open&per_page=100&page='+p);
    if(!b||!b.length)break;items.push(...b);if(b.length<100)break;
  }
  return items;
}

async function extractAllFPs(repo,items,idx){
  const fpMap=new Map(); // fp  {pids, sources, variants}
  for(const it of items){
    const num=it.number;const isPR=!!it.pull_request||!!it.head;
    const type=isPR?'PR':'issue';
    // Extract from body
    let text=(it.title||'')+'\n'+(it.body||'');
    // Also fetch comments (first 30)
    const comments=await ghGet('/repos/'+repo+'/issues/'+num+'/comments?per_page=30');
    if(comments&&Array.isArray(comments))for(const c of comments)text+='\n'+(c.body||'');
    const{fps,pids}=extractFromText(text);
    if(!fps.length)continue;
    for(const fp of fps){
      if(!fpMap.has(fp))fpMap.set(fp,{pids:new Set(),sources:[],isNew:!idx.mIdx.has(fp)});
      const e=fpMap.get(fp);pids.forEach(p=>e.pids.add(p));
      e.sources.push(repo+'#'+num+' ('+type+')');
    }
    if(ghCalls>=MAX_GH)break;
  }
  return fpMap;
}
// === Deep research each FP: variants, PIDs, Z2M, Blakadder ===
async function deepResearchFP(fp,entry,idx){
  const res={fp,pidsFromIssue:[...entry.pids],sources:entry.sources,isNew:entry.isNew,
    variants:[],discoveredPIDs:[],driver:null,actions:[]};
  // 1. Research via engine (Blakadder+Z2M+CompScan)
  const r=await eng.researchFP(fp,{token:TOKEN,index:idx});
  if(r.driver)res.driver=r.driver;
  if(r.pid&&!entry.pids.has(r.pid))res.discoveredPIDs.push({pid:r.pid,src:r.method});
  if(r.vendor)res.vendor=r.vendor;
  res.confidence=r.confidence||0;
  // 2. Generate + verify ALL variants
  const vars=eng.generateVariants(fp);
  for(const v of vars){
    const vr=await eng.researchFP(v,{token:TOKEN,index:idx});
    res.variants.push({fp:v,driver:vr.driver,pid:vr.pid,confidence:vr.confidence,exists:!!vr.driverExists});
  }
  // 3. Try PIDs from issue text  resolve driver via PID map
  for(const pid of entry.pids){
    if(eng.PID_DRIVER_MAP[pid]&&!res.driver)res.driver=eng.PID_DRIVER_MAP[pid];
    const drvs=idx.pIdx.get(pid);
    if(drvs&&drvs.length&&!res.driver)res.driver=drvs[0];
  }
  // 4. Discover more PIDs from Blakadder/Z2M for this FP
  const blak=await eng.searchBlakadder(fp);
  if(blak)for(const b of blak){if(b.pid&&!entry.pids.has(b.pid))res.discoveredPIDs.push({pid:b.pid,src:'blakadder'})}
  return res;
}
// === Implement: add all confirmed FP+PID combos to drivers ===
function addToDriver(driver,fp,pid,meta){
  if(DRY){console.log('  [DRY] Would add',fp||'','pid:',pid||'','',driver);return false}
  const m=meta.get(driver);if(!m)return false;
  try{const d=JSON.parse(fs.readFileSync(m.path,'utf8'));let ch=false;
    if(fp&&!d.zigbee.manufacturerName.includes(fp)){d.zigbee.manufacturerName.push(fp);d.zigbee.manufacturerName.sort();ch=true}
    if(pid&&!d.zigbee.productId.includes(pid)){d.zigbee.productId.push(pid);d.zigbee.productId.sort();ch=true}
    if(ch){fs.writeFileSync(m.path,JSON.stringify(d,null,2)+'\n');return true}
  }catch(e){console.log('  [ADD-ERR]',fp,e.message)}
  return false;
}

function implementResults(researched,idx){
  let added=0;
  for(const res of researched){
    if(!res.driver||!idx.meta.has(res.driver))continue;
    // Add main FP if new
    if(res.isNew&&res.confidence>=50){
      if(addToDriver(res.driver,res.fp,null,idx.meta)){added++;res.actions.push('added_fp')}
    }
    // Add all confirmed PIDs
    const allPIDs=new Set([...res.pidsFromIssue,...res.discoveredPIDs.map(p=>p.pid)]);
    for(const pid of allPIDs){
      if(addToDriver(res.driver,null,pid,idx.meta)){added++;res.actions.push('added_pid:'+pid)}
    }
    // Add confirmed variants
    for(const v of res.variants){
      if(v.exists)continue; // already in driver
      if(v.confidence>=40||v.driver===res.driver){
        if(addToDriver(res.driver,v.fp,v.pid||null,idx.meta)){added++;res.actions.push('added_variant:'+v.fp)}
      }
    }
  }
  return added;
}
// === MAIN ===
async function main(){
  console.log('=== Issue Deep Researcher v1.0 ===');
  if(!TOKEN){console.error('No token');process.exit(1)}
  const idx=eng.buildDriverIndex();
  console.log('Index:',idx.meta.size,'drivers,',idx.mIdx.size,'FPs');
  const allFPs=new Map();
  for(const repo of REPOS){
    console.log('\n== Scanning',repo,'==');
    const items=await fetchAllItems(repo);
    console.log('  Items:',items.length);
    const fpMap=await extractAllFPs(repo,items,idx);
    for(const[fp,e]of fpMap){
      if(!allFPs.has(fp))allFPs.set(fp,{pids:new Set(),sources:[],isNew:e.isNew});
      const x=allFPs.get(fp);e.pids.forEach(p=>x.pids.add(p));x.sources.push(...e.sources);
    }
    if(ghCalls>=MAX_GH)break;
  }
  const newFPs=[...allFPs].filter(([,e])=>e.isNew);
  console.log('\n== Deep Research:',newFPs.length,'new FPs ==');
  const researched=[];
  for(const[fp,entry]of newFPs.slice(0,60)){
    const res=await deepResearchFP(fp,entry,idx);researched.push(res);
    console.log(' ',fp,'',res.driver||'?','('+res.confidence+'%)',res.variants.length+'v');
    if(ghCalls>=MAX_GH)break;
  }
  console.log('\n== Implement ==');
  const added=implementResults(researched,idx);
  console.log('Changes:',added);
  const report={ts:new Date().toISOString(),ghCalls,totalFPs:allFPs.size,
    newFPs:newFPs.length,researched:researched.length,implemented:added,
    results:researched.map(r=>({fp:r.fp,driver:r.driver,confidence:r.confidence,
      pidsFromIssue:r.pidsFromIssue,discoveredPIDs:r.discoveredPIDs,
      variants:r.variants.length,actions:r.actions,sources:r.sources.slice(0,5)}))};
  saveJ(path.join(STATE,'deep-research-report.json'),report);
  console.log('\n=== Summary ===');
  console.log('FPs from issues/PRs:',allFPs.size,'| New:',newFPs.length);
  console.log('Researched:',researched.length,'| Implemented:',added,'| GH:',ghCalls+'/'+MAX_GH);
  if(process.env.GITHUB_STEP_SUMMARY){
    let md='## Issue Deep Researcher\n| Metric | Count |\n|---|---|\n';
    md+='| FPs from PRs/issues | '+allFPs.size+' |\n';
    md+='| New unsupported | '+newFPs.length+' |\n';
    md+='| Deep researched | '+researched.length+' |\n';
    md+='| Implemented | '+added+' |\n';
    md+='| GH API calls | '+ghCalls+'/'+MAX_GH+' |\n';
    const impl=researched.filter(r=>r.actions.length);
    if(impl.length){md+='\n### Implemented\n';
      for(const r of impl.slice(0,30))md+='- `'+r.fp+'`  **'+r.driver+'** '+r.actions.join(', ')+'\n'}
    const unresolved=researched.filter(r=>!r.driver);
    if(unresolved.length){md+='\n### Unresolved (need manual review)\n';
      for(const r of unresolved.slice(0,20))md+='- `'+r.fp+'`  '+r.sources[0]+'\n'}
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,md);
  }
}
main().catch(e=>{console.error('Fatal:',e.message);process.exit(1)});
