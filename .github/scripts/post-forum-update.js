#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path');
const{fetchWithRetry}=require('./retry-helper');
const{getForumAuth,refreshCsrf,fmtCk,FORUM}=require('./forum-auth');
const{textSimilarity,isDuplicateContent,MAX_POST_SIZE}=require('./ai-helper');
const TID=140352;
const SUM=process.env.GITHUB_STEP_SUMMARY||'/dev/null';
const STATE_FILE=path.join(__dirname,'..','state','forum-update-state.json');
const strip=h=>(h||'').replace(/<[^>]+>/g,'').trim();
function loadState(){try{return JSON.parse(fs.readFileSync(STATE_FILE,'utf8'))}catch{return{}}}
function saveState(s){fs.mkdirSync(path.dirname(STATE_FILE),{recursive:true});fs.writeFileSync(STATE_FILE,JSON.stringify(s,null,2)+'\n')}
function getHeaders(auth,json){
  const h=auth.type==='apikey'?{'User-Api-Key':auth.key}:{'X-CSRF-Token':auth.csrf,'X-Requested-With':'XMLHttpRequest',Cookie:fmtCk(auth.cookies)};
  if(json)h['Content-Type']='application/json';return h;
}

async function getLastOwnPost(tid){
  try{
    const r=await fetchWithRetry(FORUM+'/t/'+tid+'.json',{},{retries:2,label:'lastOwn'});
    if(!r.ok)return null;
    const d=await r.json();const highest=d.highest_post_number;if(!highest)return null;
    const from=Math.max(1,highest-5);
    const r2=await fetchWithRetry(FORUM+'/t/'+tid+'/'+from+'.json',{},{retries:2,label:'lastOwnPosts'});
    if(!r2.ok)return null;
    const posts=(await r2.json()).post_stream?.posts||[];
    const sorted=posts.sort((a,b)=>b.post_number-a.post_number);
    if(sorted[0]?.username==='dlnraja')return{id:sorted[0].id,postNumber:sorted[0].post_number,raw:sorted[0].raw||strip(sorted[0].cooked||'')};
    return null;
  }catch{return null}
}
async function editPost(postId,content,auth){
  const r=await fetchWithRetry(FORUM+'/posts/'+postId,{method:'PUT',headers:getHeaders(auth,true),
    body:JSON.stringify({post:{raw:content}})},{retries:3,label:'editPost'});
  if(!r.ok){const d=await r.json().catch(()=>({}));throw new Error('Edit:'+r.status+' '+JSON.stringify(d).substring(0,200))}
  return r.json();
}
async function postReply(tid,raw,auth){
  if(tid!==TID){console.error('BLOCKED: refusing to post on T'+tid);return null}
  const r=await fetchWithRetry(FORUM+'/posts',{method:'POST',headers:getHeaders(auth,true),
    body:JSON.stringify({topic_id:tid,raw})},{retries:3,label:'forumPost'});
  if(!r.ok){const d=await r.json().catch(()=>({}));throw new Error('Post:'+r.status+' '+JSON.stringify(d).substring(0,200))}
  return r.json();
}

