#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path');
const {getForumAuth,fmtCk,FORUM}=require('./forum-auth');
const{fetchWithRetry}=require('./retry-helper');
const TOPIC=140352,ROOT=path.join(__dirname,'..','..');
const DRY=process.env.DRY_RUN!=='false';

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
  try{
    const cl=JSON.parse(fs.readFileSync(path.join(ROOT,'.homeychangelog.json'),'utf8'));
    if(cl[ver]&&cl[ver].en)return cl[ver].en;
    const k=Object.keys(cl).sort((a,b)=>b.localeCompare(a,undefined,{numeric:true}));
    for(const v of k.slice(0,3)){if(cl[v]&&cl[v].en)return'v'+v+': '+cl[v].en;}
  }catch{}
  return'See GitHub for details';
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

function getDriverList(){
  const ddir=path.join(ROOT,'drivers');
  const drivers=fs.readdirSync(ddir).filter(d=>fs.existsSync(path.join(ddir,d,'driver.compose.json')));
  const groups={};
  for(const d of drivers){
    try{
      const r=JSON.parse(fs.readFileSync(path.join(ddir,d,'driver.compose.json'),'utf8'));
      const cls=r.class||'other';
      const n=r.name?.en||d;
      const fp=(r.zigbee?.manufacturerName||[]).length;
      if(!groups[cls])groups[cls]=[];
      groups[cls].push({id:d,name:n,fp});
    }catch{}
  }
  return groups;
}

function buildPost(stats,changelog,ghSummary){
  const date=new Date().toISOString().split('T')[0];
  const groups=getDriverList();
  const classIcons={
    socket:'🔌',light:'💡',sensor:'📡',thermostat:'🌡️',
    windowcoverings:'🪟',lock:'🔐',fan:'🌀',speaker:'🔊',
    doorbell:'🔔',remote:'🎮',button:'🔘',other:'📦',
    homealarm:'🚨',kettle:'☕',heater:'🔥',vacuumcleaner:'🤖',
    garagedoor:'🚗',curtain:'🪟'
  };

  let md='';
  md+='# 🏠 Universal Tuya Zigbee App v'+stats.version+'\n\n';
  md+='> **Last auto-update:** '+date+' | **Drivers:** '+stats.drivers+' | **Fingerprints:** '+stats.fps+'\n\n';
  md+='The most comprehensive Tuya Zigbee app for Homey — supporting **'+stats.drivers+' device types** with **'+stats.fps+'+ manufacturer fingerprints**.\n\n';

  md+='## 📦 Install\n\n';
  md+='- **Stable:** [Homey App Store](https://homey.app/a/com.dlnraja.tuya.zigbee/)\n';
  md+='- **Test (latest):** [Test Channel](https://homey.app/a/com.dlnraja.tuya.zigbee/test/)\n';
  md+='- **Source:** [GitHub](https://github.com/dlnraja/com.tuya.zigbee)\n\n';

  md+='## 🆕 Latest Changes (v'+stats.version+')\n\n';
  md+=changelog+'\n\n';

  if(ghSummary){
    md+='## 📊 GitHub Activity\n\n';
    md+=ghSummary+'\n\n';
  }

  md+='## 📋 Supported Device Types\n\n';
  const order=['socket','light','sensor','thermostat','windowcoverings','lock','fan','speaker','doorbell','remote','button','homealarm','heater','kettle','vacuumcleaner','other'];
  const sorted=[...new Set([...order,...Object.keys(groups)])];
  for(const cls of sorted){
    if(!groups[cls])continue;
    const ico=classIcons[cls]||'📦';
    const items=groups[cls].sort((a,b)=>a.name.localeCompare(b.name));
    md+='### '+ico+' '+cls.charAt(0).toUpperCase()+cls.slice(1)+' ('+items.length+' drivers)\n';
    md+='| Driver | Fingerprints |\n|---|---|\n';
    for(const it of items) md+='| '+it.name+' | '+it.fp+' |\n';
    md+='\n';
  }

  md+='## 🔧 Features\n\n';
  md+='- **Tuya DP Protocol** — Full support for cluster 0xEF00 devices (TS0601)\n';
  md+='- **Standard ZCL** — TS0001-TS0008, TS011F, TS0201-TS0207, etc.\n';
  md+='- **BSEED/Zemismart ZCL-only mode** — PacketNinja technique for multi-gang switches\n';
  md+='- **Physical button detection** — Flow triggers for wall switch presses\n';
  md+='- **Virtual buttons** — Remote toggle any gang from flows\n';
  md+='- **Energy monitoring** — Power, voltage, current for smart plugs\n';
  md+='- **Air quality sensors** — CO2, VOC, PM2.5, formaldehyde, temp, humidity\n';
  md+='- **Cover/curtain motors** — Position control with tilt support\n';
  md+='- **LED backlight control** — Off / Normal / Inverted modes\n\n';

  md+='## 🐛 Report Issues\n\n';
  md+='- [GitHub Issues](https://github.com/dlnraja/com.tuya.zigbee/issues/new)\n';
  md+='- Include your device fingerprint (`_TZxxxx_xxxxx`) and Zigbee model ID (`TSxxxx`)\n';
  md+='- Use Homey Developer Tools > Zigbee to find your device info\n\n';

  md+='## 🌐 Device Finder\n\n';
  md+='Check if your device is supported: [Device Finder](https://dlnraja.github.io/com.tuya.zigbee/)\n\n';

  md+='---\n';
  md+='*Auto-updated by Universal Tuya Zigbee bot on '+date+'*\n';
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

  const changelog=getChangelog(stats.version);
  const ghSummary=getRecentGitHub();
  const content=buildPost(stats,changelog,ghSummary);
  console.log('Generated post:',content.length,'chars');

  if(DRY){
    console.log('[DRY RUN] Would update first post of topic',TOPIC);
    console.log('--- CONTENT PREVIEW (first 500 chars) ---');
    console.log(content.slice(0,500));
    console.log('--- END PREVIEW ---');
    const prev=path.join(ROOT,'.github','state','forum-first-post-preview.md');
    fs.writeFileSync(prev,content);
    console.log('Full preview saved to:',prev);
    return;
  }

  const auth=await getForumAuth();
  if(!auth){console.error('No auth — need HOMEY_EMAIL/HOMEY_PASSWORD or DISCOURSE_API_KEY');process.exit(0);}

  const postId=await getFirstPostId(auth);
  console.log('First post ID:',postId);

  const result=await editPost(postId,content,auth);
  console.log('Updated post',postId,'successfully');

  const sf=process.env.GITHUB_STEP_SUMMARY||null;
  if(sf)fs.appendFileSync(sf,'Forum: updated first post of topic '+TOPIC+' (v'+stats.version+', '+stats.drivers+' drivers, '+stats.fps+' FPs)\n');
}

main().catch(e=>{console.error('FATAL:',e.message);process.exit(1);});
