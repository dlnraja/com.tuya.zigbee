/**
 * Forum Updater - Posts status updates to forum thread #140352
 * Uses forum-auth.js for Athom SSO authentication
 * v5.12.1: Fixed dedup to fetch LAST 15 posts (not first page)
 */
const fs=require('fs'),path=require('path');
const {getForumAuth,refreshCsrf,fmtCk,FORUM}=require('./forum-auth');
const{fetchWithRetry}=require('./retry-helper');
const{textSimilarity,isDuplicateContent,MAX_POST_SIZE,smartMergePost}=require('./ai-helper');
const{sanitize}=require('./sanitize-forum');
const{fetchThreadContext,formatThreadContext}=require('./thread-context');
const TOPIC=140352;
const strip=h=>(h||'').replace(/<[^>]+>/g,'').trim();

async function getHeaders(auth,json){
  const h=auth.type==='apikey'
    ?{'User-Api-Key':auth.key}
    :{'X-CSRF-Token':auth.csrf,'X-Requested-With':'XMLHttpRequest',Cookie:fmtCk(auth.cookies)};
  if(json)h['Content-Type']='application/json';
  return h;
}

async function postToForum(content,auth){
  if(TOPIC!==140352){console.error('BLOCKED: refusing to post on T'+TOPIC);return{}}
  const h=await getHeaders(auth,true);
  const r=await fetchWithRetry(FORUM+'/posts',{method:'POST',headers:h,
    body:JSON.stringify({topic_id:TOPIC,raw:content})},{retries:3,label:'forumPost'});
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error('Post failed: '+r.status+' '+JSON.stringify(d).substring(0,200));
  return d;
}

const{callAI}=require('./ai-helper');
const COOLDOWN_FILE=path.join(__dirname,'..','state','forum-post-cooldown.json');
function checkCooldown(){try{const s=JSON.parse(fs.readFileSync(COOLDOWN_FILE,'utf8'));if(s.t&&Date.now()-s.t<1800000)return false}catch{}return true}
function setCooldown(){try{fs.mkdirSync(path.dirname(COOLDOWN_FILE),{recursive:true});fs.writeFileSync(COOLDOWN_FILE,JSON.stringify({t:Date.now(),iso:new Date().toISOString(),src:'forum-updater'}))}catch{}}

// v5.12.1: Fetch LAST 15 posts to find most recent dlnraja post (not first page)
async function getLastOwnPost(){
  try{
    const r=await fetchWithRetry(FORUM+'/t/'+TOPIC+'.json',{},{retries:2,label:'lastOwn'});
    if(!r.ok)return null;
    const d=await r.json();const highest=d.highest_post_number;if(!highest)return null;
    const from=Math.max(1,highest-15);
    const r2=await fetchWithRetry(FORUM+'/t/'+TOPIC+'/'+from+'.json',{},{retries:2,label:'lastOwnPosts'});
    if(!r2.ok)return null;
    const posts=(await r2.json()).post_stream?.posts||[];
    const sorted=posts.sort((a,b)=>b.post_number-a.post_number);
    const own=sorted.find(p=>p.username==='dlnraja');
    if(own)return{id:own.id,postNumber:own.post_number,raw:own.raw||strip(own.cooked||'')};
    return null;
  }catch{return null}
}

async function main(){
  const dryRun=process.env.DRY_RUN!=='false';
  let appVersion='unknown';
  try{appVersion=JSON.parse(fs.readFileSync(path.join(__dirname,'..','..','app.json'),'utf8')).version}catch{}
  console.log('=== Forum Updater v5.12.1 ===');
  console.log('Mode:',dryRun?'DRY RUN':'LIVE');

  const stateDir=path.join(__dirname,'..','state');
  const reports={};
  for(const f of['github-scan-report.json','enrichment-report.json']){
    const p=path.join(stateDir,f);
    if(fs.existsSync(p))try{reports[f.replace('.json','')]=JSON.parse(fs.readFileSync(p,'utf8'))}catch{}
  }

  if(!Object.keys(reports).length){console.log('No scanner reports found, nothing to post');return}

  // v5.12.2: Fetch recent conversation for context-aware updates
  let threadCtxStr='';
  try{const tr0=await fetchWithRetry(FORUM+'/t/'+TOPIC+'.json',{},{retries:1,label:'highest'});const highest=tr0.ok?(await tr0.json()).highest_post_number||9999:9999;const tc=await fetchThreadContext(TOPIC,highest+1);if(tc.length){threadCtxStr='\n\nRecent forum conversation:\n'+tc.map(p=>'#'+p.num+' '+(p.isOwn?'[YOU]':'@'+p.user)+': '+p.text.substring(0,200)).join('\n');console.log('Thread context:',tc.length,'posts')}}catch{}
  const sysPrompt='You are Dylan, dev of a Tuya Zigbee fork for Homey (v'+appVersion+'). Write a 2-3 sentence casual update. No headers, no emoji, no tables, no lists. NEVER say: bot, automated, scan, scrape, API, pipeline, workflow, AI. NEVER include exact counts or stats (no "X fingerprints added", "Y issues found", "Z emails processed"). Keep it vague and human ("picked up some new devices", "fixed a few things"). English only.';
  const aiRes=await callAI(JSON.stringify(reports,null,2)+threadCtxStr,sysPrompt);
  const aiPost=aiRes?aiRes.text:null;

  const fallback='Quick update on **v'+appVersion+'**:\n\n'+
    (reports['github-scan-report']?'Went through some GitHub reports and community contributions — picked up a few new device fingerprints along the way.\n\n':'')+
    (reports['enrichment-report']?'Also cross-referenced a few external sources for new devices.\n\n':'')+
    'As usual, remove and re-pair if anything acts up after updating.';

  const content=sanitize(aiPost||fallback);
  console.log('Post content:',content.length,'chars');

  if(dryRun){
    console.log('[DRY RUN] Would post:\n---\n'+content+'\n---');
  }else{
    console.log('Getting forum auth...');
    let auth=await getForumAuth();
    if(auth&&auth.type==='session')auth=await refreshCsrf(auth);
    if(!auth){console.error('::warning::No forum auth available');process.exit(0)}
    if(!checkCooldown()){console.log('Skipping (cooldown active)');return}
    // v5.12.1: Fixed — fetch last 15 posts to find recent dlnraja post
    try{
      const lastOwn=await getLastOwnPost();
      if(lastOwn){
        const m=smartMergePost(lastOwn.raw,content);
        console.log('SmartMerge:',m.reason);
        if(m.action==='skip'){console.log('Skip ('+m.reason+')');return}
        const eh=await getHeaders(auth,true);
        await fetchWithRetry(FORUM+'/posts/'+lastOwn.id,{method:'PUT',headers:eh,body:JSON.stringify({post:{raw:m.content}})},{retries:2,label:'edit'});
        console.log('Edited post #'+lastOwn.postNumber);setCooldown();return;
      }
    }catch(e){console.log('Dedup check failed:',e.message)}
    const result=await postToForum(content,auth);
    console.log('Posted id:',result.id);setCooldown();
  }
}

main().catch(e=>{console.error('Fatal:',e.message);process.exit(1)});


