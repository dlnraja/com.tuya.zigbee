#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path');
const{fetchWithRetry}=require('./retry-helper');
const{getForumAuth,refreshCsrf,authHeaders,fmtCk,FORUM}=require('./forum-auth');
const{textSimilarity,isDuplicateContent,MAX_POST_SIZE,smartMergePost,callAI}=require('./ai-helper');
const{sanitize}=require('./sanitize-forum');
const TID=140352;
const SUM=process.env.GITHUB_STEP_SUMMARY||'/dev/null';
const STATE_FILE=path.join(__dirname,'..','state','forum-update-state.json');
const CD_FILE=path.join(__dirname,'..','state','forum-post-cooldown.json');
function checkGlobalCooldown(){try{const j=JSON.parse(fs.readFileSync(CD_FILE,'utf8'));if(j.t&&Date.now()-j.t<1800000){console.log('Global cooldown: last post '+Math.round((Date.now()-j.t)/60000)+'m ago');return false}}catch{}return true}
function setGlobalCooldown(){try{fs.mkdirSync(path.dirname(CD_FILE),{recursive:true});fs.writeFileSync(CD_FILE,JSON.stringify({t:Date.now(),iso:new Date().toISOString(),src:'post-forum-update'}))}catch{}}
const strip=h=>(h||'').replace(/<[^>]+>/g,'').trim();
function loadState(){try{return JSON.parse(fs.readFileSync(STATE_FILE,'utf8'))}catch{return{}}}
function saveState(s){fs.mkdirSync(path.dirname(STATE_FILE),{recursive:true});fs.writeFileSync(STATE_FILE,JSON.stringify(s,null,2)+'\n')}
const getHeaders=authHeaders;

