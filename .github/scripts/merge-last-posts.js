#!/usr/bin/env node
'use strict';
const{getForumAuth,refreshCsrf,fmtCk,FORUM}=require('./forum-auth');
const{fetchWithRetry}=require('./retry-helper');
const fs=require('fs'),path=require('path');
const{callAI,textSimilarity}=require('./ai-helper');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const TID=140352,MY='dlnraja',DRY=process.env.DRY_RUN==='true';
const CD_FILE=path.join(__dirname,'..','state','forum-post-cooldown.json');
function setGlobalCooldown(){try{fs.mkdirSync(path.dirname(CD_FILE),{recursive:true});fs.writeFileSync(CD_FILE,JSON.stringify({t:Date.now(),iso:new Date().toISOString(),src:'merge-last-posts'}))}catch{}}
const strip=h=>(h||'').replace(/<[^>]+>/g,'').trim();
function getH(a,j){const h=a.type==='apikey'?{'User-Api-Key':a.key}:{'X-CSRF-Token':a.csrf,'X-Requested-With':'XMLHttpRequest',Cookie:fmtCk(a.cookies)};if(j)h['Content-Type']='application/json';return h}

// Remove duplicate sections within a post (split by ---)
function dedupSections(raw){
  const secs=raw.split(/\n---+\n/).map(s=>s.trim()).filter(s=>s.length>10);
  if(secs.length<2)return raw;
  const unique=[];
  for(const sec of secs){
    let dominated=false;
    for(const kept of unique){
      if(textSimilarity(sec,kept)>0.4){dominated=true;break}
    }
    if(!dominated)unique.push(sec);
  }
  const removed=secs.length-unique.length;
  if(removed>0)console.log('  Dedup: removed '+removed+'/'+secs.length+' duplicate sections');
  return unique.join('\n\n---\n\n');
}

async function main(){
let auth=await getForumAuth();
if(!auth){console.error('No auth');process.exit(1)}
if(auth.type==='session')auth=await refreshCsrf(auth);
const r=await fetchWithRetry(FORUM+'/t/'+TID+'.json',{headers:getH(auth)},{retries:2,label:'topic'});
if(!r.ok)throw new Error('Topic:'+r.status);
const d=await r.json();const hi=d.highest_post_number;
const r2=await fetchWithRetry(FORUM+'/t/'+TID+'/'+Math.max(1,hi-20)+'.json',{headers:getH(auth)},{retries:2,label:'posts'});
const posts=(await r2.json()).post_stream?.posts||[];
posts.sort((a,b)=>a.post_number-b.post_number);
const mine=posts.filter(p=>p.username===MY).slice(-5);
if(!mine.length){console.log('No own posts found');return}
console.log('Merging '+mine.length+' posts: #'+mine.map(p=>p.post_number).join(', #'));
// Get raw content of each
const raws=[];
for(const p of mine){
  const rr=await fetchWithRetry(FORUM+'/posts/'+p.id+'.json',{headers:getH(auth)},{retries:2,label:'raw'+p.id});
  const pd=await rr.json();raws.push(pd.raw||strip(pd.cooked||''));await sleep(2000);
}
console.log('Raw lengths:',raws.map(r=>r.length));
// Step 1: Dedup sections within each post first
const cleaned=raws.map(r=>dedupSections(r.replace(/\n*As always,?\s*remove and re-?pair[^\n]*/gi,'').trim()));
const combined=dedupSections(cleaned.join('\n\n---\n\n'));
console.log('After dedup:',combined.length,'chars (was',raws.reduce((a,r)=>a+r.length,0)+')');
// Humanize with AI
const prompt='You are Dylan, dev of Universal Tuya Zigbee app on Homey. Rewrite this forum content into ONE cohesive update post. Remove duplicates, merge info naturally. Sound like a real person, casual but informative. Use Discourse markdown. Max 600 words. NO bot references, NO signature.';
const ai=await callAI(combined,prompt,{maxTokens:2048,complexity:'medium'});
const final=ai?ai.text:combined;
console.log('Merged content:',final.length,'chars (model:',ai?.model||'none',')');
if(DRY){console.log('[DRY]\n'+final);return}
// Edit the LAST post with merged content
const keep=mine[mine.length-1];
const er=await fetchWithRetry(FORUM+'/posts/'+keep.id,{method:'PUT',headers:getH(auth,true),body:JSON.stringify({post:{raw:final}})},{retries:3,label:'edit'});
if(!er.ok)throw new Error('Edit failed:'+er.status);
console.log('Edited post #'+keep.post_number+' with merged content');
setGlobalCooldown();
if(mine.length>1){
await sleep(5000);
for(const p of mine.slice(0,-1)){
  const blank='*(merged into post #'+keep.post_number+')*';
  await sleep(10000);
  const br=await fetchWithRetry(FORUM+'/posts/'+p.id,{method:'PUT',headers:getH(auth,true),body:JSON.stringify({post:{raw:blank}})},{retries:3,label:'blank'+p.id});
  console.log(br.ok?'Blanked #'+p.post_number:'Blank failed #'+p.post_number+': '+br.status);
}
}
console.log('Done! '+(mine.length>1?'Merged '+mine.length+' posts into':'Cleaned up')+' #'+keep.post_number);
}
main().catch(e=>{console.error('Fatal:',e.message);process.exit(1)});
