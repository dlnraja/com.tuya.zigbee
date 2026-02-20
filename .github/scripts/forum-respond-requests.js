#!/usr/bin/env node
'use strict';
const https=require('https'),fs=require('fs'),path=require('path');
const {loadFingerprints,extractMfrFromText}=require('./load-fingerprints');
const H='community.homey.app',U=process.env.DISCOURSE_USERNAME||'dlnraja';
const K=process.env.DISCOURSE_API_KEY||'',S=process.env.GITHUB_STEP_SUMMARY||'/dev/null';
const LF=process.env.LAST_RESPOND_FILE||'/tmp/last_forum_respond.txt';
const TOPICS=[140352,26439,146735,89271];
const APP='https://homey.app/a/com.dlnraja.tuya.zigbee/test/';
function get(u){return new Promise((ok,no)=>{https.get(u,{headers:{Accept:'application/json'}},r=>{let b='';r.on('data',c=>b+=c);r.on('end',()=>{try{ok(JSON.parse(b));}catch{no(new Error('parse'));}});}).on('error',no);});}
function reply(tid,raw){return new Promise((ok,no)=>{const d=JSON.stringify({topic_id:tid,raw});const q=https.request({hostname:H,port:443,path:'/posts.json',method:'POST',headers:{'Content-Type':'application/json','Api-Key':K,'Api-Username':U,'Content-Length':Buffer.byteLength(d)}},r=>{let b='';r.on('data',c=>b+=c);r.on('end',()=>r.statusCode<300?ok(b):no(new Error(r.statusCode)));});q.on('error',no);q.write(d);q.end();});}
async function main(){
  if(!K){console.log('No DISCOURSE_API_KEY');return;}
  const fps=loadFingerprints();const ver=require(path.join(process.cwd(),'app.json')).version;
  let lastId=0;if(fs.existsSync(LF))lastId=parseInt(fs.readFileSync(LF,'utf8').trim())||0;
  let ct=0;
  for(const T of TOPICS){
    try{
      const data=await get('https://'+H+'/t/'+T+'/posts.json?post_number=999999');
      const ids=(data.post_stream?.stream||[]).slice(-30);
      for(let i=0;i<ids.length;i+=20){
        const chunk=ids.slice(i,i+20);
        const url='https://'+H+'/t/'+T+'/posts.json?'+chunk.map(id=>'post_ids[]='+id).join('&');
        const r=await get(url);
        for(const p of (r.post_stream?.posts||[])){
          if(p.id<=lastId||p.username===U)continue;
          const txt=(p.cooked||'').replace(/<[^>]+>/g,' ');
          const mfrs=extractMfrFromText(txt);if(!mfrs.length)continue;
          const found=mfrs.filter(m=>fps.has(m)),missing=mfrs.filter(m=>!fps.has(m));
          if(!found.length&&!missing.length)continue;
          let msg='';
          if(found.length)msg+='**Already supported** in v'+ver+': '+found.join(', ')+'\n\n';
          if(missing.length)msg+='**Not yet supported:** '+missing.join(', ')+'\nLogged for next release.\n\n';
          msg+='[Install test version]('+APP+')\n\n*Auto-response by dlnraja bot*';
          try{await reply(T,msg);ct++;console.log('Replied to post',p.post_number,'in topic',T);}catch(e){console.error('Reply fail:',e.message);}
          if(p.id>lastId)lastId=p.id;
        }
      }
    }catch(e){console.error('Topic',T,'error:',e.message);}
  }
  if(lastId>0)fs.writeFileSync(LF,String(lastId));
  fs.appendFileSync(S,'Forum: responded to '+ct+' posts\n');
}
main().catch(e=>{console.error(e.message);process.exit(0);});
