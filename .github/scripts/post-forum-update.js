#!/usr/bin/env node
'use strict';
const https=require('https'),fs=require('fs'),path=require('path');
const HOST='community.homey.app',TOPIC=140352;
const EMAIL=process.env.HOMEY_EMAIL||'';
const PASS=process.env.HOMEY_PASSWORD||'';
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

function extractCookies(headers){
  const cookies={};
  const raw=headers['set-cookie']||[];
  for(const h of raw){
    const i=h.indexOf('='),s=h.indexOf(';');
    if(i>0)cookies[h.substring(0,i).trim()]=h.substring(i+1,s>0?s:undefined).trim();
  }
  return cookies;
}
function fmtCookies(c){return Object.entries(c).map(([k,v])=>k+'='+v).join('; ')}

async function discourseLogin(){
  // Step 1: Get CSRF token
  const r1=await httpsReq({hostname:HOST,port:443,path:'/session/csrf',method:'GET',
    headers:{'X-Requested-With':'XMLHttpRequest',Accept:'application/json'}});
  if(r1.status>=300)throw new Error('CSRF failed: '+r1.status);
  const csrf=JSON.parse(r1.body).csrf;
  const ck1=extractCookies(r1.headers);

  // Step 2: Login with CSRF + cookies
  const loginBody='login='+encodeURIComponent(EMAIL)+'&password='+encodeURIComponent(PASS);
  const r2=await httpsReq({hostname:HOST,port:443,path:'/session',method:'POST',
    headers:{'Content-Type':'application/x-www-form-urlencoded','X-CSRF-Token':csrf,
      'X-Requested-With':'XMLHttpRequest','Cookie':fmtCookies(ck1),
      'Content-Length':Buffer.byteLength(loginBody)}},loginBody);
  if(r2.status>=400)throw new Error('Login failed: '+r2.status);
  const ck2={...ck1,...extractCookies(r2.headers)};
  if(!ck2._t)throw new Error('No session cookie after login');
  return{csrf,cookies:ck2};
}

async function postReply(tid,raw,auth){
  const d=JSON.stringify({topic_id:tid,raw});
  const r=await httpsReq({hostname:HOST,port:443,path:'/posts.json',method:'POST',
    headers:{'Content-Type':'application/json','X-CSRF-Token':auth.csrf,
      'Cookie':fmtCookies(auth.cookies),'X-Requested-With':'XMLHttpRequest',
      'Content-Length':Buffer.byteLength(d)}},d);
  if(r.status>=300)throw new Error('Post failed: '+r.status+': '+r.body.slice(0,200));
  return r.body;
}

async function main(){
  if(!EMAIL||!PASS){console.log('HOMEY_EMAIL/HOMEY_PASSWORD not set - skip');fs.appendFileSync(SUM,'Forum post skipped (no credentials)\n');return;}
  console.log('Logging in to forum...');
  const auth=await discourseLogin();
  console.log('Login OK');
  const ver=process.env.APP_VERSION||require(path.join(process.cwd(),'app.json')).version;
  let cl=process.env.CHANGELOG||'';
  if(!cl){try{const cj=JSON.parse(fs.readFileSync(path.join(process.cwd(),'.homeychangelog.json'),'utf8'));if(cj[ver]&&cj[ver].en)cl=cj[ver].en;else{const k=Object.keys(cj).sort((a,b)=>b.localeCompare(a,undefined,{numeric:true}));if(k[0]&&cj[k[0]].en)cl=cj[k[0]].en;}}catch(e){}}
  if(!cl)cl='v'+ver+' - See changelog for details';
  const url=process.env.PUBLISH_URL||'https://homey.app/a/com.dlnraja.tuya.zigbee/test/';
  const raw='## 🔄 Universal Tuya Zigbee v'+ver+'\n\n'+cl+'\n\n**📥 Install:** [Test version]('+url+')\n\n> After updating, remove and re-pair devices that had issues.\n> Report bugs: [GitHub Issues](https://github.com/dlnraja/com.tuya.zigbee/issues)';
  console.log('Posting to forum topic',TOPIC);
  const r=await postReply(TOPIC,raw,auth);
  console.log('Posted:',r.slice(0,100));
  fs.appendFileSync(SUM,'Forum: posted v'+ver+' update to topic '+TOPIC+'\n');
}
main().catch(e=>{console.error('Forum post failed:',e.message);process.exit(0);});
