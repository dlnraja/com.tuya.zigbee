const fs=require('fs'),path=require('path');
const {getForumAuth,refreshCsrf,fmtCk,FORUM}=require('./forum-auth');
const{fetchWithRetry}=require('./retry-helper');
const SKIP=['dlnraja','system','discobot'];
const MAX_REPLIES_TOTAL=2,DELAY=30000;
const STATE=path.join(__dirname,'..','state','forum-state.json');
const DDIR=path.join(__dirname,'..','..','drivers');
const loadState=()=>{try{return JSON.parse(fs.readFileSync(STATE,'utf8'))}catch{return{topics:{}}}};
const saveState=s=>{fs.mkdirSync(path.dirname(STATE),{recursive:true});fs.writeFileSync(STATE,JSON.stringify(s,null,2)+'\n')};
const{buildFullIndex,extractAllFP}=require('./load-fingerprints');
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

async function postReply(tid,replyTo,content,auth){
  const h=auth.type==='apikey'?{'Content-Type':'application/json','User-Api-Key':auth.key}
    :{'Content-Type':'application/json','X-CSRF-Token':auth.csrf,'X-Requested-With':'XMLHttpRequest',Cookie:fmtCk(auth.cookies)};
  const r=await fetchWithRetry(FORUM+'/posts',{method:'POST',headers:h,
    body:JSON.stringify({topic_id:tid,raw:content,reply_to_post_number:replyTo})},{retries:3,label:'reply'});
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error('Post:'+r.status+' '+JSON.stringify(d).substring(0,200));
  return d;
}

// v5.11.27: Batched fallback — merge all FP results into ONE reply
function batchedFallback(postInfos,ver){
  const found=new Map(),miss=new Map();
  for(const pi of postInfos)for(const[fp,v]of Object.entries(pi.fpResults)){
    if(fp.startsWith('_')&&!fp.startsWith('_T'))continue;
    if(v.found)found.set(fp,v.drivers);else miss.set(fp,true);
  }
  if(!found.size&&!miss.size)return null;
  const users=[...new Set(postInfos.map(p=>p.post.username))];
  let m=users.length?'Hi '+users.map(u=>'@'+u).join(', ')+',\n\n':'';
  if(found.size){m+='**Supported** in v'+ver+':\n';for(const[fp,d]of found)m+='- `'+fp+'` → **'+d.slice(0,4).join(', ')+'**\n';m+='\nRemove and re-pair, select correct type.\n\n';}
  if(miss.size){m+='**Not yet supported**: '+[...miss.keys()].map(k=>'`'+k+'`').join(', ')+'\nShare a [device interview](https://tools.developer.homey.app/tools/zigbee) + [GitHub issue](https://github.com/dlnraja/com.tuya.zigbee/issues/new).\n\n';}
  m+='---\n*Bot Universal Tuya Zigbee (v'+ver+') — [Install test](https://homey.app/a/com.dlnraja.tuya.zigbee/test/) | [GitHub](https://github.com/dlnraja/com.tuya.zigbee/issues)*';
  return m;
}

// v5.11.27: Batched AI — ALL posts → ONE reply (anti-spam)
async function batchAI(postInfos,ver){
  let sys='';try{sys=fs.readFileSync(path.join(__dirname,'system-prompt.txt'),'utf8').replace(/\{\{VERSION\}\}/g,ver)}catch{}
  let ctx='ALL new posts in this topic. Write ONE combined reply. Use @mentions. Skip thank-you posts.\n\n';
  for(const pi of postInfos){
    ctx+='---\n#'+pi.post.post_number+' @'+pi.post.username+':\n'+pi.text+'\n';
    if(Object.keys(pi.fpResults).length)ctx+='FP: '+JSON.stringify(pi.fpResults)+'\n';
    if(pi.imgCtx)ctx+='Img: '+pi.imgCtx+'\n';
  }
  ctx+='\n---\nONE reply (max 400 words) or NULL:';
  const r=await callAI(ctx,sys,{maxTokens:1500});
  if(r&&r.text.trim().toUpperCase()!=='NULL')return r.text.trim();
  return batchedFallback(postInfos,ver);
}

async function main(){
  let dry=process.env.DRY_RUN==='true';
  const tids=(process.env.FORUM_TOPICS||'140352,26439,146735,89271,54018,12758,85498').split(',').map(Number);
  const replyTids=new Set((process.env.REPLY_TOPICS||'140352,26439,146735,89271').split(',').map(Number));
  let ver='?';try{ver=JSON.parse(fs.readFileSync(path.join(__dirname,'..','..','app.json'),'utf8')).version}catch{}
  console.log('=== Forum Responder v5.11.27 (1 reply/topic) ===');
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
      for(const m of fp.mfr){const d=idx.get(m)||[];fpR[m]={found:d.length>0,drivers:d};console.log('  ',m,d.length?d.join(','):'?')}
      for(const pid of fp.pid){const d=pidx.get(pid)||[];fpR[pid]={found:d.length>0,drivers:d,type:'productId'}}
      let imgCtx=null;
      const imgs=exImgs(p.cooked);
      if(imgs.length){try{imgCtx=await analyzeImage(imgs[0].startsWith('/')?FORUM+imgs[0]:imgs[0],'Extract Tuya fingerprints. JSON or NULL.')}catch{}}
      devPosts.push({post:p,text,fp,fpResults:fpR,imgCtx});
    }
    console.log('  Device:',devPosts.length,'/',fr.posts.length);
    if(!devPosts.length){state.topics[tid]={...ts,lastProcessed:maxP,lastRun:new Date().toISOString()};continue}
    // Phase 2: ONE batched reply
    let reply=null;
    try{reply=await batchAI(devPosts,ver)}catch(e){console.error('AI:',e.message)}
    if(!reply){state.topics[tid]={...ts,lastProcessed:maxP,lastRun:new Date().toISOString()};continue}
    console.log('  Reply:',reply.length,'ch for',devPosts.length,'posts');
    const lastP=devPosts[devPosts.length-1].post;
    const uList=devPosts.map(d=>d.post.username).join(',');
    if(!replyTids.has(tid)){summary.push({t:tid,u:uList,a:'scan'});}
    else if(dry){console.log('[DRY]\n'+reply.substring(0,300));summary.push({t:tid,u:uList,a:'dry'});}
    else{
      let ok=false;
      for(let i=0;i<3;i++){
        try{
          if(auth.type==='session')await refreshCsrf(auth);
          const r=await postReply(tid,lastP.post_number,reply,auth);
          console.log('  Posted:',r.id);summary.push({t:tid,u:uList,a:'replied',id:r.id});totalR++;ok=true;await sleep(DELAY);break;
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
