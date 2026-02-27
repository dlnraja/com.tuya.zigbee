#!/usr/bin/env node
'use strict';
// BLANK all dlnraja posts on OTHER threads — v2: 20s spacing, skip blanked
const fs=require('fs'),path=require('path');
const envFile=path.join(__dirname,'..','..', '.env');
if(fs.existsSync(envFile)){for(const l of fs.readFileSync(envFile,'utf8').split('\n')){const m=l.match(/^\s*([A-Z_]+)\s*=\s*(.+)\s*$/);if(m&&m[2]&&!m[2].startsWith('#'))process.env[m[1]]=m[2];}}
const{getForumAuth,refreshCsrf,fmtCk,FORUM}=require('./forum-auth');
const{fetchWithRetry,sleep}=require('./retry-helper');
const TOPICS=[26439,146735,89271];
const USER='dlnraja';
const DRY=process.env.DRY_RUN!=='false';
const BLANK='_(message removed)_';
const EDIT_SPACING=20000;

function hdr(a,j){
  const h=a.type==='apikey'
    ?{'Api-Key':a.key,'Api-Username':USER}
    :{'X-CSRF-Token':a.csrf,'X-Requested-With':'XMLHttpRequest',Cookie:fmtCk(a.cookies)};
  if(j)h['Content-Type']='application/json';
  return h;
}

async function scan(tid){
  console.log(`\nT${tid}...`);
  const r=await fetchWithRetry(`${FORUM}/t/${tid}.json`,{},{retries:3,label:'t'});
  if(!r.ok)return[];
  const d=await r.json();const s=d.post_stream?.stream||[];
  const found=[];
  for(let i=0;i<s.length;i+=20){
    const c=s.slice(i,i+20);await sleep(500);
    const r2=await fetchWithRetry(`${FORUM}/t/${tid}/posts.json?${c.map(id=>'post_ids[]='+id).join('&')}`,{},{retries:2,label:'p'});
    if(!r2.ok)continue;
    const pp=(await r2.json()).post_stream?.posts||[];
    for(const p of pp){
      if(p.username!==USER)continue;
      const raw=(p.raw||'').trim();
      if(raw===BLANK){console.log('  #'+p.post_number+' already blanked, skip');continue;}
      found.push({id:p.id,num:p.post_number,preview:(p.cooked||'').replace(/<[^>]+>/g,' ').trim().substring(0,80)});
    }
  }
  console.log(`  Found ${found.length} posts by ${USER}`);
  return found;
}

async function main(){
  console.log(`=== DELETE All Posts on Wrong Threads === ${DRY?'DRY':'LIVE'}`);
  let auth=null;
  if(!DRY){auth=await getForumAuth();if(!auth){console.error('No auth');process.exit(1);}}
  let deleted=0;
  for(const tid of TOPICS){
    const posts=await scan(tid);
    for(const p of posts){
      console.log(`  T${tid}#${p.num} id=${p.id} "${p.preview}"`);
      if(DRY){console.log('    [DRY] would delete');continue;}
      try{
        if(auth.type==='session')await refreshCsrf(auth);
        await sleep(EDIT_SPACING);
        const r=await fetchWithRetry(`${FORUM}/posts/${p.id}`,{method:'PUT',headers:hdr(auth,true),body:JSON.stringify({post:{raw:BLANK}})},{retries:1,maxDelay:30000,label:'edit'});
        if(r.ok){console.log('    BLANKED');deleted++;}
        else console.log('    FAIL:',r.status);
      }catch(e){console.log('    ERR:',e.message);}
    }
  }
  console.log(`\nDone: ${deleted} posts removed`);
}
main().catch(e=>{console.error(e.message);process.exit(1);});
