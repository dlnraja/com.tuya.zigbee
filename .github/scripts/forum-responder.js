const fs=require('fs'),path=require('path');
const {getForumAuth,refreshCsrf,fmtCk,FORUM}=require('./forum-auth');
const{fetchWithRetry}=require('./retry-helper');
const SKIP=['dlnraja','system','discobot'];
const MAX_REPLIES_TOTAL=2,DELAY=30000;
const REPLY_COOLDOWN_MS=3600000; // 1h min between replies to same topic
const SIMILARITY_THRESHOLD=0.6; // block if reply >60% similar to recent post
const STATE=path.join(__dirname,'..','state','forum-state.json');
const DDIR=path.join(__dirname,'..','..','drivers');
const SD=path.join(__dirname,'..','state');
const loadState=()=>{try{return JSON.parse(fs.readFileSync(STATE,'utf8'))}catch{return{topics:{},replyLog:[]}}};
const saveState=s=>{fs.mkdirSync(path.dirname(STATE),{recursive:true});fs.writeFileSync(STATE,JSON.stringify(s,null,2)+'\n')};
const{buildFullIndex,extractAllFP}=require('./load-fingerprints');
const{validateReply}=require('./reply-quality-gate');
const{gatherAll,formatForAI}=require('./gather-intelligence');

// v5.11.29: Load expectations reference for decision-making
function loadExpectationsRef(){
  try{return JSON.parse(fs.readFileSync(path.join(SD,'expectations-ref.json'),'utf8'))}
  catch{return null}
}
const strip=h=>(h||'').replace(/<br\s*\/?>/gi,'\n').replace(/<\/p>/gi,'\n').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").trim();
const exImgs=h=>{const u=[];const re=/<img[^>]+src="([^"]+)"/gi;let m;while((m=re.exec(h||''))!==null)u.push(m[1]);return u};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const{callAI,analyzeImage}=require('./ai-helper');

function buildIndex(){
  const{mfrIdx,pidIdx,allMfrs,allPids}=buildFullIndex(DDIR);
  return{idx:mfrIdx,pidx:pidIdx,allMfrs,allPids};
}

async function fetchNewPosts(tid,since){
  const r=await fetchWithRetry(FORUM+'/t/'+tid+'.json',{},{retries:3,label:'topic'});
  if(!r.ok)throw new Error('Fetch:'+r.status);
  const d=await r.json();
  if(d.closed||d.archived)return{posts:[],closed:true};
  if(d.highest_post_number<=since)return{posts:[],closed:false};
  const r2=await fetchWithRetry(FORUM+'/t/'+tid+'/'+(since+1)+'.json',{},{retries:2,label:'posts'});
  if(!r2.ok)throw new Error('Posts:'+r2.status);
  const posts=(await r2.json()).post_stream?.posts?.filter(p=>p.post_number>since)||[];
  return{posts:posts.sort((a,b)=>a.post_number-b.post_number),closed:false};
}

// Anti-spam: check if we already replied recently in this topic
function checkCooldown(state,tid){
  const log=state.replyLog||[];
  const recent=log.filter(e=>e.tid===tid&&Date.now()-new Date(e.ts).getTime()<REPLY_COOLDOWN_MS);
  if(recent.length){
    console.log('  ⏳ Cooldown: replied to T'+tid+' '+Math.round((Date.now()-new Date(recent[0].ts).getTime())/60000)+'m ago');
    return false;
  }
  return true;
}
function logReply(state,tid,postId){
  if(!state.replyLog)state.replyLog=[];
  state.replyLog.push({tid,postId,ts:new Date().toISOString()});
  // Keep only last 50 entries
  if(state.replyLog.length>50)state.replyLog=state.replyLog.slice(-50);
}
// Anti-spam: check if topic already has a recent dlnraja reply in fetched posts
function hasRecentOwnReply(posts){
  return posts.some(p=>p.username==='dlnraja');
}
// Anti-spam: simple similarity check (Jaccard on words)
function textSimilarity(a,b){
  const wa=new Set((a||'').toLowerCase().split(/\s+/)),wb=new Set((b||'').toLowerCase().split(/\s+/));
  if(!wa.size||!wb.size)return 0;
  let inter=0;for(const w of wa)if(wb.has(w))inter++;
  return inter/(wa.size+wb.size-inter);
}

function getHeaders(auth,json){
  const h=auth.type==='apikey'?{'User-Api-Key':auth.key}
    :{'X-CSRF-Token':auth.csrf,'X-Requested-With':'XMLHttpRequest',Cookie:fmtCk(auth.cookies)};
  if(json)h['Content-Type']='application/json';
  return h;
}

