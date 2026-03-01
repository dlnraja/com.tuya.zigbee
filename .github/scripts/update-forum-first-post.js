#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path');
const {getForumAuth,refreshCsrf,fmtCk,FORUM}=require('./forum-auth');
const{fetchWithRetry}=require('./retry-helper');
const TOPIC=140352,ROOT=path.join(__dirname,'..','..');
const DRY=process.env.DRY_RUN==='true';

function getStats(){
  const app=JSON.parse(fs.readFileSync(path.join(ROOT,'app.json'),'utf8'));
  const ddir=path.join(ROOT,'drivers');
  const drivers=fs.readdirSync(ddir).filter(d=>fs.existsSync(path.join(ddir,d,'driver.compose.json')));
  let fps=0,cats={};
  for(const d of drivers){
    try{
      const r=JSON.parse(fs.readFileSync(path.join(ddir,d,'driver.compose.json'),'utf8'));
      fps+=(r.zigbee?.manufacturerName||[]).length;
      const cls=r.class||'other';
      cats[cls]=(cats[cls]||0)+1;
    }catch{}
  }
  return{version:app.version,drivers:drivers.length,fps,cats};
}

function getChangelog(ver){
  const useful=s=>s&&s.replace(/^v[\d.]+:\s*/,'').trim().length>5;
  try{
    const cl=JSON.parse(fs.readFileSync(path.join(ROOT,'.homeychangelog.json'),'utf8'));
    if(cl[ver]&&useful(cl[ver].en))return cl[ver].en;
    const k=Object.keys(cl).sort((a,b)=>b.localeCompare(a,undefined,{numeric:true}));
    for(const v of k.slice(0,3)){if(cl[v]&&useful(cl[v].en))return cl[v].en;}
  }catch{}
  return null;
}

function getRecentGitHub(){
  const sf=path.join(ROOT,'.github','state','johan-full-scan.json');
  if(!fs.existsSync(sf))return null;
  try{
    const d=JSON.parse(fs.readFileSync(sf,'utf8')),s=d.summary;
    if(!s)return null;
    if(typeof s==='string')return s;
    let t='';
    if(s.totalIssues)t+='- **Issues scanned:** '+s.totalIssues+'\n';
    if(s.totalPRs)t+='- **PRs scanned:** '+s.totalPRs+'\n';
    if(s.newFingerprints)t+='- **New fingerprints:** '+s.newFingerprints+'\n';
    if(s.issuesWithFPs)t+='- **Issues with FPs:** '+s.issuesWithFPs+'\n';
    if(d.newFingerprints?.length)t+='- **Added:** '+d.newFingerprints.map(f=>f.mfr||f).join(', ')+'\n';
    return t||JSON.stringify(s,null,2);
  }catch{return null;}
}

function getDriverSummary(){
  const ddir=path.join(ROOT,'drivers');
  const drivers=fs.readdirSync(ddir).filter(d=>fs.existsSync(path.join(ddir,d,'driver.compose.json')));
  const cats={};
  for(const d of drivers){
    try{const r=JSON.parse(fs.readFileSync(path.join(ddir,d,'driver.compose.json'),'utf8'));
      const c=r.class||'other';if(!cats[c])cats[c]={n:0,fp:0};cats[c].n++;cats[c].fp+=(r.zigbee?.manufacturerName||[]).length;
    }catch{}
  }
  return cats;
}
function getChangelogHistory(count){
  try{const cl=JSON.parse(fs.readFileSync(path.join(ROOT,'.homeychangelog.json'),'utf8'));
    return Object.keys(cl).sort((a,b)=>b.localeCompare(a,undefined,{numeric:true})).slice(0,count||5).map(v=>({v,t:(cl[v]?.en||'')})).filter(e=>e.t.length>10);
  }catch{return[]}
}

