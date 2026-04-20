#!/usr/bin/env node
'use strict';
/**
 * Variant Scanner v1.0  Auto-discover ALL variants + productIds.
 * Sources: Z2M raw, Blakadder, GitHub Search API, comp scan. All FREE.
 */
const fs=require('fs'),path=require('path');
const{fetchWithRetry}=require('./retry-helper');
const eng=require('./fp-research-engine');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const DDIR=path.join(__dirname,'..','..','drivers');
const STATE=path.join(__dirname,'..','state');
const loadJ=f=>{try{return JSON.parse(fs.readFileSync(f,'utf8'))}catch{return null}};
const saveJ=(f,d)=>{fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,JSON.stringify(d,null,2)+'\n')};
const TOKEN=process.env.GH_PAT||process.env.GITHUB_TOKEN;
const DRY=process.env.DRY_RUN==='true';
const GH_DELAY=2500;let ghCalls=0;
const MAX_GH=parseInt(process.env.MAX_GH_CALLS||'80');
// === GitHub Search (free: 5000/hr with token) ===
const ghH=()=>{const h={Accept:'application/vnd.github+json','User-Agent':'tuya-vs'};if(TOKEN)h.Authorization='Bearer '+TOKEN;return h};
async function ghSearch(ep,q,n=5){
  if(ghCalls>=MAX_GH)return null;ghCalls++;await sleep(GH_DELAY);
  try{const u='https://api.github.com/search/'+ep+'?q='+encodeURIComponent(q)+'&per_page='+n;
    const r=await fetchWithRetry(u,{headers:ghH()},{retries:1,label:'gh-'+ep});
    if(!r.ok){if(r.status===403||r.status===429)await sleep(60000);return null}
    return r.json();
  }catch{return null}
}
// === Z2M raw tuya.ts (FREE, cached 24h) ===
let _z2mRaw=null;
async function getZ2MRaw(){
  if(_z2mRaw)return _z2mRaw;
  const cf=path.join(STATE,'z2m-tuya-raw.txt');
  try{const st=fs.statSync(cf);if(Date.now()-st.mtimeMs<86400000){_z2mRaw=fs.readFileSync(cf,'utf8');return _z2mRaw}}catch{}
  try{const r=await fetchWithRetry('https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/tuya.ts',
    {headers:{'User-Agent':'tuya-vs'}},{retries:2,label:'z2m-raw'});
    if(r.ok){_z2mRaw=await r.text();try{fs.mkdirSync(STATE,{recursive:true});fs.writeFileSync(cf,_z2mRaw)}catch{}}
  }catch{}_z2mRaw=_z2mRaw||'';return _z2mRaw;
}
function z2mPIDs(raw,fp){
  if(!raw||!fp)return[];const pids=new Set(),i=raw.indexOf(fp);
  if(i>=0){const b=raw.substring(Math.max(0,i-800),i+200);
    let m;for(const re of[/model:\s*'(TS[A-Z0-9]+)'/g,/modelID:\s*'(TS[^']+)'/g]){while((m=re.exec(b)))pids.add(m[1])}}
  return[...pids];
}
// === Discover PID from all free sources ===
async function discoverPID(fp){
  const b=await eng.searchBlakadder(fp);
  if(b&&b.length&&b[0].pid)return{pid:b[0].pid,src:'blakadder',vendor:b[0].vendor};
  const raw=await getZ2MRaw();const zp=z2mPIDs(raw,fp);
  if(zp.length)return{pid:zp[0],src:'z2m-raw',all:zp};
  if(!TOKEN)return null;
  const iss=await ghSearch('issues',fp+' TS',5);
  if(iss&&iss.items){const pids=new Set();
    for(const it of iss.items){const t=(it.title||'')+' '+(it.body||'').slice(0,2000);
      (t.match(/\bTS[0-9]{4}[A-Z]?\b/g)||[]).forEach(p=>pids.add(p))}
    if(pids.size)return{pid:[...pids][0],src:'gh-issue',all:[...pids]}}
  return null;
}
// === Verify variant exists externally ===
async function verifyVariant(v){
  const b=await eng.searchBlakadder(v);
  if(b&&b.length)return{ok:true,src:'blakadder',pid:b[0].pid};
  const raw=await getZ2MRaw();
  if(raw.includes(v))return{ok:true,src:'z2m-raw',pid:z2mPIDs(raw,v)[0]||null};
  const cs=eng.searchCompScan(v);
  if(cs)return{ok:true,src:'comp-scan',driver:cs.driver};
  if(!TOKEN)return{ok:false};
  const c=await ghSearch('code',v+' repo:Koenkk/zigbee-herdsman-converters',3);
  if(c&&c.items&&c.items.length)return{ok:true,src:'z2m-code'};
  const iss=await ghSearch('issues',v,3);
  if(iss&&iss.items&&iss.items.length)return{ok:true,src:'gh-issue',weak:true};
  return{ok:false};
}
// === Add FP+PID to driver ===
function addToDriver(driver,fp,pid,meta){
  if(DRY){console.log('  [DRY] Would add',fp,'to',driver);return false}
  const m=meta.get(driver);if(!m)return false;
  try{const d=JSON.parse(fs.readFileSync(m.path,'utf8'));let ch=false;
    if(!d.zigbee.manufacturerName.includes(fp)){d.zigbee.manufacturerName.push(fp);d.zigbee.manufacturerName.sort();ch=true}
    if(pid&&!d.zigbee.productId.includes(pid)){d.zigbee.productId.push(pid);d.zigbee.productId.sort();ch=true}
    if(ch){fs.writeFileSync(m.path,JSON.stringify(d,null,2)+'\n');return true}
  }catch(e){console.log('  [ADD-ERR]',fp,e.message)}
  return false;
}
// === PHASE 1: Missing variants ===
async function scanVariants(idx){
  const missing=eng.findMissingVariants(idx.mIdx);
  console.log('Missing variants:',missing.length);
  const res=[];let added=0;
  for(const{known,variant,driver}of missing.slice(0,200)){
    const v=await verifyVariant(variant);
    if(v.ok){if(addToDriver(driver,variant,v.pid||null,idx.meta))added++;
      res.push({known,variant,driver,pid:v.pid,src:v.src});
      console.log('  +',variant,'',driver,'['+v.src+']')}
    if(ghCalls>=MAX_GH)break;
  }
  console.log('Variants added:',added);return res;
}
// === PHASE 2: Discover PIDs for drivers missing them ===
async function scanPIDs(idx){
  const noPID=[];const seen=new Set();
  for(const[drv,info]of idx.meta){
    if(info.pids.length>0)continue;
    for(const fp of info.mfrs){if(!seen.has(fp)){seen.add(fp);noPID.push({fp,driver:drv})}}
  }
  console.log('\nFPs needing PID:',noPID.length);
  const res=[];let added=0;
  for(const{fp,driver}of noPID.slice(0,100)){
    const r=await discoverPID(fp);
    if(r&&r.pid){if(addToDriver(driver,null,r.pid,idx.meta))added++;
      res.push({fp,driver,pid:r.pid,src:r.src});
      console.log('  PID',fp,'',r.pid,'['+r.src+']')}
    if(ghCalls>=MAX_GH)break;
  }
  console.log('PIDs discovered:',res.length);return res;
}
// === PHASE 3: New unknown FPs from state files ===
async function scanNewFPs(idx){
  const fps=new Set();
  const files=['enrichment-report.json','external-sources-data.json','smart-processor-report.json'];
  for(const f of files){
    const d=loadJ(path.join(STATE,f));if(!d)continue;
    const arr=d.newFingerprints||d.allDevices||[];
    for(const x of(Array.isArray(arr)?arr:[])){
      const fp=x.fp||x.manufacturerName;
      if(fp&&eng.isValidFP(fp)&&!idx.mIdx.has(fp))fps.add(fp);
    }
    if(d.skipped)for(const fp of d.skipped)if(eng.isValidFP(fp)&&!idx.mIdx.has(fp))fps.add(fp);
  }
  console.log('\nNew unknown FPs:',fps.size);
  const res=[];
  for(const fp of[...fps].slice(0,50)){
    const r=await eng.researchFP(fp,{token:TOKEN,index:idx});
    if(r.driver&&r.confidence>=60){
      if(addToDriver(r.driver,fp,r.pid||null,idx.meta))
        res.push({fp,driver:r.driver,pid:r.pid,confidence:r.confidence,method:r.method});
      console.log('  +',fp,'',r.driver,'('+r.confidence+'%)');
    }
    if(ghCalls>=MAX_GH)break;
  }
  console.log('New FPs resolved:',res.length);return res;
}
// === MAIN ===
async function main(){
  console.log('=== Variant Scanner v1.0 ===');
  console.log('Token:',TOKEN?'yes':'no','| DRY:',DRY,'| GH max:',MAX_GH);
  const idx=eng.buildDriverIndex();
  console.log('Drivers:',idx.meta.size,'| FPs:',idx.mIdx.size,'| PIDs:',idx.pIdx.size);

  console.log('\n== Phase 1: Variant Discovery ==');
  const variants=await scanVariants(idx);

  console.log('\n== Phase 2: PID Discovery ==');
  const pids=await scanPIDs(idx);

  console.log('\n== Phase 3: New FP Research ==');
  const newFPs=await scanNewFPs(idx);

  // Save report
  const report={ts:new Date().toISOString(),ghCalls,
    variants:{count:variants.length,items:variants.slice(0,100)},
    pids:{count:pids.length,items:pids.slice(0,100)},
    newFPs:{count:newFPs.length,items:newFPs.slice(0,100)}};
  saveJ(path.join(STATE,'variant-scanner-report.json'),report);

  console.log('\n=== Summary ===');
  console.log('Variants found:',variants.length);
  console.log('PIDs discovered:',pids.length);
  console.log('New FPs resolved:',newFPs.length);
  console.log('GH API calls:',ghCalls,'/',MAX_GH);

  if(process.env.GITHUB_STEP_SUMMARY){
    let md='## Variant Scanner\n| Phase | Count |\n|---|---|\n';
    md+='| Variants added | '+variants.length+' |\n';
    md+='| PIDs discovered | '+pids.length+' |\n';
    md+='| New FPs resolved | '+newFPs.length+' |\n';
    md+='| GH API calls | '+ghCalls+'/'+MAX_GH+' |\n';
    if(variants.length){md+='\n### Variants\n';
      for(const v of variants.slice(0,20))md+='- `'+v.variant+'`  **'+v.driver+'** ['+v.src+']\n'}
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,md);
  }
}
main().catch(e=>{console.error('Fatal:',e.message);process.exit(1)});
