#!/usr/bin/env node
'use strict';
const{getForumAuth,refreshCsrf,fmtCk,FORUM}=require('./forum-auth');
const{fetchWithRetry}=require('./retry-helper');
const{callAI}=require('./ai-helper');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const TID=140352,MY='dlnraja',DRY=process.env.DRY_RUN==='true';
const strip=h=>(h||'').replace(/<[^>]+>/g,'').trim();
function getH(a,j){const h=a.type==='apikey'?{'User-Api-Key':a.key}:{'X-CSRF-Token':a.csrf,'X-Requested-With':'XMLHttpRequest',Cookie:fmtCk(a.cookies)};if(j)h['Content-Type']='application/json';return h}
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
const mine=posts.filter(p=>p.username===MY).slice(-3);
if(mine.length<2){console.log('Only '+mine.length+' post(s) - skip');return}
console.log('Merging '+mine.length+' posts: #'+mine.map(p=>p.post_number).join(', #'));
// Get raw content of each
const raws=[];
for(const p of mine){
  const rr=await fetchWithRetry(FORUM+'/posts/'+p.id+'.json',{headers:getH(auth)},{retries:2,label:'raw'+p.id});
  const pd=await rr.json();raws.push(pd.raw||strip(pd.cooked||''));await sleep(2000);
}
console.log('Raw lengths:',raws.map(r=>r.length));
const combined=raws.join('\n\n---\n\n');
// Humanize with AI
const prompt='You are Dylan, a French dev of Universal Tuya Zigbee on Homey. Rewrite this into ONE short update. Remove duplicates, merge naturally. Write casual plain text — NO ## headers, NO tables, NO emoji walls, NO bullet-point lists. Short sentences, say "I" naturally. Max 300 words. NO bot references, NO signature, NO footer links.';
const ai=await callAI(combined,prompt,{maxTokens:2048,complexity:'medium'});
const final=ai?ai.text:combined;
console.log('Merged content:',final.length,'chars (model:',ai?.model||'none',')');
if(DRY){console.log('[DRY]\n'+final);return}
// Edit the LAST post with merged content
const keep=mine[mine.length-1];
const er=await fetchWithRetry(FORUM+'/posts/'+keep.id,{method:'PUT',headers:getH(auth,true),body:JSON.stringify({post:{raw:final}})},{retries:3,label:'edit'});
if(!er.ok)throw new Error('Edit failed:'+er.status);
console.log('Edited post #'+keep.post_number+' with merged content');
await sleep(5000);
// Blank the other posts (can't delete, but can edit to minimal)
for(const p of mine.slice(0,-1)){
  const blank='*(merged into post #'+keep.post_number+')*';
  await sleep(10000);
  const br=await fetchWithRetry(FORUM+'/posts/'+p.id,{method:'PUT',headers:getH(auth,true),body:JSON.stringify({post:{raw:blank}})},{retries:3,label:'blank'+p.id});
  console.log(br.ok?'Blanked #'+p.post_number:'Blank failed #'+p.post_number+': '+br.status);
}
console.log('Done! Merged '+mine.length+' posts into #'+keep.post_number);
}
main().catch(e=>{console.error('Fatal:',e.message);process.exit(1)});
