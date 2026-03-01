const fs=require('fs'),path=require('path');
const {getForumAuth,refreshCsrf,fmtCk,FORUM}=require('./forum-auth');
const{fetchWithRetry}=require('./retry-helper');
const SKIP=['dlnraja','system','discobot'];
const MAX_REPLIES_TOTAL=1,DELAY=30000;
const REPLY_COOLDOWN_MS=43200000; // 12h min between replies to same topic (runs 2x/day)
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
// v5.12.15: Load forum intel (common issues from ALL threads, read-only)
function loadForumIntel(){
  try{return JSON.parse(fs.readFileSync(path.join(SD,'forum-intel-report.json'),'utf8'))}
  catch{return null}
}
const strip=h=>(h||'').replace(/<br\s*\/?>/gi,'\n').replace(/<\/p>/gi,'\n').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").trim();
const exImgs=h=>{const u=[];const re=/<img[^>]+src="([^"]+)"/gi;let m;while((m=re.exec(h||''))!==null)u.push(m[1]);return u};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const{callAI,callAIEnsemble,analyzeImage,getAIBudget,textSimilarity,isDuplicateContent,MAX_POST_SIZE,smartMergePost}=require('./ai-helper');
function cleanReply(r){
  if(!r)return r;
  r=r.replace(/^---+$/gm,'');
  r=r.replace(/GitHub\s*#\d+\s*[—–-]\s*[^\n]*/gi,'');
  r=r.replace(/\[#\d+\]\([^)]*github[^)]*\)\s*[^\n]*/gi,'');
  r=r.replace(/Open (?:PRs?|issues?):?\s*[^\n]*/gi,'');
  // Strip references to other forum topics/threads — never mention them in output
  r=r.replace(/\bT\d{4,6}\b/g,(m)=>m==='T140352'?m:'');
  r=r.replace(/community\.homey\.app\/t\/[^\s)\]]+/gi,'');
  r=r.replace(/\b(?:topic|thread)\s*(?:#|ID)?\s*\d{4,6}\b/gi,(m)=>/140352/.test(m)?m:'');
  r=r.replace(/\n{3,}/g,'\n\n');
  return r.trim();
}

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
// v5.12.x: Cross-check global cooldown file (shared with post-forum-update.js and forum-updater.js)
function checkGlobalCooldown(){
  try{const f=path.join(SD,'forum-post-cooldown.json');const j=JSON.parse(fs.readFileSync(f,'utf8'));
    if(j.t&&Date.now()-j.t<1800000){console.log('  ⏳ Global cooldown: last post '+Math.round((Date.now()-j.t)/60000)+'m ago');return false}}
  catch{}return true;
}
function setGlobalCooldown(){
  try{const f=path.join(SD,'forum-post-cooldown.json');fs.mkdirSync(SD,{recursive:true});
    fs.writeFileSync(f,JSON.stringify({t:Date.now(),iso:new Date().toISOString(),src:'forum-responder'}))}catch{}
}

function getHeaders(auth,json){
  const h=auth.type==='apikey'?{'User-Api-Key':auth.key}
    :{'X-CSRF-Token':auth.csrf,'X-Requested-With':'XMLHttpRequest',Cookie:fmtCk(auth.cookies)};
  if(json)h['Content-Type']='application/json';
  return h;
}

const ALLOWED_POST_TOPICS=new Set([140352]);
async function postReply(tid,replyTo,content,auth){
  if(!ALLOWED_POST_TOPICS.has(tid)){console.error('BLOCKED: refusing to post on T'+tid+' (not in whitelist)');return{id:null,blocked:true}}
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
    const from=Math.max(1,highest-15);
    const r2=await fetchWithRetry(FORUM+'/t/'+tid+'/'+from+'.json',{},{retries:2,label:'lastOwnPosts'});
    if(!r2.ok)return null;
    const posts=(await r2.json()).post_stream?.posts||[];
    // Find the most recent dlnraja post (not necessarily the very last)
    const sorted=posts.sort((a,b)=>b.post_number-a.post_number);
    const own=sorted.find(p=>p.username==='dlnraja');
    if(own){
      return{id:own.id,postNumber:own.post_number,
        raw:own.raw||strip(own.cooked||''),isLast:sorted[0]?.id===own.id};
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
  let m=users.map(u=>'@'+u).join(' ')+' ';
  if(found.size){
    const fps=[...found.entries()];
    if(fps.length===1)m+=fps[0][0]+' is already in v'+ver+' under **'+fps[0][1][0]+'**. ';
    else{m+='these are already in v'+ver+': ';for(const[fp,d]of fps)m+=fp+' ('+d[0]+'), ';m=m.replace(/, $/,'. ')}
    m+='\n\n';
  }
  if(miss.size){
    let extInfo='';
    try{const ctx=gatherAll();const extFPs=new Set((ctx.externalSources?.topUnsupported||[]).map(u=>u.fp));const inExt=[...miss.keys()].filter(k=>extFPs.has(k));if(inExt.length)extInfo=' — I see '+(inExt.length===1?'it':'them')+' in Z2M/ZHA so shouldn\'t be hard to add'}catch{}
    const mks=[...miss.keys()];
    m+=(mks.length===1?mks[0]+' isn\'t':mks.join(', ')+' aren\'t')+' in there yet'+extInfo+'. If you can grab a [device interview](https://tools.developer.homey.app/tools/zigbee) I\'ll get it sorted.\n\n';
  }
  m+='As always, remove and re-pair if something acts up after updating.';
  return m;
}

// v5.11.28: Batched AI — ALL posts + full intelligence → ONE rich reply
async function batchAI(postInfos,ver){
  let sys='';try{sys=fs.readFileSync(path.join(__dirname,'system-prompt.txt'),'utf8').replace(/\{\{VERSION\}\}/g,ver)}catch{}

  // Gather intelligence from ALL automated scans
  let intel='';
  try{const ctx=gatherAll();intel=formatForAI(ctx);console.log('Intel context:',intel.length,'chars')}catch(e){console.warn('Intel gather:',e.message)}

  let ctx='You\'re Dylan typing a quick forum reply between coding sessions. No markdown headers, no bullet lists, no tables. Plain casual text only.\n';
  ctx+='Sound human: "yeah that one\'s in there", "I\'ll check", "oh nice, added that last week". @mention inline, never as greeting.\n';
  ctx+='SPAM TRIGGERS (will get flagged): "Hi @user,", bullet lists, numbered steps, "Thank you for", "Please provide", ## headers, "Happy to help", "As always,".\n';
  ctx+='Max 200 words. Vary your opening every time. End naturally, no footer/signature.\n\n';

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

  // v5.12.15: Add forum intel (common issues from other threads, read-only)
  const forumIntel=loadForumIntel();
  if(forumIntel){
    ctx+='## COMMUNITY INTEL (from scanning other forum threads)\n';
    if(forumIntel.topPainPoints?.length)ctx+='Top issues users face: '+forumIntel.topPainPoints.join(', ')+'\n';
    if(forumIntel.wifiRequestCount)ctx+='WiFi device requests: '+forumIntel.wifiRequestCount+'\n';
    if(forumIntel.pairingIssueCount)ctx+='Pairing issues reported: '+forumIntel.pairingIssueCount+'\n';
    ctx+='\n';
  }

  // Add user posts
  ctx+='## NEW FORUM POSTS\n\n';
  for(const pi of postInfos){
    ctx+='---\n#'+pi.post.post_number+' @'+pi.post.username+':\n'+pi.text+'\n';
    if(Object.keys(pi.fpResults).length)ctx+='FP DB results: '+JSON.stringify(pi.fpResults)+'\n';
    if(pi.imgCtx)ctx+='Image analysis: '+pi.imgCtx+'\n';
  }
  ctx+='\n---\nWrite ONE reply, max 200 words. Sound like a real person, not support.\n';
  ctx+='If missing sensor readings, casually ask for app logs to see DPs.\n';
  ctx+='Never repeat same advice per device. Mention re-pair at most once, casually.\n';
  ctx+='Do NOT start with a greeting. Do NOT end with a signature. Just stop talking.\n';
  ctx+='Reply or NULL if nothing device-related:';

  // Use ensemble (parallel multi-AI) for richer replies when available, fallback to single callAI
  const r=await callAIEnsemble(ctx,sys,{maxTokens:2000}).catch(()=>null)||await callAI(ctx,sys,{maxTokens:2000});
  if(r&&r.text.trim().toUpperCase()!=='NULL'){console.log('  AI model:',r.model);return r.text.trim()}
  return batchedFallback(postInfos,ver);
}

async function main(){
  let dry=process.env.DRY_RUN==='true';
  const tids=(process.env.FORUM_TOPICS||'140352').split(',').map(Number);
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
      const isDev=fp.mfr.length>0||fp.pid.length>0||/device|sensor|switch|pair|recogni|unknown|diag|interview|zigbee|tuya|invert|battery|fertilizer|conductivity|\bEC\b|\bDP\d|soil|moisture|air.?quality|VOC|formaldehyde/i.test(text);
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
    // Anti-spam: skip if we already replied recently (per-topic cooldown)
    if(!checkCooldown(state,tid)){state.topics[tid]={...ts,lastProcessed:maxP,lastRun:new Date().toISOString()};continue}
    // Anti-spam: skip if global cooldown active (shared with post-forum-update.js)
    if(!checkGlobalCooldown()){state.topics[tid]={...ts,lastProcessed:maxP,lastRun:new Date().toISOString()};continue}
    // Anti-spam: skip if our own reply already exists in the fetched batch
    if(hasRecentOwnReply(fr.posts)){console.log('  ⏳ Already replied in this batch, skipping');state.topics[tid]={...ts,lastProcessed:maxP,lastRun:new Date().toISOString()};continue}
    // Phase 2: ONE batched reply
    let reply=null;
    try{reply=await batchAI(devPosts,ver);if(reply)reply=cleanReply(reply)}catch(e){console.error('AI:',e.message)}
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
      // v5.12.0: smartMergePost handles dedup + size cap + trim
      let mergeResult=null;
      if(lastOwn){mergeResult=smartMergePost(lastOwn.raw,reply);if(mergeResult.action==='skip'){console.log('  ⏭ SmartMerge skip:',mergeResult.reason);state.topics[tid]={...ts,lastProcessed:maxP,lastRun:new Date().toISOString()};continue}}
      const editTarget=lastOwn?lastOwn:null;
      for(let i=0;i<3;i++){
        try{
          if(auth.type==='session')await refreshCsrf(auth);
          if(editTarget&&mergeResult){
            const r=await editPost(editTarget.id,mergeResult.content,auth);
            console.log('  Edited #'+editTarget.postNumber+' ('+mergeResult.reason+')');
            summary.push({t:tid,u:uList,a:'edited',id:editTarget.id});logReply(state,tid,editTarget.id);setGlobalCooldown();totalR++;ok=true;break;
          }else{
            const r=await postReply(tid,lastP.post_number,reply,auth);
            console.log('  Posted:',r.id);summary.push({t:tid,u:uList,a:'replied',id:r.id});logReply(state,tid,r.id);setGlobalCooldown();totalR++;ok=true;await sleep(DELAY);break;
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
  try{console.log('AI Budget:',getAIBudget())}catch{}
  console.log('\n=== Done: scanned',totalP,', replied',totalR,'===');
  for(const s of summary)console.log(' T'+s.t,'@'+s.u,s.a);
  if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,'processed='+totalP+'\nresponded='+totalR+'\n');
  if(process.env.GITHUB_STEP_SUMMARY){
    let md='## Forum Responder\n| Metric | Value |\n|---|---|\n| Scanned | '+totalP+' |\n| Replied | '+totalR+' |\n| Mode | '+(dry?'Dry':'Live')+' |\n';
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,md);
  }
}
main().catch(e=>{console.error('Fatal:',e.message);process.exit(1)});
