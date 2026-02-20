#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path');
const {loadFingerprints,extractMfrFromText}=require('./load-fingerprints');
const FORUM='https://community.homey.app',U='dlnraja';
const S=process.env.GITHUB_STEP_SUMMARY||'/dev/null';
const LF=process.env.LAST_RESPOND_FILE||'/tmp/last_forum_respond.txt';
const TOPICS=[140352,26439,146735,89271];
const APP='https://homey.app/a/com.dlnraja.tuya.zigbee/test/';

function extractCookies(res){
  const c={};
  const headers=typeof res.headers.getSetCookie==='function'?res.headers.getSetCookie():
    (res.headers.get('set-cookie')||'').split(/,(?=[^ ])/);
  for(const h of headers){
    const i=h.indexOf('='),s=h.indexOf(';');
    if(i>0)c[h.substring(0,i).trim()]=h.substring(i+1,s>0?s:undefined).trim();
  }
  return c;
}
function fmtCookies(c){return Object.entries(c).map(([k,v])=>k+'='+v).join('; ')}

async function discourseLogin(){
  const email=process.env.HOMEY_EMAIL,pw=process.env.HOMEY_PASSWORD;
  if(!email||!pw)throw new Error('No HOMEY_EMAIL/HOMEY_PASSWORD');
  const r1=await fetch(FORUM+'/session/csrf',{headers:{'X-Requested-With':'XMLHttpRequest',Accept:'application/json'}});
  if(!r1.ok)throw new Error('CSRF failed: '+r1.status);
  const csrf=(await r1.json()).csrf;
  const ck1=extractCookies(r1);
  const r2=await fetch(FORUM+'/session',{method:'POST',redirect:'manual',
    headers:{'Content-Type':'application/x-www-form-urlencoded','X-CSRF-Token':csrf,'X-Requested-With':'XMLHttpRequest',Cookie:fmtCookies(ck1)},
    body:'login='+encodeURIComponent(email)+'&password='+encodeURIComponent(pw)});
  if(!r2.ok&&r2.status!==302)throw new Error('Login failed: '+r2.status);
  const ck2={...ck1,...extractCookies(r2)};
  if(!ck2._t)throw new Error('No session cookie after login');
  return{csrf,cookies:ck2};
}

async function reply(tid,raw,auth){
  const r=await fetch(FORUM+'/posts',{method:'POST',
    headers:{'Content-Type':'application/json','X-CSRF-Token':auth.csrf,'X-Requested-With':'XMLHttpRequest',Cookie:fmtCookies(auth.cookies)},
    body:JSON.stringify({topic_id:tid,raw})});
  if(!r.ok)throw new Error('Post failed: '+r.status);
  return r.json();
}

async function main(){
  const email=process.env.HOMEY_EMAIL;
  if(!email){console.log('No HOMEY_EMAIL - skipping forum respond');return;}
  const auth=await discourseLogin();
  console.log('Forum login OK');
  const fps=loadFingerprints();const ver=require(path.join(process.cwd(),'app.json')).version;
  let lastId=0;if(fs.existsSync(LF))lastId=parseInt(fs.readFileSync(LF,'utf8').trim())||0;
  let ct=0;
  for(const T of TOPICS){
    try{
      const r0=await fetch(FORUM+'/t/'+T+'.json');
      if(!r0.ok)continue;
      const data=await r0.json();
      const ids=(data.post_stream?.stream||[]).slice(-30);
      for(let i=0;i<ids.length;i+=20){
        const chunk=ids.slice(i,i+20);
        const url=FORUM+'/t/'+T+'/posts.json?'+chunk.map(id=>'post_ids[]='+id).join('&');
        const r=await fetch(url);if(!r.ok)continue;
        const rd=await r.json();
        for(const p of (rd.post_stream?.posts||[])){
          if(p.id<=lastId||p.username===U)continue;
          const txt=(p.cooked||'').replace(/<[^>]+>/g,' ');
          const mfrs=extractMfrFromText(txt);if(!mfrs.length)continue;
          const found=mfrs.filter(m=>fps.has(m)),missing=mfrs.filter(m=>!fps.has(m));
          if(!found.length&&!missing.length)continue;
          let msg='';
          if(found.length)msg+='**Already supported** in v'+ver+': '+found.join(', ')+'\n\n';
          if(missing.length)msg+='**Not yet supported:** '+missing.join(', ')+'\nLogged for next release.\n\n';
          msg+='[Install test version]('+APP+')\n\n*Auto-response by dlnraja bot*';
          try{await reply(T,msg,auth);ct++;console.log('Replied to post',p.post_number,'in topic',T);}catch(e){console.error('Reply fail:',e.message);}
          if(p.id>lastId)lastId=p.id;
        }
      }
    }catch(e){console.error('Topic',T,'error:',e.message);}
  }
  if(lastId>0)fs.writeFileSync(LF,String(lastId));
  fs.appendFileSync(S,'Forum: responded to '+ct+' posts\n');
}
main().catch(e=>{console.error(e.message);process.exit(0);});