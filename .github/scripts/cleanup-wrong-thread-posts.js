#!/usr/bin/env node
'use strict';
// One-shot: Find and clean bot posts on OTHER people's threads (not T140352)
const fs=require('fs'),path=require('path');
const envFile=path.join(__dirname,'..','..', '.env');
if(fs.existsSync(envFile)){for(const l of fs.readFileSync(envFile,'utf8').split('\n')){const m=l.match(/^\s*([A-Z_]+)\s*=\s*(.+)\s*$/);if(m&&m[2]&&!m[2].startsWith('#'))process.env[m[1]]=m[2];}}
const{getForumAuth,refreshCsrf,fmtCk,FORUM}=require('./forum-auth');
const{fetchWithRetry,sleep}=require('./retry-helper');
const TOPICS=[26439,146735,89271];
const USER='dlnraja';
const DRY=process.env.DRY_RUN!=='false';
const CLEAN='*(This automated reply was posted on the wrong thread by mistake. Apologies!)*';
function hdr(a,j){const h=a.type==='apikey'?{'Api-Key':a.key,'Api-Username':USER}:{'X-CSRF-Token':a.csrf,'X-Requested-With':'XMLHttpRequest',Cookie:fmtCk(a.cookies)};if(j)h['Content-Type']='application/json';return h;}
async function scan(tid){
  console.log(`\nT${tid}...`);
  const r=await fetchWithRetry(`${FORUM}/t/${tid}.json`,{},{retries:3,label:'t'});
  if(!r.ok)return[];const d=await r.json();const s=d.post_stream?.stream||[];
  const found=[];
  for(let i=0;i<s.length;i+=20){
    const c=s.slice(i,i+20);await sleep(500);
    const r2=await fetchWithRetry(`${FORUM}/t/${tid}/posts.json?${c.map(id=>'post_ids[]='+id).join('&')}`,{},{retries:2,label:'p'});
    if(!r2.ok)continue;const pp=(await r2.json()).post_stream?.posts||[];
    for(const p of pp){
      if(p.username!==USER)continue;
      const t=(p.cooked||'').replace(/<[^>]+>/g,' ').trim();
      const bot=/Universal Tuya|dlnraja bot|Auto-response|fingerprint|supported|Install test/i.test(t);
      found.push({id:p.id,num:p.post_number,bot,preview:t.substring(0,100)});
    }
  }
  console.log(`  ${found.length} posts (${found.filter(p=>p.bot).length} bot)`);
  return found;
}
async function main(){
  console.log(`=== Cleanup Wrong-Thread Posts === ${DRY?'DRY':'LIVE'}`);
  let auth=null;if(!DRY){auth=await getForumAuth();if(!auth){console.error('No auth');process.exit(1);}}
  let cleaned=0;
  for(const tid of TOPICS){
    const posts=await scan(tid);
    for(const p of posts){
      console.log(`  [${p.bot?'BOT':'MANUAL'}] T${tid}#${p.num} id=${p.id} ${p.preview}`);
      if(!p.bot){console.log('    skip manual');continue;}
      if(DRY){console.log('    [DRY] would edit');continue;}
      try{
        if(auth.type==='session')await refreshCsrf(auth);await sleep(3000);
        const r=await fetchWithRetry(`${FORUM}/posts/${p.id}`,{method:'PUT',headers:hdr(auth,true),body:JSON.stringify({post:{raw:CLEAN}})},{retries:3,label:'edit'});
        if(r.ok){console.log('    CLEANED');cleaned++;}else console.log('    FAIL:',r.status);
      }catch(e){console.log('    ERR:',e.message);}
    }
  }
  console.log(`\nDone: ${cleaned} cleaned`);
}
main().catch(e=>{console.error(e.message);process.exit(1);});
