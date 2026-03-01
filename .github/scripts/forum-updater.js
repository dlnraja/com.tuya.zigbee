/**
 * Forum Updater - Posts status updates to forum thread #140352
 * Uses forum-auth.js for Athom SSO authentication
 */
const fs=require('fs'),path=require('path');
const {getForumAuth,refreshCsrf,fmtCk,FORUM}=require('./forum-auth');
const{fetchWithRetry}=require('./retry-helper');
const{textSimilarity}=require('./ai-helper');
const{textSimilarity,isDuplicateContent,MAX_POST_SIZE,smartMergePost}=require('./ai-helper');
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

  const sysPrompt='You are the maintainer of Universal Tuya Zigbee (v'+appVersion+') posting a status update on the Homey Community forum. Write a conversational, developer-style update summarizing scan results. Include: new fingerprints found, GitHub activity, and devices needing community help. Use Discourse markdown. Keep under 400 words. NEVER mention bot/automated. No signature/footer. Write in English.';
  const aiRes=await callAI(JSON.stringify(reports,null,2),sysPrompt);
  const aiPost=aiRes?aiRes.text:null;

  const fallback='## Automated Scan Report (v'+appVersion+')\n\n'+
    (reports['github-scan-report']?'**GitHub Activity**: '+
      (reports['github-scan-report'].findings?.issues?.length||0)+' issues with fingerprints, '+
      (reports['github-scan-report'].findings?.forkFPs?.length||0)+' new FPs from forks\n\n':'')+
    (reports['enrichment-report']?'**Enrichment**: '+
      (reports['enrichment-report'].totalNew||0)+' new fingerprints found from Z2M/ZHA/Blakadder\n\n':'')+
    'Let me know if you have questions about any of these changes.';

  const content=aiPost||fallback;
  console.log('Post content:',content.length,'chars');

  if(dryRun){
    console.log('[DRY RUN] Would post:\n---\n'+content+'\n---');
  }else{
    console.log('Getting forum auth...');
    let auth=await getForumAuth();
    if(auth&&auth.type==='session')auth=await refreshCsrf(auth);
    if(!auth){console.error('::warning::No forum auth available');process.exit(0)}
    console.log('Posting to forum...');
    const result=await postToForum(content,auth);
    console.log('Posted id:',result.id);
  }
}

main().catch(e=>{console.error('Fatal:',e.message);process.exit(1)});