async function postReply(tid,replyTo,content,auth){
  const r=await fetchWithRetry(FORUM+'/posts',{method:'POST',headers:getHeaders(auth,true),
    body:JSON.stringify({topic_id:tid,raw:content,reply_to_post_number:replyTo})},{retries:3,label:'reply'});
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error('Post:'+r.status+' '+JSON.stringify(d).substring(0,200));
  return d;
}

// EDIT existing post instead of creating new one (prevents consecutive messages)
async function editPost(postId,newContent,auth){
  const r=await fetchWithRetry(FORUM+'/posts/'+postId,{method:'PUT',headers:getHeaders(auth,true),
    body:JSON.stringify({post:{raw:newContent}})},{retries:3,label:'editPost'});
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error('Edit:'+r.status+' '+JSON.stringify(d).substring(0,200));
  return d;
}

// Find the last post by dlnraja in a topic to decide: edit vs new post
async function getLastOwnPost(tid){
  try{
    const r=await fetchWithRetry(FORUM+'/t/'+tid+'.json',{},{retries:2,label:'lastOwn'});
    if(!r.ok)return null;
    const d=await r.json();
    const highest=d.highest_post_number;
    if(!highest)return null;
    // Fetch last few posts
    const from=Math.max(1,highest-5);
    const r2=await fetchWithRetry(FORUM+'/t/'+tid+'/'+from+'.json',{},{retries:2,label:'lastOwnPosts'});
    if(!r2.ok)return null;
    const posts=(await r2.json()).post_stream?.posts||[];
    // Check if the VERY LAST post is from dlnraja
    const sorted=posts.sort((a,b)=>b.post_number-a.post_number);
    if(sorted[0]?.username==='dlnraja'){
      return{id:sorted[0].id,postNumber:sorted[0].post_number,
        raw:sorted[0].raw||strip(sorted[0].cooked||'')};
    }
    return null;
  }catch{return null}
}

// v5.11.28: Batched fallback — merge FP results + intelligence into ONE reply
function batchedFallback(postInfos,ver){
  const found=new Map(),miss=new Map(),fuzzyInfo=new Map();
  for(const pi of postInfos)for(const[fp,v]of Object.entries(pi.fpResults)){
    if(fp.startsWith('_')&&!fp.startsWith('_T'))continue;
    if(v.found)found.set(fp,v.drivers);else miss.set(fp,true);
    if(v.fuzzyFrom)fuzzyInfo.set(fp,v.fuzzyFrom);
  }
  if(!found.size&&!miss.size)return null;
  const users=[...new Set(postInfos.map(p=>p.post.username))];
  let m=users.length?'Hi '+users.map(u=>'@'+u).join(', ')+',\n\n':'';
  if(found.size){m+='These fingerprints are supported in v'+ver+':\n';for(const[fp,d]of found){const fz=fuzzyInfo.get(fp);m+='- `'+fp+'`'+(fz?' (matched from `'+fz+'`)':'')+' → **'+d.slice(0,4).join(', ')+'**\n';}m+='\nYou\'ll need to remove and re-pair, making sure to select the correct device type.\n\n';}
  if(miss.size){
    // Check if unsupported FPs are known in external DBs
    let extInfo='';
    try{
      const ctx=gatherAll();
      const extFPs=new Set((ctx.externalSources?.topUnsupported||[]).map(u=>u.fp));
      const inExt=[...miss.keys()].filter(k=>extFPs.has(k));
      if(inExt.length)extInfo=' ('+inExt.map(f=>'`'+f+'`').join(', ')+' known in Z2M/ZHA — on our radar)';
    }catch{}
    m+='Not yet supported: '+[...miss.keys()].map(k=>'`'+k+'`').join(', ')+extInfo+'\nIf you can share a [device interview](https://tools.developer.homey.app/tools/zigbee), I can look into adding support.\n\n';
  }
  // No promotional footer — keep it natural
  return m;
}