function buildPost(stats,changelog,ghSummary){
  const date=new Date().toISOString().split('T')[0];
  const cats=getDriverSummary();
  const hist=getChangelogHistory(5);
  const ico={socket:'🔌',light:'💡',sensor:'📡',thermostat:'🌡️',windowcoverings:'🪟',lock:'🔐',fan:'🌀',doorbell:'🔔',remote:'🎮',button:'🔘',other:'📦',homealarm:'🚨',heater:'🔥',garagedoor:'🚗'};
  const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
  let md='';
  md+='# Universal Tuya Zigbee v'+stats.version+'\n\n';
  md+='> **'+stats.drivers+' drivers** | **'+stats.fps+'+ fingerprints** | Updated '+date+'\n\n';
  md+='The most comprehensive Tuya Zigbee app for Homey Pro.\n\n';
  md+='## Install\n\n';
  md+='**Stable:** [Homey App Store](https://homey.app/a/com.dlnraja.tuya.zigbee/) · **Test:** [Test Channel](https://homey.app/a/com.dlnraja.tuya.zigbee/test/) · **Source:** [GitHub](https://github.com/dlnraja/com.tuya.zigbee)\n\n';
  md+='## Latest (v'+stats.version+')\n\n';
  md+=changelog+'\n\n';

  if(ghSummary){md+='## GitHub Activity\n\n'+ghSummary+'\n\n';}

  md+='## Supported Devices\n\n';
  const ord=['socket','light','sensor','thermostat','windowcoverings','lock','fan','doorbell','remote','button','homealarm','heater','garagedoor','other'];
  const all=[...new Set([...ord,...Object.keys(cats)])];
  md+='| Category | Drivers | FPs |\n|---|---|---|\n';
  for(const c of all){if(!cats[c])continue;md+='| '+(ico[c]||'📦')+' '+cap(c)+' | '+cats[c].n+' | '+cats[c].fp+' |\n';}
  md+='\n[Device Finder](https://dlnraja.github.io/com.tuya.zigbee/) — search by fingerprint\n';

  md+='\n## Features\n\n';
  md+='- **Tuya DP** (0xEF00/TS0601) + **Standard ZCL** (TS0001–TS0504, TS011F)\n';
  md+='- BSEED/Zemismart ZCL-only · Physical button detection · Virtual buttons\n';
  md+='- Energy monitoring (W/V/A) · Air quality (CO2/VOC/PM2.5/HCHO) · Cover/curtain with tilt\n';
  md+='- LED backlight control · Diagnostic reports · Auto-configured settings\n\n';

  // Changelog history (collapsible) — skip current version explicitly
  const prevHist=hist.filter(h=>h.v!==stats.version);
  if(prevHist.length){
    md+='## Changelog\n\n';
    md+='<details><summary>Previous versions</summary>\n\n';
    for(const h of prevHist)md+='**v'+h.v+':** '+h.t.replace(/^v[\d.]+:\s*/,'')+'\n\n';
    md+='</details>\n\n';
  }

  md+='## Report Issues\n\n';
  md+='[GitHub Issues](https://github.com/dlnraja/com.tuya.zigbee/issues/new) — include `_TZxxxx` fingerprint + `TSxxxx` model\n\n';

  md+='## Support the Project\n\n';
  md+='If this app is useful to you, consider a small donation:\n';
  md+='- **PayPal:** [paypal.me/dlnraja](https://paypal.me/dlnraja)\n';
  md+='- **Revolut:** [revolut.me/dlnraja](https://revolut.me/dlnraja)\n\n';

  md+='---\n*Auto-updated '+date+'*\n';
  return md;
}

async function getFirstPostId(auth){
  const h=auth.type==='apikey'
    ?{'Accept':'application/json','User-Api-Key':auth.key}
    :{'Accept':'application/json','X-Requested-With':'XMLHttpRequest',Cookie:fmtCk(auth.cookies)};
  const r=await fetchWithRetry(FORUM+'/t/'+TOPIC+'.json',{headers:h},{retries:3,label:'getFirstPost'});
  if(!r.ok)throw new Error('Failed to fetch topic: '+r.status);
  const d=await r.json();
  const firstPost=d.post_stream?.posts?.[0];
  if(!firstPost)throw new Error('No first post found in topic');
  return firstPost.id;
}

async function editPost(postId,raw,auth){
  const body=JSON.stringify({post:{raw}});
  const h=auth.type==='apikey'
    ?{'Content-Type':'application/json','User-Api-Key':auth.key}
    :{'Content-Type':'application/json','X-CSRF-Token':auth.csrf,'X-Requested-With':'XMLHttpRequest',Cookie:fmtCk(auth.cookies)};
  const r=await fetchWithRetry(FORUM+'/posts/'+postId+'.json',{method:'PUT',headers:h,body},{retries:3,label:'editPost'});
  if(!r.ok){
    const txt=await r.text().catch(()=>'');
    throw new Error('Edit failed: '+r.status+' '+txt.slice(0,200));
  }
  return r.json();
}

async function main(){
  console.log('=== Update Forum First Post ===');
  console.log('Mode:',DRY?'DRY RUN':'LIVE');
  console.log('Topic:',TOPIC);

  const stats=getStats();
  console.log('Stats: v'+stats.version+', '+stats.drivers+' drivers, '+stats.fps+' FPs');

  const changelog=getChangelog(stats.version)||'Bug fixes and improvements. See [GitHub](https://github.com/dlnraja/com.tuya.zigbee) for details.';
  const ghSummary=getRecentGitHub()||null;
  const content=buildPost(stats,changelog,ghSummary);
  // Always save preview for debugging
  const prev=path.join(ROOT,'.github','state','forum-first-post-preview.md');
  try{fs.writeFileSync(prev,content);}catch{}
  console.log('Generated post:',content.length,'chars');

  if(DRY){
    console.log('[DRY RUN] Would update first post of topic',TOPIC);
    console.log('--- CONTENT PREVIEW (first 500 chars) ---');
    console.log(content.slice(0,500));
    console.log('--- END PREVIEW ---');
    console.log('Full preview saved to:',prev);
    return;
  }

  const auth=await getForumAuth();
  if(!auth){console.error('No auth — need HOMEY_EMAIL/HOMEY_PASSWORD or DISCOURSE_API_KEY');process.exit(0);}

  const postId=await getFirstPostId(auth);
  console.log('First post ID:',postId);

  if(auth.type==='session')await refreshCsrf(auth);
  const result=await editPost(postId,content,auth);
  console.log('Updated post',postId,'successfully');

  const sf=process.env.GITHUB_STEP_SUMMARY||null;
  if(sf)fs.appendFileSync(sf,'Forum: updated first post of topic '+TOPIC+' (v'+stats.version+', '+stats.drivers+' drivers, '+stats.fps+' FPs)\n');
}

main().catch(e=>{console.error('FATAL:',e.message);process.exit(1);});
