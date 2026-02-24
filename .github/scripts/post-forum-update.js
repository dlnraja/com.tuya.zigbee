#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path');
const{fetchWithRetry}=require('./retry-helper');
const {getForumAuth,fmtCk,FORUM}=require('./forum-auth');
const TOPIC=140352;
const SUM=process.env.GITHUB_STEP_SUMMARY||'/dev/null';

async function postReply(tid,raw,auth){
  const h=auth.type==='apikey'
    ?{'Content-Type':'application/json','User-Api-Key':auth.key}
    :{'Content-Type':'application/json','X-CSRF-Token':auth.csrf,'Cookie':fmtCk(auth.cookies),'X-Requested-With':'XMLHttpRequest'};
  const r=await fetchWithRetry(FORUM+'/posts',{method:'POST',headers:h,body:JSON.stringify({topic_id:tid,raw})},{retries:3,label:'forumPost'});
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error('Post failed: '+r.status+' '+JSON.stringify(d).slice(0,200));
  return JSON.stringify(d);
}

async function main(){
  console.log('Getting forum auth...');
  const auth=await getForumAuth();
  if(!auth){console.log('Forum post skipped (no auth)');fs.appendFileSync(SUM,'Forum post skipped (no HOMEY_EMAIL/HOMEY_PASSWORD or DISCOURSE_API_KEY)\n');return;}
  console.log('Auth OK');
  const ver=process.env.APP_VERSION||require(path.join(process.cwd(),'app.json')).version;
  let cl=process.env.CHANGELOG||'';
  if(!cl){try{const cj=JSON.parse(fs.readFileSync(path.join(process.cwd(),'.homeychangelog.json'),'utf8'));if(cj[ver]&&cj[ver].en)cl=cj[ver].en;else{const k=Object.keys(cj).sort((a,b)=>b.localeCompare(a,undefined,{numeric:true}));if(k[0]&&cj[k[0]].en)cl=cj[k[0]].en;}}catch(e){}}
  if(!cl)cl='v'+ver+' - See changelog for details';
  const url=process.env.PUBLISH_URL||'https://homey.app/a/com.dlnraja.tuya.zigbee/test/';
  const raw='## Universal Tuya Zigbee v'+ver+'\n\n'+cl+'\n\n**Install:** [Test version]('+url+')\n\n> After updating, remove and re-pair devices that had issues.\n> Report bugs: [GitHub Issues](https://github.com/dlnraja/com.tuya.zigbee/issues)';
  console.log('Posting to forum topic',TOPIC);
  const r=await postReply(TOPIC,raw,auth);
  console.log('Posted:',r.slice(0,100));
  fs.appendFileSync(SUM,'Forum: posted v'+ver+' update to topic '+TOPIC+'\n');
}
main().catch(e=>{console.error('Forum post failed:',e.message);process.exit(1);});