// v5.11.28: Batched AI — ALL posts + full intelligence → ONE rich reply
async function batchAI(postInfos,ver){
  let sys='';try{sys=fs.readFileSync(path.join(__dirname,'system-prompt.txt'),'utf8').replace(/\{\{VERSION\}\}/g,ver)}catch{}

  // Gather intelligence from ALL automated scans
  let intel='';
  try{const ctx=gatherAll();intel=formatForAI(ctx);console.log('Intel context:',intel.length,'chars')}catch(e){console.warn('Intel gather:',e.message)}

  let ctx='Write ONE combined forum reply. Use @mentions. Skip thank-you posts.\n';
  ctx+='Include relevant info from the INTELLIGENCE section: new devices found in Z2M/ZHA/deCONZ, ';
  ctx+='open PRs from JohanBendz/community, fork findings, recurring issue patterns, ';
  ctx+='and any community updates. If a user\'s device is mentioned in external DBs or PRs, say so.\n';
  ctx+='For unsupported devices, check if Z2M/ZHA/deCONZ has them — if yes, mention it\'s on the radar.\n\n';

  // Add intelligence context
  if(intel)ctx+=intel+'\n';

  // v5.11.29: Add expectations reference for informed decisions
  const expRef=loadExpectationsRef();
  if(expRef){
    ctx+='## DECISION REFERENCE (consult before replying)\n';
    if(expRef.decisions?.length){
      ctx+='Known correct implementations:\n';
      for(const d of expRef.decisions)ctx+='- '+d.device+' → **'+d.driver+'** (NOT '+d.wrongDriver+'): '+d.reason+'\n';
    }
    if(expRef.pending?.length){
      ctx+='Pending user issues:\n';
      for(const p of expRef.pending)ctx+='- @'+p.user+': '+p.device+' ('+p.status+')\n';
    }
    ctx+='\n';
  }

  // Add user posts
  ctx+='## NEW FORUM POSTS\n\n';
  for(const pi of postInfos){
    ctx+='---\n#'+pi.post.post_number+' @'+pi.post.username+':\n'+pi.text+'\n';
    if(Object.keys(pi.fpResults).length)ctx+='FP DB results: '+JSON.stringify(pi.fpResults)+'\n';
    if(pi.imgCtx)ctx+='Image analysis: '+pi.imgCtx+'\n';
  }
  ctx+='\n---\nWrite ONE comprehensive reply (max 500 words). Include:\n';
  ctx+='1. Direct answers to user questions (FP status, device support)\n';
  ctx+='2. Relevant community info woven naturally (new devices from Z2M/deCONZ, open PRs)\n';
  ctx+='3. Known issues/patterns if relevant (inversion, battery, double-division)\n';
  ctx+='4. NO signature, NO footer, NO promotional links — just end naturally\n';
  ctx+='Reply or NULL if no device-related content:';

  const r=await callAI(ctx,sys,{maxTokens:2000});
  if(r&&r.text.trim().toUpperCase()!=='NULL')return r.text.trim();
  return batchedFallback(postInfos,ver);
}

