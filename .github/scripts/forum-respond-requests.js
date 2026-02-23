#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path');
const {loadFingerprints,extractMfrFromText}=require('./load-fingerprints');
const {getForumAuth,fmtCk,FORUM}=require('./forum-auth');
const U='dlnraja';
const S=process.env.GITHUB_STEP_SUMMARY||'/dev/null';
const LF=process.env.LAST_RESPOND_FILE||'/tmp/last_forum_respond.txt';
const TOPICS=[140352,26439,146735,89271,54018,12758,85498];
const APP='https://homey.app/a/com.dlnraja.tuya.zigbee/test/';

async function reply(tid,raw,auth){
  const h=auth.type==='apikey'
    ?{'Content-Type':'application/json','User-Api-Key':auth.key}
    :{'Content-Type':'application/json','X-CSRF-Token':auth.csrf,'X-Requested-With':'XMLHttpRequest',Cookie:fmtCk(auth.cookies)};
  const r=await fetch(FORUM+'/posts',{method:'POST',headers:h,
    body:JSON.stringify({topic_id:tid,raw})});
  if(!r.ok)throw new Error('Post failed: '+r.status);
  return r.json();
}

async function main(){
  const auth=await getForumAuth();
  if(!auth){console.log('::warning::No forum auth - need HOMEY_EMAIL/HOMEY_PASSWORD or DISCOURSE_API_KEY');return;}
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
