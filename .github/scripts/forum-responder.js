const fs=require('fs'),path=require('path');
const {getForumAuth,fmtCk,FORUM}=require('./forum-auth');
const{fetchWithRetry}=require('./retry-helper');
const MODEL='gemini-2.0-flash';
const SKIP=['dlnraja','system','discobot'];
const MAX_REPLIES=5,DELAY=15000;
const STATE=path.join(__dirname,'..','state','forum-state.json');
const DDIR=path.join(__dirname,'..','..','drivers');

const loadState=()=>{try{return JSON.parse(fs.readFileSync(STATE,'utf8'))}catch{return{topics:{}}}};
const saveState=s=>{fs.mkdirSync(path.dirname(STATE),{recursive:true});fs.writeFileSync(STATE,JSON.stringify(s,null,2)+'\n')};
const strip=h=>(h||'').replace(/<br\s*\/?>/gi,'\n').replace(/<\/p>/gi,'\n').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").trim();
const extractFP=t=>({mfr:[...new Set(t.match(/_T[A-Z][A-Za-z0-9]{3,5}_[a-z0-9]{4,16}/g)||[])],pid:[...new Set(t.match(/\bTS[0-9]{4}[A-Z]?\b/g)||[])]});
const exImgs=h=>{const u=[];const re=/<img[^>]+src="([^"]+)"/gi;let m;while((m=re.exec(h||''))!==null)u.push(m[1]);return u};
const exLinks=h=>{const u=[];const re=/href="(https?:\/\/[^"]+)"/gi;let m;while((m=re.exec(h||''))!==null)u.push(m[1]);return u};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