async function getLastOwnPost(tid){
  try{
    const r=await fetchWithRetry(FORUM+'/t/'+tid+'.json',{},{retries:2,label:'lastOwn'});
    if(!r.ok)return null;
    const d=await r.json();const highest=d.highest_post_number;if(!highest)return null;
    const from=Math.max(1,highest-15);
    const r2=await fetchWithRetry(FORUM+'/t/'+tid+'/'+from+'.json',{},{retries:2,label:'lastOwnPosts'});
    if(!r2.ok)return null;
    const posts=(await r2.json()).post_stream?.posts||[];
    const sorted=posts.sort((a,b)=>b.post_number-a.post_number);
    const own=sorted.find(p=>p.username==='dlnraja');
    if(own)return{id:own.id,postNumber:own.post_number,raw:own.raw||strip(own.cooked||'')};
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
function cleanChangelog(t){
  return sanitize(t);
}
function parseChangelog(cl){
  cl=cleanChangelog(cl);
  const numbered=cl.match(/\(\d+\)\s*[^(]+/g);
  if(numbered&&numbered.length>1)return numbered.map(s=>s.replace(/^\(\d+\)\s*/,'').trim()).filter(Boolean);
  const sentences=cl.split(/\.\s+/).map(s=>s.trim().replace(/\.$/,'')).filter(s=>s.length>15);
  if(sentences.length>1)return sentences;
  return[cl.trim()];
}

function buildForumPost(ver,cl,stats,url){
  const items=parseChangelog(cl);
  const fmt=n=>typeof n==='number'?n.toLocaleString('en-US'):n;
  // Vary the opening to avoid repetitive bot-like posts
  const openers=['Just pushed **v'+ver+'** to the [test channel]('+url+').','**v'+ver+'** is up on [test]('+url+').','New build out — **v'+ver+'** on [test]('+url+').','Dropped **v'+ver+'** on the [test channel]('+url+') just now.'];
  const opener=openers[Math.floor(Math.random()*openers.length)];
  let body=opener+'\n\n';
  if(items.length>1){body+=items.join(', ')+'.\n\n'}
  else if(cl)body+=cl+'\n\n';
  body+='Covers a huge range of Tuya devices at this point.\n<!-- bot-update -->';
  return body;
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
  // Global cooldown check (shared with forum-responder.js)
  if(!checkGlobalCooldown()&&!process.env.FORCE_POST){console.log('Skipping (global cooldown)');fs.appendFileSync(SUM,'Forum: skipped (global cooldown)\n');return}
  try{
    if(auth.type==='session')await refreshCsrf(auth);
    const lastOwn=await getLastOwnPost(TID);
    // v5.12.1: Content-level version dedup — skip if existing post already mentions this version
    if(lastOwn&&lastOwn.raw&&lastOwn.raw.includes('v'+ver)){console.log('Post already contains v'+ver+', skipping');fs.appendFileSync(SUM,'Forum: skipped (v'+ver+' Mapped in post)\n');state.lastVersion=ver;saveState(state);return}
    if(lastOwn){
      if(!lastOwn.raw.includes('<!-- bot-update -->') && !lastOwn.raw.includes('<!-- bot-')) {
        console.log('Last dlnraja post appears to be manual. Creating new reply instead of editing.');
        await postReply(TID,raw,auth);
      } else {
        const m=smartMergePost(lastOwn.raw,raw);
        console.log('SmartMerge:',m.reason);
        if(m.action==='skip'){console.log('Skipping ('+m.reason+')');fs.appendFileSync(SUM,'Forum: skipped ('+m.reason+')\n');return}
        
        // v5.13.5: GHOSTWRITER ORGANIC MERGE
        // Ask AI to weave the new update into the existing post naturally
        console.log('  🤖 Ghostwriter: organic merge...');
        const contentToHumanize = `CURRENT POST CONTENT:\n${lastOwn.raw.replace(/<!-- bot-update -->/g, '')}\n\nNEW RELEASE UPDATE:\n${raw}`;
        const humanizePrompt = `You ARE dlnraja, the solo developer. You are updating your latest forum post to announce v${ver}.
1. INTEGRATION: Rewrite the entire post to weave the NEW RELEASE UPDATE into the CURRENT CONTENT organically. Mention the "Nexus Awakening" v7.2.5 milestone and the new "Nexus Visual Ecosystem" imagery for all drivers if this is the first mention of it.
2. STYLE: Casual, direct, short sentences. Developer-to-developer tone. No corporate fluff.
3. STRUCTURE: Use paragraphs. No bullet lists for the main text.
4. VERSIONING: Keep the "Update: v[VERSION] pushed to Test!" line at the top of the newest section.
5. TAIL: Keep the "Covers a huge range of Tuya devices..." mention. 
6. SILENT BARRIER: Never mention bots, AI, or automated scripts.
Return ONLY the final post text.`;
        
        try {
          const hRes = await callAI(contentToHumanize, humanizePrompt, { maxTokens: 4000, complexity: 'high' });
          if (hRes && hRes.text && hRes.text !== 'AI_OFFLINE_OR_LIMIT_REACHED') {
            m.content = sanitize(hRes.text) + '\n<!-- bot-update -->';
            console.log('  ✅ Ghostwriter successful (merged, model: ' + hRes.model + ')');
          } else {
            console.log('  ⚠️ Ghostwriter failed or offline, using smartMerge default.');
          }
        } catch(e) {
          console.log('  ⚠️ Ghostwriter error:', e.message);
        }

        await editPost(lastOwn.id,m.content,auth);
        console.log('Edited post #'+lastOwn.postNumber+' ('+m.reason+')');
      }
    }else{
      // Fresh reply also gets humanized
      let freshRaw = raw;
      console.log('  🤖 Ghostwriter: fresh reply...');
      const freshPrompt = `You ARE dlnraja, developer of the app. Write a short, casual forum reply to announce v${ver}.
Talk like a human dev. No corporate greeting. No bullet lists. No "Key features".
Mention the version and the specific changes: ${cl}.
Return ONLY the text.`;
      
      try {
        const hRes = await callAI(raw, freshPrompt, { maxTokens: 2000 });
        if (hRes && hRes.text && hRes.text !== 'AI_OFFLINE_OR_LIMIT_REACHED') {
          freshRaw = sanitize(hRes.text) + '\n<!-- bot-update -->';
          console.log('  ✅ Ghostwriter successful (new reply)');
        }
      } catch(e) {}

      await postReply(TID,freshRaw,auth);
      console.log('Posted new reply (no existing dlnraja post found)');
    }
    setGlobalCooldown();
    state.lastVersion=ver;state.lastPosted=new Date().toISOString();
    saveState(state);
    fs.appendFileSync(SUM,'Forum: posted v'+ver+' update'+(lastOwn?' (edited #'+lastOwn.postNumber+')':' (new reply)')+'\n');
  }catch(e){console.error('Failed:',e.message);fs.appendFileSync(SUM,'Forum update failed: '+e.message+'\n')}
}
main().catch(e=>{console.error('Fatal:',e.message);process.exit(1)});
