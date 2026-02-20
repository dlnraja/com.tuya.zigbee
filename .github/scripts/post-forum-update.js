#!/usr/bin/env node
'use strict';
const https=require('https'),fs=require('fs'),path=require('path');
const HOST='community.homey.app',TOPIC=140352;
const USER=process.env.DISCOURSE_USERNAME||'dlnraja';
const KEY=process.env.DISCOURSE_API_KEY||'';
const SUM=process.env.GITHUB_STEP_SUMMARY||'/dev/null';

function post(tid,raw){
  return new Promise((ok,fail)=>{
    const d=JSON.stringify({topic_id:tid,raw});
    const req=https.request({hostname:HOST,port:443,path:'/posts.json',method:'POST',
      headers:{'Content-Type':'application/json','Api-Key':KEY,'Api-Username':USER,'Content-Length':Buffer.byteLength(d)}
    },r=>{let b='';r.on('data',c=>b+=c);r.on('end',()=>r.statusCode<300?ok(b):fail(new Error(r.statusCode+': '+b.slice(0,200))));});
    req.on('error',fail);req.write(d);req.end();
  });
}

async function main(){
  if(!KEY){console.log('DISCOURSE_API_KEY not set — skip');fs.appendFileSync(SUM,'Forum post skipped (no DISCOURSE_API_KEY)\n');return;}
  const ver=process.env.APP_VERSION||require(path.join(process.cwd(),'app.json')).version;
  const cl=process.env.CHANGELOG||'Auto-publish via GitHub Actions';
  const url=process.env.PUBLISH_URL||'https://homey.app/a/com.dlnraja.tuya.zigbee/test/';
  const raw=`## v${ver} Published\n\n**Changelog:** ${cl}\n\n**Install:** [Test version](${url})\n\n> After updating, remove and re-pair devices that had issues.\n\n*Auto-posted by GitHub Actions*`;
  console.log('Posting to forum topic',TOPIC);
  const r=await post(TOPIC,raw);
  console.log('Posted:',r.slice(0,100));
  fs.appendFileSync(SUM,`Forum: posted v${ver} update to topic ${TOPIC}\n`);
}
main().catch(e=>{console.error('Forum post failed:',e.message);process.exit(0);});
