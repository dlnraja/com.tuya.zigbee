#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path');
const{fetchWithRetry}=require('./retry-helper');
const {getForumAuth,fmtCk,FORUM}=require('./forum-auth');
const TOPIC=140352;
const SUM=process.env.GITHUB_STEP_SUMMARY||'/dev/null';

async function postReply(tid,raw,auth){
  const h=auth.type==='apikey'
    ?{'Content-Type':'application/json','User-Api-Key':auth.key}
    :{'Content-Type':'application/json','X-CSRF-Token':auth.csrf,'Cookie':fmtCk(auth.cookies),'X-Requested-With':'XMLHttpRequest'};
  const r=await fetchWithRetry(FORUM+'/posts',{method:'POST',headers:h,body:JSON.stringify({topic_id:tid,raw})},{retries:3,label:'forumPost'});
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error('Post failed: '+r.status+' '+JSON.stringify(d).slice(0,200));
  return JSON.stringify(d);
}

function gatherStats(){
  const ROOT=process.cwd();
  const DDIR=path.join(ROOT,'drivers');
  let driverCount=0,totalFp=0,flowCards=0;
  try{
    const dirs=fs.readdirSync(DDIR).filter(d=>fs.existsSync(path.join(DDIR,d,'driver.compose.json')));
    driverCount=dirs.length;
    for(const d of dirs){
      try{
        const c=JSON.parse(fs.readFileSync(path.join(DDIR,d,'driver.compose.json'),'utf8'));
        totalFp+=((c.zigbee&&c.zigbee.manufacturerName)||[]).length;
      }catch(e){}
      try{
        const ff=path.join(DDIR,d,'driver.flow.compose.json');
        if(fs.existsSync(ff)){
          const fc=JSON.parse(fs.readFileSync(ff,'utf8'));
          flowCards+=(fc.triggers||[]).length+(fc.conditions||[]).length+(fc.actions||[]).length;
        }
      }catch(e){}
    }
  }catch(e){}
  // Also try _stats.json for more accurate counts
  try{
    const st=JSON.parse(fs.readFileSync(path.join(ROOT,'.github','scripts','_stats.json'),'utf8'));
    if(st.fps&&st.fps>totalFp)totalFp=st.fps;
    if(st.flow&&st.flow>flowCards)flowCards=st.flow;
    if(st.drivers&&st.drivers>driverCount)driverCount=st.drivers;
  }catch(e){}
  return{driverCount,totalFp,flowCards};
}

function parseChangelog(cl){
  // Extract numbered items like (1) ... (2) ... or bullet-like segments
  const numbered=cl.match(/\(\d+\)\s*[^(]+/g);
  if(numbered&&numbered.length>1){
    return numbered.map(s=>s.replace(/^\(\d+\)\s*/,'').trim()).filter(Boolean);
  }
  // Try splitting on ". " for sentence-based changelogs
  const sentences=cl.split(/\.\s+/).map(s=>s.trim().replace(/\.$/,'')).filter(s=>s.length>15);
  if(sentences.length>1)return sentences;
  // Single-line changelog
  return[cl.trim()];
}

function buildForumPost(ver,cl,stats,url){
  const items=parseChangelog(cl);
  const hasBullets=items.length>1;
  const fmt=n=>typeof n==='number'?n.toLocaleString('en-US'):n;

  const lines=[
    `## :rocket: Update — Universal Tuya Zigbee v${ver}`,
    '',
    `A new update is available on the **Test channel**. This version brings improvements, bug fixes, and enhanced device support based on community feedback.`,
    '',
  ];

  // Highlights section
  if(hasBullets){
    lines.push(':wrench: **What\'s New:**');
    for(const item of items){
      lines.push(`* ${item}`);
    }
  }else{
    lines.push(':wrench: **What\'s New:**');
    lines.push(cl);
  }
  lines.push('');

  // Stats table
  lines.push(':bar_chart: **Project Status:**');
  lines.push('');
  lines.push('| | |');
  lines.push('|---|---|');
  lines.push(`| **Version** | v${ver} |`);
  lines.push(`| **Drivers** | ${stats.driverCount} (Zigbee & WiFi) |`);
  lines.push(`| **Fingerprints** | ${fmt(stats.totalFp)}+ |`);
  if(stats.flowCards)lines.push(`| **Flow Cards** | ${fmt(stats.flowCards)} |`);
  lines.push(`| **Sync** | Live sync with Zigbee2MQTT & ZHA |`);
  lines.push('');

  // Links
  lines.push(':link: **Links:**');
  lines.push(`* :arrow_down: **Install test version:** [Universal Tuya Zigbee - Test](${url})`);
  lines.push('* :mag: **Device Finder:** [Check if your device is supported](https://dlnraja.github.io/com.tuya.zigbee/)');
  lines.push('* :beetle: **Report a bug:** [GitHub Issues](https://github.com/dlnraja/com.tuya.zigbee/issues)');
  lines.push('');

  // Tip
  lines.push('> :information_source: **Tip:** If a device was stuck or showing wrong values before this update, please remove it and re-pair for a clean start.');
  lines.push('');

  // Closing
  lines.push('Thank you all for your continuous feedback and diagnostic reports! :heart:');

  return lines.join('\n');
}

async function main(){
  console.log('Getting forum auth...');
  const auth=await getForumAuth();
  if(!auth){console.log('Forum post skipped (no auth)');fs.appendFileSync(SUM,'Forum post skipped (no HOMEY_EMAIL/HOMEY_PASSWORD or DISCOURSE_API_KEY)\n');return;}
  console.log('Auth OK');
  const ver=process.env.APP_VERSION||require(path.join(process.cwd(),'app.json')).version;
  let cl=process.env.CHANGELOG||'';
  if(!cl){
    try{
      const cj=JSON.parse(fs.readFileSync(path.join(process.cwd(),'.homeychangelog.json'),'utf8'));
      if(cj[ver]&&cj[ver].en)cl=cj[ver].en;
      else{
        const k=Object.keys(cj).sort((a,b)=>b.localeCompare(a,undefined,{numeric:true}));
        if(k[0]&&cj[k[0]]&&cj[k[0]].en)cl=cj[k[0]].en;
      }
    }catch(e){}
  }
  if(!cl)cl='v'+ver+' — Various improvements and bug fixes. See GitHub releases for details.';
  const url=process.env.PUBLISH_URL||'https://homey.app/a/com.dlnraja.tuya.zigbee/test/';
  const stats=gatherStats();
  const raw=buildForumPost(ver,cl,stats,url);
  console.log('Posting to forum topic',TOPIC,'(',raw.length,'chars)');
  const r=await postReply(TOPIC,raw,auth);
  console.log('Posted:',r.slice(0,100));
  fs.appendFileSync(SUM,'Forum: posted v'+ver+' update to topic '+TOPIC+'\n');
}
main().catch(e=>{console.error('Forum post failed:',e.message);process.exit(1);});