async function main(){
  let dry=process.env.DRY_RUN==='true';
  const tids=(process.env.FORUM_TOPICS||'140352,26439,146735,89271,54018,12758,85498').split(',').map(Number);
  // IMPORTANT: Only reply on OUR OWN thread (140352). Never post on other people's threads!
  const replyTids=new Set((process.env.REPLY_TOPICS||'140352').split(',').map(Number));
  let ver='?';try{ver=JSON.parse(fs.readFileSync(path.join(__dirname,'..','..','app.json'),'utf8')).version}catch{}
  console.log('=== Forum Responder v5.11.29 (edit-or-reply, anti-spam) ===');
  console.log(dry?'DRY':'LIVE','| v'+ver);
  const{idx,pidx,allMfrs,allPids}=buildIndex();
  console.log('Index:',idx.size,'mfrs,',pidx.size,'pids');
  const state=loadState();
  let auth=null;
  if(!dry){auth=await getForumAuth();if(!auth){console.log('::warning::No auth');dry=true;}}
  let totalP=0,totalR=0;const summary=[];

  for(const tid of tids){
    if(totalR>=MAX_REPLIES_TOTAL)break;
    const ts=state.topics[tid]||{lastProcessed:0};
    const last=ts.lastProcessed;
    console.log('\n-- T'+tid+' (last:#'+last+') --');
    let fr;try{fr=await fetchNewPosts(tid,last)}catch(e){console.error(e.message);continue}
    if(!fr.posts.length){state.topics[tid]={...ts,lastRun:new Date().toISOString()};continue}
    if(fr.closed)replyTids.delete(tid);
    // Phase 1: Collect device-related posts
    let maxP=last;const devPosts=[];
    for(const p of fr.posts){
      maxP=Math.max(maxP,p.post_number);
      if(SKIP.includes(p.username)){console.log(' #'+p.post_number,p.username,'skip');continue}
      totalP++;
      const text=strip(p.cooked);
      const fp=extractAllFP(text,allMfrs,allPids);
      const isDev=fp.mfr.length>0||fp.pid.length>0||/device|sensor|switch|pair|recogni|unknown|diag|interview|zigbee|tuya|invert|battery/i.test(text);
      if(!isDev){console.log(' #'+p.post_number,p.username,'chat');continue}
      const fpR={};
      for(const m of fp.mfr){const d=idx.get(m)||[];const fuzzyFrom=fp.mfr._fuzzy?.[m];fpR[m]={found:d.length>0,drivers:d,fuzzyFrom};if(fuzzyFrom)console.log('  ~',fuzzyFrom,'->',m,d.length?d.join(','):'?');else console.log('  ',m,d.length?d.join(','):'?')}
      for(const pid of fp.pid){const d=pidx.get(pid)||[];fpR[pid]={found:d.length>0,drivers:d,type:'productId'}}
      let imgCtx=null;
      const imgs=exImgs(p.cooked);
      if(imgs.length){try{imgCtx=await analyzeImage(imgs[0].startsWith('/')?FORUM+imgs[0]:imgs[0],'Extract Tuya fingerprints. JSON or NULL.')}catch{}}
      devPosts.push({post:p,text,fp,fpResults:fpR,imgCtx});
    }
    console.log('  Device:',devPosts.length,'/',fr.posts.length);
    if(!devPosts.length){state.topics[tid]={...ts,lastProcessed:maxP,lastRun:new Date().toISOString()};continue}
    // Anti-spam: skip if we already replied recently
    if(!checkCooldown(state,tid)){state.topics[tid]={...ts,lastProcessed:maxP,lastRun:new Date().toISOString()};continue}
    // Anti-spam: skip if our own reply already exists in the fetched batch
    if(hasRecentOwnReply(fr.posts)){console.log('  ⏳ Already replied in this batch, skipping');state.topics[tid]={...ts,lastProcessed:maxP,lastRun:new Date().toISOString()};continue}
    // Phase 2: ONE batched reply
    let reply=null;
    try{reply=await batchAI(devPosts,ver)}catch(e){console.error('AI:',e.message)}
    if(!reply){state.topics[tid]={...ts,lastProcessed:maxP,lastRun:new Date().toISOString()};continue}
    // Phase 2b: Quality gate — validate reply against driver DB before posting
    const allOrigText=devPosts.map(d=>d.text).join(' ');
    const qg=validateReply(reply,allOrigText);
    if(!qg.valid){
      console.log('  QualityGate:',qg.warnings.length,'warnings');
      for(const w of qg.warnings)console.log('    ⚠',w);
      if(qg.corrected){reply=qg.corrected;console.log('  Using corrected reply')}
    }
    console.log('  Reply:',reply.length,'ch for',devPosts.length,'posts');
    const lastP=devPosts[devPosts.length-1].post;
    const uList=devPosts.map(d=>d.post.username).join(',');
    if(!replyTids.has(tid)){summary.push({t:tid,u:uList,a:'scan'});}
    else if(dry){console.log('[DRY]\n'+reply.substring(0,300));summary.push({t:tid,u:uList,a:'dry'});}
    else{
      let ok=false;
      // Check if last post in topic is already from dlnraja — EDIT instead of new post
      const lastOwn=await getLastOwnPost(tid);
      for(let i=0;i<3;i++){
        try{
          if(auth.type==='session')await refreshCsrf(auth);
          if(lastOwn){
            // EDIT existing post: append new content with separator
            const merged=lastOwn.raw+'\n\n---\n\n'+reply;
            const r=await editPost(lastOwn.id,merged,auth);
            console.log('  Edited #'+lastOwn.postNumber+' (appended '+reply.length+'ch)');
            summary.push({t:tid,u:uList,a:'edited',id:lastOwn.id});logReply(state,tid,lastOwn.id);totalR++;ok=true;break;
          }else{
            const r=await postReply(tid,lastP.post_number,reply,auth);
            console.log('  Posted:',r.id);summary.push({t:tid,u:uList,a:'replied',id:r.id});logReply(state,tid,r.id);totalR++;ok=true;await sleep(DELAY);break;
          }
        }catch(e){
          console.warn('  Try'+(i+1)+':',e.message);
          if(/consecutive|closed|gone wrong/.test(e.message)){console.warn('  Block');break;}
          if(i<2)await sleep(5000*(i+1));
        }
      }
      if(!ok)summary.push({t:tid,u:uList,a:'failed'});
    }
    state.topics[tid]={...ts,lastProcessed:maxP,lastRun:new Date().toISOString()};
  }
  saveState(state);
  console.log('\n=== Done: scanned',totalP,', replied',totalR,'===');
  for(const s of summary)console.log(' T'+s.t,'@'+s.u,s.a);
  if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,'processed='+totalP+'\nresponded='+totalR+'\n');
  if(process.env.GITHUB_STEP_SUMMARY){
    let md='## Forum Responder\n| Metric | Value |\n|---|---|\n| Scanned | '+totalP+' |\n| Replied | '+totalR+' |\n| Mode | '+(dry?'Dry':'Live')+' |\n';
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,md);
  }
}
main().catch(e=>{console.error('Fatal:',e.message);process.exit(1)});
