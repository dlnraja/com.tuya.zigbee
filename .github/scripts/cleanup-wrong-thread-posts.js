#!/usr/bin/env node
'use strict';
// DELETE all dlnraja posts on OTHER threads  v3: try DELETE, fall back to blank
const fs=require('fs'),path=require('path');
const envFile=path.join(__dirname,'..','..', '.env');
if(fs.existsSync(envFile)){for(const l of fs.readFileSync(envFile,'utf8').split('\n')){const m=l.match(/^\s*([A-Z_]+)\s*=\s*(.+)\s*$/);if(m&&m[2]&&!m[2].startsWith('#'))process.env[m[1]]=m[2];}}
const{getForumAuth,refreshCsrf,fmtCk,FORUM}=require('./forum-auth');
const{fetchWithRetry,sleep}=require('./retry-helper');
const TOPICS=[140352];
const USER='dlnraja';
const DRY=process.env.DRY_RUN!=='false';
const EDIT_SPACING=60000;

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
      const text=(p.cooked||'').replace(/<[^>]+>/g,'').trim();
      if(text==='(message removed)'||text==='_(message removed)_'){console.log('  #'+p.post_number+' already removed, skip');continue;}
      const hidden=p.hidden||p.user_deleted||(p.cooked||'').includes('flagged');
      found.push({id:p.id,num:p.post_number,hidden,preview:(p.cooked||'').replace(/<[^>]+>/g,' ').trim().substring(0,80)});
    }
  }
  console.log(`  Found ${found.length} posts by ${USER}`);
  return found;
}

async function main(){
  console.log(`=== DELETE All Posts on Wrong Threads v3 === ${DRY?'DRY':'LIVE'}`);
  let auth=null;
  if(!DRY){auth=await getForumAuth();if(!auth){console.error('No auth');process.exit(1);}}
  let deleted=0,batch=0;
  for(const tid of TOPICS){
    const posts=await scan(tid);
    for(const p of posts){
      console.log(`  T${tid}#${p.num} id=${p.id} "${p.preview}"`);
      if(DRY){console.log('    [DRY] would blank');continue;}
      if(batch>=2){console.log('    --- pause 10min ---');batch=0;await sleep(600000);}
      try{
        if(auth.type==='session')await refreshCsrf(auth);
        await sleep(EDIT_SPACING);
        // Try DELETE first
        const rd=await fetch(`${FORUM}/posts/${p.id}`,{method:'DELETE',headers:hdr(auth,false)});
        if(rd.ok){console.log('    DELETED');deleted++;batch++;continue;}
        if(rd.status===429){console.log('    429 pause 5min');await sleep(300000);batch=0;continue;}
        // DELETE failed (not mod?)  blank instead
        console.log('    DELETE failed ('+rd.status+'), blanking...');
        await sleep(3000);
        const rb=await fetch(`${FORUM}/posts/${p.id}`,{method:'PUT',headers:hdr(auth,true),body:JSON.stringify({post:{raw:'_(message removed)_'}})});
        if(rb.ok){console.log('    BLANKED');deleted++;batch++;}
        else if(rb.status===429){console.log('    429 pause 5min');await sleep(300000);batch=0;}
        else console.log('    BLANK FAIL:',rb.status);
      }catch(e){console.log('    ERR:',e.message);}
    }
  }
  console.log(`\nDone: ${deleted} posts removed`);
}
main().catch(e=>{console.error(e.message);process.exit(1);});
