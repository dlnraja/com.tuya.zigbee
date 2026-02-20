/**
 * Forum Updater - Posts coherent status updates to dlnraja's forum thread #140352
 * Aggregates results from all scanners and posts a summary
 */
const fs=require('fs'),path=require('path');
const FORUM='https://community.homey.app';
const TOPIC=140352;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

function extractCookies(res){
  const c={};
  const headers=typeof res.headers.getSetCookie==='function'?res.headers.getSetCookie():
    (res.headers.get('set-cookie')||'').split(/,(?=[^ ])/);
  for(const h of headers){const i=h.indexOf('='),s=h.indexOf(';');
    if(i>0)c[h.substring(0,i).trim()]=h.substring(i+1,s>0?s:undefined).trim()}
  return c;
}
function fmtCookies(c){return Object.entries(c).map(([k,v])=>k+'='+v).join('; ')}

async function discourseLogin(email,password){
  const r1=await fetch(FORUM+'/session/csrf',{headers:{'X-Requested-With':'XMLHttpRequest',Accept:'application/json'}});
  if(!r1.ok)throw new Error('CSRF failed: '+r1.status);
  const csrf=(await r1.json()).csrf;
  const ck1=extractCookies(r1);
  const r2=await fetch(FORUM+'/session',{method:'POST',redirect:'manual',
    headers:{'Content-Type':'application/x-www-form-urlencoded','X-CSRF-Token':csrf,'X-Requested-With':'XMLHttpRequest',Cookie:fmtCookies(ck1)},
    body:'login='+encodeURIComponent(email)+'&password='+encodeURIComponent(password)});
  if(!r2.ok&&r2.status!==302)throw new Error('Login failed: '+r2.status);
  const ck2={...ck1,...extractCookies(r2)};
  if(!ck2._t)throw new Error('No session cookie');
  return{csrf,cookies:ck2};
}

async function postToForum(content,auth){
  const r=await fetch(FORUM+'/posts',{method:'POST',
    headers:{'Content-Type':'application/json','X-CSRF-Token':auth.csrf,'X-Requested-With':'XMLHttpRequest',Cookie:fmtCookies(auth.cookies)},
    body:JSON.stringify({topic_id:TOPIC,raw:content})});
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

  // Load all scanner reports
  const stateDir=path.join(__dirname,'..','state');
  const reports={};
  for(const f of['github-scan-report.json','enrichment-report.json']){
    const p=path.join(stateDir,f);
    if(fs.existsSync(p))try{reports[f.replace('.json','')]=JSON.parse(fs.readFileSync(p,'utf8'))}catch{}
  }

  if(!Object.keys(reports).length){console.log('No scanner reports found, nothing to post');return}

  // Generate forum post with Gemini
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
    const em=process.env.HOMEY_EMAIL,pw=process.env.HOMEY_PASSWORD;
    if(!em||!pw){console.error('HOMEY_EMAIL/HOMEY_PASSWORD required');process.exit(1)}
    console.log('Logging in...');
    const auth=await discourseLogin(em,pw);
    console.log('Posting to forum...');
    const result=await postToForum(content,auth);
    console.log('Posted id:',result.id);
  }
}

main().catch(e=>{console.error('Fatal:',e.message);process.exit(1)});
