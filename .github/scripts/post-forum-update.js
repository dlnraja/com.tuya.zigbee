#!/usr/bin/env node
'use strict';
const https=require('https'),fs=require('fs'),path=require('path');
const {getForumAuth,fmtCk,FORUM}=require('./forum-auth');
const HOST='community.homey.app',TOPIC=140352;
const SUM=process.env.GITHUB_STEP_SUMMARY||'/dev/null';

function httpsReq(opts,body){
  return new Promise((ok,fail)=>{
    const req=https.request(opts,r=>{
      let b='';r.on('data',c=>b+=c);
      r.on('end',()=>ok({status:r.statusCode,headers:r.headers,body:b}));
    });
    req.on('error',fail);
    if(body)req.write(body);
    req.end();
  });
}

async function postReply(tid,raw,auth){
  const d=JSON.stringify({topic_id:tid,raw});
  const h=auth.type==='apikey'
    ?{'Content-Type':'application/json','User-Api-Key':auth.key,'Content-Length':Buffer.byteLength(d)}
    :{'Content-Type':'application/json','X-CSRF-Token':auth.csrf,'Cookie':fmtCk(auth.cookies),'X-Requested-With':'XMLHttpRequest','Content-Length':Buffer.byteLength(d)};
  const r=await httpsReq({hostname:HOST,port:443,path:'/posts.json',method:'POST',headers:h},d);
  if(r.status>=300)throw new Error('Post failed: '+r.status+': '+r.body.slice(0,200));
  return r.body;
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
main().catch(e=>{console.error('Forum post failed:',e.message);process.exit(0);});