function gatherStats(){
  const ROOT=process.cwd();const DDIR=path.join(ROOT,'drivers');
  let driverCount=0,totalFp=0,flowCards=0;
  try{
    const dirs=fs.readdirSync(DDIR).filter(d=>fs.existsSync(path.join(DDIR,d,'driver.compose.json')));
    driverCount=dirs.length;
    for(const d of dirs){
      try{const c=JSON.parse(fs.readFileSync(path.join(DDIR,d,'driver.compose.json'),'utf8'));totalFp+=((c.zigbee&&c.zigbee.manufacturerName)||[]).length}catch(e){}
      try{const ff=path.join(DDIR,d,'driver.flow.compose.json');if(fs.existsSync(ff)){const fc=JSON.parse(fs.readFileSync(ff,'utf8'));flowCards+=(fc.triggers||[]).length+(fc.conditions||[]).length+(fc.actions||[]).length}}catch(e){}
    }
  }catch(e){}
  try{const st=JSON.parse(fs.readFileSync(path.join(ROOT,'.github','scripts','_stats.json'),'utf8'));if(st.fps&&st.fps>totalFp)totalFp=st.fps;if(st.flow&&st.flow>flowCards)flowCards=st.flow;if(st.drivers&&st.drivers>driverCount)driverCount=st.drivers}catch(e){}
  return{driverCount,totalFp,flowCards};
}
function parseChangelog(cl){
  const numbered=cl.match(/\(\d+\)\s*[^(]+/g);
  if(numbered&&numbered.length>1)return numbered.map(s=>s.replace(/^\(\d+\)\s*/,'').trim()).filter(Boolean);
  const sentences=cl.split(/\.\s+/).map(s=>s.trim().replace(/\.$/,'')).filter(s=>s.length>15);
  if(sentences.length>1)return sentences;
  return[cl.trim()];
}

function buildForumPost(ver,cl,stats,url){
  const items=parseChangelog(cl);
  const hasBullets=items.length>1;
  const fmt=n=>typeof n==='number'?n.toLocaleString('en-US'):n;
  const lines=[];
  lines.push('v'+ver+' is up on the [test channel]('+url+').');
  lines.push('');
  if(hasBullets){lines.push('Changes:');for(const item of items)lines.push('- '+item)}
  else lines.push(cl);
  lines.push('');
  lines.push(fmt(stats.driverCount)+' drivers, '+fmt(stats.totalFp)+'+ fingerprints so far.');
  lines.push('');
  lines.push('As always, remove and re-pair if something acts up after updating.');
  return lines.join('\n');
}

async function main(){
  const state=loadState();
  const ver=process.env.APP_VERSION||require(path.join(process.cwd(),'app.json')).version;
  // Version dedup: skip if we already posted this exact version
  if(state.lastVersion===ver&&!process.env.FORCE_POST){
    console.log('Already posted v'+ver+', skipping (set FORCE_POST=true to override)');
    fs.appendFileSync(SUM,'Forum update skipped (v'+ver+' already posted)\n');
    return;
  }
  console.log('Getting forum auth...');
  const auth=await getForumAuth();
  if(!auth){console.log('Forum post skipped (no auth)');fs.appendFileSync(SUM,'Forum post skipped (no auth)\n');return}
  console.log('Auth OK');
  let cl=process.env.CHANGELOG||'';
  if(!cl){
    try{const cj=JSON.parse(fs.readFileSync(path.join(process.cwd(),'.homeychangelog.json'),'utf8'));
      if(cj[ver]&&cj[ver].en)cl=cj[ver].en;
      else{const k=Object.keys(cj).sort((a,b)=>b.localeCompare(a,undefined,{numeric:true}));if(k[0]&&cj[k[0]]&&cj[k[0]].en)cl=cj[k[0]].en}
    }catch(e){}
  }
  if(!cl)cl='Various improvements and bug fixes.';
  const url=process.env.PUBLISH_URL||'https://homey.app/a/com.dlnraja.tuya.zigbee/test/';
  const stats=gatherStats();
  const raw=buildForumPost(ver,cl,stats,url);
  console.log('Update content ('+raw.length+'ch):\n'+raw.substring(0,200));
  try{
    if(auth.type==='session')await refreshCsrf(auth);
    const lastOwn=await getLastOwnPost(TID);
    // Per-section dedup: skip if ANY section already covers this content
    if(lastOwn&&isDuplicateContent(raw,lastOwn.raw,0.45)){console.log('Update duplicate of existing section, skipping');fs.appendFileSync(SUM,'Forum: skipped (duplicate section)\n');return}
    // Size cap: don't keep growing post forever
    const editTarget=(lastOwn&&lastOwn.raw.length<=MAX_POST_SIZE)?lastOwn:null;
    if(editTarget){
      const cleanOld=editTarget.raw.replace(/\n*As always,?\s*remove and re-?pair[^\n]*/gi,'').trimEnd();
      const merged=cleanOld+'\n\n---\n\n'+raw;
      await editPost(editTarget.id,merged,auth);
      console.log('Edited post #'+editTarget.postNumber+' (appended '+raw.length+'ch)');
    }else{
      await postReply(TID,raw,auth);
      console.log('Posted new reply');
    }
    state.lastVersion=ver;state.lastPosted=new Date().toISOString();
    saveState(state);
    fs.appendFileSync(SUM,'Forum: posted v'+ver+' update'+(lastOwn?' (edited #'+lastOwn.postNumber+')':' (new reply)')+'\n');
  }catch(e){console.error('Failed:',e.message);fs.appendFileSync(SUM,'Forum update failed: '+e.message+'\n')}
}
main().catch(e=>{console.error('Fatal:',e.message);process.exit(1)});
