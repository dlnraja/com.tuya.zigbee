/**
 * Forum Updater - Posts status updates to forum thread #140352
 * Uses forum-auth.js for Athom SSO authentication
 */
const fs=require('fs'),path=require('path');
const {getForumAuth,fmtCk,FORUM}=require('./forum-auth');
const{fetchWithRetry}=require('./retry-helper');
const TOPIC=140352;

async function postToForum(content,auth){
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

  const sysPrompt='You are posting a status update on the Homey Community forum topic #140352 for the Universal Tuya Zigbee app (v'+appVersion+'). Write a coherent, professional forum post summarizing the latest automated scan results. Include: new fingerprints found from Z2M/ZHA/forks, GitHub activity summary, and any devices that need community help (interviews/diagnostics). Use Discourse markdown. Keep it under 400 words. End with the bot signature. Write in English.';
  const aiRes=await callAI(JSON.stringify(reports,null,2),sysPrompt);
  const aiPost=aiRes?aiRes.text:null;

  const fallback='## Automated Scan Report (v'+appVersion+')\n\n'+
    (reports['github-scan-report']?'**GitHub Activity**: '+
      (reports['github-scan-report'].findings?.issues?.length||0)+' issues with fingerprints, '+
      (reports['github-scan-report'].findings?.forkFPs?.length||0)+' new FPs from forks\n\n':'')+
    (reports['enrichment-report']?'**Enrichment**: '+
      (reports['enrichment-report'].totalNew||0)+' new fingerprints found from Z2M/ZHA/Blakadder\n\n':'')+
    '---\n*Bot Universal Tuya Zigbee (v'+appVersion+') - [Install test](https://homey.app/a/com.dlnraja.tuya.zigbee/test/) | [GitHub](https://github.com/dlnraja/com.tuya.zigbee/issues)*';

  const content=aiPost||fallback;
  console.log('Post content:',content.length,'chars');

  if(dryRun){
    console.log('[DRY RUN] Would post:\n---\n'+content+'\n---');
  }else{
    console.log('Getting forum auth...');
    const auth=await getForumAuth();
    if(!auth){console.error('::warning::No forum auth available');process.exit(0)}
    console.log('Posting to forum...');
    const result=await postToForum(content,auth);
    console.log('Posted id:',result.id);
  }
}

main().catch(e=>{console.error('Fatal:',e.message);process.exit(1)});
