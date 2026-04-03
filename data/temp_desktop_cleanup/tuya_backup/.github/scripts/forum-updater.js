/**
 * Forum Updater - Posts status updates to forum thread #140352
 * Uses forum-auth.js for Athom SSO authentication
 */
const fs=require('fs'),path=require('path');
const {getForumAuth,refreshCsrf,fmtCk,FORUM}=require('./forum-auth');
const{fetchWithRetry}=require('./retry-helper');
const{textSimilarity,isDuplicateContent,MAX_POST_SIZE,smartMergePost}=require('./ai-helper');
const{sanitize}=require('./sanitize-forum');
const TOPIC=140352;

async function postToForum(content,auth){
  if(TOPIC!==140352){console.error('BLOCKED: refusing to post on T'+TOPIC);return{}}
  const h=auth.type==='apikey'
    ?{'Content-Type':'application/json','User-Api-Key':auth.key}
    :{'Content-Type':'application/json','X-CSRF-Token':auth.csrf,'X-Requested-With':'XMLHttpRequest',Cookie:fmtCk(auth.cookies)};
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

async function main(){
  const dryRun=process.env.DRY_RUN!=='false';
  let appVersion='unknown';
  try{appVersion=JSON.parse(fs.readFileSync(path.join(__dirname,'..','..','app.json'),'utf8')).version}catch{}
  console.log('=== Forum Updater ===');
  console.log('Mode:',dryRun?'DRY RUN':'LIVE');

  const stateDir=path.join(__dirname,'..','state');
  const reports={};
  for(const f of['github-scan-report.json','enrichment-report.json']){
    const p=path.join(stateDir,f);
    if(fs.existsSync(p))try{reports[f.replace('.json','')]=JSON.parse(fs.readFileSync(p,'utf8'))}catch{}
  }

  if(!Object.keys(reports).length){console.log('No scanner reports found, nothing to post');return}

  const sysPrompt='You are Dylan, dev of a Tuya Zigbee fork for Homey (v'+appVersion+'). Write a 2-3 sentence casual update. No headers, no emoji, no tables, no lists. NEVER say: bot, automated, scan, scrape, API, pipeline, workflow, AI. NEVER include exact counts or stats (no "X fingerprints added", "Y issues found", "Z emails processed"). Keep it vague and human ("picked up some new devices", "fixed a few things"). English only.';
  const aiRes=await callAI(JSON.stringify(reports,null,2),sysPrompt);
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
    // Check last own post — edit instead of duplicate
    try{
      const tr=await fetchWithRetry(FORUM+'/t/'+TOPIC+'.json',{headers:auth.type==='apikey'?{'User-Api-Key':auth.key}:{Cookie:fmtCk(auth.cookies)}},{retries:2,label:'lastOwn'});
      if(tr.ok){const td=await tr.json();const ps=(td.post_stream&&td.post_stream.posts)||[];const own=ps.filter(p=>p.username==='dlnraja');
        if(own.length){const last=own[own.length-1];const m=smartMergePost(last.raw,content);
          console.log('SmartMerge:',m.reason);
          if(m.action==='skip'){console.log('Skip ('+m.reason+')');return}
          const eh=auth.type==='apikey'?{'Content-Type':'application/json','User-Api-Key':auth.key}:{'Content-Type':'application/json','X-CSRF-Token':auth.csrf,'X-Requested-With':'XMLHttpRequest',Cookie:fmtCk(auth.cookies)};
          await fetchWithRetry(FORUM+'/posts/'+last.id,{method:'PUT',headers:eh,body:JSON.stringify({post:{raw:m.content}})},{retries:2,label:'edit'});
          console.log('Edited post #'+last.post_number);setCooldown();return;
        }
      }
    }catch(e){console.log('Dedup check failed:',e.message)}
    const result=await postToForum(content,auth);
    console.log('Posted id:',result.id);setCooldown();
  }
}

main().catch(e=>{console.error('Fatal:',e.message);process.exit(1)});