function buildIndex(){
  const idx=new Map(),pidx=new Map();
  if(!fs.existsSync(DDIR))return{idx,pidx};
  for(const d of fs.readdirSync(DDIR)){
    const f=path.join(DDIR,d,'driver.compose.json');
    if(!fs.existsSync(f))continue;
    const c=fs.readFileSync(f,'utf8');
    for(const m of(c.match(/"_T[A-Za-z0-9_]+"/g)||[]))
      {const k=m.replace(/"/g,'');if(!idx.has(k))idx.set(k,[]);if(!idx.get(k).includes(d))idx.get(k).push(d)}
    for(const m of(c.match(/"TS[0-9]{4}[A-Z]?"/g)||[]))
      {const k=m.replace(/"/g,'');if(!pidx.has(k))pidx.set(k,[]);if(!pidx.get(k).includes(d))pidx.get(k).push(d)}
  }
  return{idx,pidx};
}

async function fetchNewPosts(topicId,since){
  const r=await fetchWithRetry(FORUM+'/t/'+topicId+'.json',{},{retries:3,label:'forumTopic'});
  if(!r.ok)throw new Error('Topic fetch failed: '+r.status);
  const d=await r.json();
  const highest=d.highest_post_number;
  if(highest<=since)return[];
  const r2=await fetchWithRetry(FORUM+'/t/'+topicId+'/'+(since+1)+'.json',{},{retries:2,label:'forumPosts'});
  if(!r2.ok)throw new Error('Posts fetch failed: '+r2.status);
  const d2=await r2.json();
  const posts=(d2.post_stream?.posts||[]).filter(p=>p.post_number>since);
  if(posts.length&&Math.max(...posts.map(p=>p.post_number))<highest){
    const r3=await fetchWithRetry(FORUM+'/t/'+topicId+'/'+(Math.max(...posts.map(p=>p.post_number))+1)+'.json',{},{retries:2,label:'forumMore'});
    if(r3.ok){const d3=await r3.json();
      for(const p of(d3.post_stream?.posts||[]).filter(p=>p.post_number>since))
        if(!posts.find(e=>e.post_number===p.post_number))posts.push(p);
    }
  }
  return posts.sort((a,b)=>a.post_number-b.post_number);
}

async function postReply(topicId,replyTo,content,auth){
  const h=auth.type==='apikey'
    ?{'Content-Type':'application/json','User-Api-Key':auth.key}
    :{'Content-Type':'application/json','X-CSRF-Token':auth.csrf,'X-Requested-With':'XMLHttpRequest',Cookie:fmtCk(auth.cookies)};
  const r=await fetchWithRetry(FORUM+'/posts',{method:'POST',headers:h,
    body:JSON.stringify({topic_id:topicId,raw:content,reply_to_post_number:replyTo})},{retries:3,label:'forumReply'});
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error('Post failed: '+r.status+' '+JSON.stringify(d).substring(0,200));
  return d;
}

const{callAI,analyzeImage}=require('./ai-helper');

function templateFallback(post,results,appVersion){
  const found=Object.entries(results).filter(([,v])=>v.found);
  const missing=Object.entries(results).filter(([,v])=>!v.found);
  if(!found.length&&!missing.length)return null;
  let msg='';
  if(found.length){
    msg+='Your device fingerprint(s) are **already supported** in v'+appVersion+':\n\n';
    for(const[fp,v]of found){const dl=v.drivers.length>5?v.drivers.slice(0,5).join(', ')+' (+'+( v.drivers.length-5)+' more)':v.drivers.join(', ');msg+='- `'+fp+'` -> **'+dl+'**\n';}
    msg+='\nPlease **remove and re-pair** your device, selecting the correct device type above.\n';
  }
  if(missing.length){
    msg+='The following fingerprint(s) are **not yet supported**: '+missing.map(([fp])=>''+fp+'').join(', ')+'\n\n';
    msg+='Please provide a **device interview** from [Developer Tools](https://tools.developer.homey.app) and open a [GitHub issue](https://github.com/dlnraja/com.tuya.zigbee/issues).\n';
  }
  msg+='\n---\n*Bot Universal Tuya Zigbee (v'+appVersion+') - [Install test](https://homey.app/a/com.dlnraja.tuya.zigbee/test/) | [GitHub](https://github.com/dlnraja/com.tuya.zigbee/issues)*';
  return msg;
}

async function analyzeWithGemini(post,results,appVersion){
  const text=strip(post.cooked);
  let sys='';
  try{sys=fs.readFileSync(path.join(__dirname,'system-prompt.txt'),'utf8').replace(/\{\{VERSION\}\}/g,appVersion)}catch{}
  const usr='Post #'+post.post_number+' by @'+post.username+':\n'+text+'\n\nFingerprint results:\n'+JSON.stringify(results,null,2)+'\n\nGenerate reply or NULL:';
  const res=await callAI(usr,sys,{maxTokens:1024});
  if(res){
    console.log('   AI response via '+res.model);
    if(res.text.toUpperCase()==='NULL')return null;
    return res.text;
  }
  console.log('   All AI failed, using template fallback');
  return templateFallback(post,results,appVersion);
}

async function main(){
  let dryRun=process.env.DRY_RUN!=='false';
  const topicIds=(process.env.FORUM_TOPICS||'140352,26439,146735,89271,54018,12758,85498').split(',').map(Number);
  const replyTopics=new Set((process.env.REPLY_TOPICS||'140352,26439').split(',').map(Number));
  let appVersion='unknown';
  try{appVersion=JSON.parse(fs.readFileSync(path.join(__dirname,'..','..','app.json'),'utf8')).version}catch{}
  console.log('=== Forum Auto-Responder ===');
  console.log('Mode:',dryRun?'DRY RUN':'LIVE','| Topics:',topicIds.join(','),'| App: v'+appVersion);

  const{idx,pidx}=buildIndex();
  console.log('Index:',idx.size,'manufacturers,',pidx.size,'productIds');

  const state=loadState();
  let auth=null;
  if(!dryRun){
    console.log('Getting forum auth...');
    auth=await getForumAuth();
    if(!auth){console.log('::warning::No forum auth - running scan-only (no replies)');dryRun=true;}
  }

  let totalP=0,totalR=0;const summary=[];

  for(const tid of topicIds){
    const ts=state.topics[tid]||{lastProcessed:0};
    const last=ts.lastProcessed;
    console.log('\n-- Topic',tid,'(last: #'+last+') --');

    let posts;
    try{posts=await fetchNewPosts(tid,last)}
    catch(e){console.error('Fetch error:',e.message);continue}
    console.log('New posts:',posts.length);
    if(!posts.length){state.topics[tid]={...ts,lastRun:new Date().toISOString()};continue}

    let maxP=last;
    for(const p of posts){
      if(SKIP.includes(p.username)){maxP=Math.max(maxP,p.post_number);console.log(' #'+p.post_number,'by',p.username,'-> SKIP owner');continue}
      console.log(' #'+p.post_number,'by',p.username);
      totalP++;

      const text=strip(p.cooked);
      const fp=extractFP(text);
      const isDevice=fp.mfr.length>0||fp.pid.length>0||/device|sensor|switch|button|pair|recogni|unknown|diag|interview|manufacturer|driver|zigbee|tuya/i.test(text);
      if(!isDevice){maxP=Math.max(maxP,p.post_number);console.log('   -> not device-related');continue}

      const res={};
      for(const m of fp.mfr){const d=idx.get(m)||[];res[m]={found:d.length>0,drivers:d};console.log('  ',m,'->',d.length?d.join(','):'NOT FOUND')}
      for(const p2 of fp.pid){const d=pidx.get(p2)||[];res[p2]={found:d.length>0,drivers:d,type:'productId'}}

      // Analyze images and links
      const imgs=exImgs(p.cooked);let imgCtx=null;
      if(imgs.length){const iu=imgs[0].startsWith('/')?FORUM+imgs[0]:imgs[0];try{imgCtx=await analyzeImage(iu,'Extract Tuya fingerprints from image. JSON or NULL.')}catch{}}
      const links=exLinks(p.cooked).filter(l=>l.includes('github.com')||l.includes('zigbee2mqtt')||l.includes('blakadder'));
      if(imgCtx)res._imageAnalysis=imgCtx;
      if(links.length)res._externalLinks=links.slice(0,3);

      let reply;
      try{console.log('   Gemini...');reply=await analyzeWithGemini(p,res,appVersion)}
      catch(e){console.error('   Gemini error:',e.message);continue}
      if(!reply){maxP=Math.max(maxP,p.post_number);console.log('   -> no response needed');continue}

      console.log('   Response:',reply.length,'chars');
      if(!replyTopics.has(tid)){console.log('   -> scan-only topic, no reply');summary.push({n:p.post_number,u:p.username,a:'scan_only'});maxP=Math.max(maxP,p.post_number);continue}
      if(totalR>=MAX_REPLIES){console.log('   -> MAX_REPLIES reached');continue}

      if(dryRun){
        console.log('   [DRY] Would post:\n---\n'+reply+'\n---');
        summary.push({n:p.post_number,u:p.username,a:'dry_reply'});
        maxP=Math.max(maxP,p.post_number);
      }else{
        let posted=false;
        for(let ri=0;ri<3;ri++){
          try{
            const r=await postReply(tid,p.post_number,reply,auth);
            console.log('   Posted id:',r.id);
            summary.push({n:p.post_number,u:p.username,a:'replied',id:r.id});
            totalR++;maxP=Math.max(maxP,p.post_number);posted=true;
            await sleep(DELAY);break;
          }catch(e){
            console.warn('   Post try '+(ri+1)+':',e.message);
            if(ri<2)await sleep(5000*(ri+1));
          }
        }
        if(!posted)summary.push({n:p.post_number,u:p.username,a:'failed'});
      }
    }
    state.topics[tid]={...ts,lastProcessed:maxP,lastRun:new Date().toISOString()};
  }

  saveState(state);
  console.log('\n=== Done: processed',totalP,', replied',totalR,'===');
  if(summary.length)for(const s of summary)console.log(' #'+s.n,'@'+s.u,s.a,s.id?'id:'+s.id:'',s.err||'');

  if(process.env.GITHUB_OUTPUT){
    fs.appendFileSync(process.env.GITHUB_OUTPUT,'processed='+totalP+'\nresponded='+totalR+'\n');
  }
  if(process.env.GITHUB_STEP_SUMMARY){
    let md='## Forum Auto-Responder\n| Metric | Value |\n|---|---|\n| Processed | '+totalP+' |\n| Replied | '+totalR+' |\n| Mode | '+(dryRun?'Dry Run':'Live')+' |\n';
    if(summary.length){md+='\n### Actions\n| Post | User | Action |\n|---|---|---|\n';
      for(const s of summary)md+='| #'+s.n+' | @'+s.u+' | '+s.a+' |\n'}
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,md);
  }
}

main().catch(e=>{console.error('Fatal:',e.message);process.exit(1)});
