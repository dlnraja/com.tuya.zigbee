#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path');
const{getForumAuth,refreshCsrf,fmtCk,FORUM}=require('./forum-auth');
const{fetchWithRetry}=require('./retry-helper');
const{loadFingerprints,extractMfrFromText}=require('./load-fingerprints');
const{callAI}=require('./ai-helper');
const U=process.env.FORUM_USERNAME||'dlnraja';
const DRY=process.env.DRY_RUN==='true';
const SD=path.join(__dirname,'..','state');
const SF=path.join(SD,'forum-pm-state.json');
const DD=path.join(SD,'pm-diagnostics');
const APP='https://homey.app/a/com.dlnraja.tuya.zigbee/test/';
function loadState(){try{return JSON.parse(fs.readFileSync(SF,'utf8'))}catch{return{lastId:0}}}
function saveState(s){fs.mkdirSync(SD,{recursive:true});fs.writeFileSync(SF,JSON.stringify(s,null,2))}
function isDiag(t){return/diagnostic|crash.log|interview|zigbee.*(log|error)|DP\s*\d+|zb_model_id|_T[A-Z]\w{3,5}_/.test(t)}

async function main(){
  console.log('## Forum PM Scanner');
  const auth=DRY?null:await getForumAuth().catch(()=>null);
  if(!auth&&!DRY){console.log('No forum auth');return}
  const fps=loadFingerprints();const st=loadState();
  const ver=require(path.join(__dirname,'..','..','app.json')).version;
  const h=auth?.type==='apikey'?{'User-Api-Key':auth.key}:auth?{'X-CSRF-Token':auth.csrf,'X-Requested-With':'XMLHttpRequest',Cookie:fmtCk(auth.cookies)}:{};
  const r=await fetchWithRetry(FORUM+'/topics/private-messages/'+U+'.json',{headers:h},{retries:2,label:'pmInbox'}).catch(()=>null);
  if(!r||!r.ok){console.log('Cannot fetch PM inbox');return}
  const data=await r.json();const topics=data.topic_list?.topics||[];
  console.log('Found',topics.length,'PM threads');
  let proc=0,diag=0,replied=0;
  fs.mkdirSync(DD,{recursive:true});
  for(const t of topics.slice(0,15)){
    try{
      const tr=await fetchWithRetry(FORUM+'/t/'+t.id+'.json',{headers:h},{retries:2,label:'pmT'});
      if(!tr.ok)continue;const td=await tr.json();
      for(const p of(td.post_stream?.posts||[])){
        if(p.id<=st.lastId||p.username===U)continue;
        const txt=(p.cooked||'').replace(/<[^>]+>/g,' ').trim();if(!txt)continue;
        const mfrs=extractMfrFromText(txt);
        if(mfrs.length){
          const found=mfrs.filter(m=>fps.has(m)),miss=mfrs.filter(m=>!fps.has(m));
          console.log('PM#'+t.id+' @'+p.username+': found='+found.join(',')+' miss='+miss.join(','));
          let msg='Hi '+p.username+',\n\n';
          if(found.length)msg+='**Supported** in v'+ver+': '+found.join(', ')+'\n\n';
          if(miss.length)msg+='**Not yet supported:** '+miss.join(', ')+'\nLogged for next release.\n\n';
          msg+='If you need more help, feel free to open a [GitHub issue](https://github.com/dlnraja/com.tuya.zigbee/issues/new).';
          if(!DRY&&auth){
            const rh=auth.type==='apikey'?{'Content-Type':'application/json','User-Api-Key':auth.key}:{'Content-Type':'application/json','X-CSRF-Token':auth.csrf,'X-Requested-With':'XMLHttpRequest',Cookie:fmtCk(auth.cookies)};
            await fetchWithRetry(FORUM+'/posts',{method:'POST',headers:rh,body:JSON.stringify({topic_id:t.id,raw:msg})},{retries:2,label:'pmReply'}).catch(e=>console.log('Reply err:',e.message));
            replied++;
          }
        }
        if(isDiag(txt)){
          diag++;
          fs.writeFileSync(path.join(DD,'pm-'+t.id+'-'+p.id+'.json'),JSON.stringify({topicId:t.id,postId:p.id,user:p.username,date:p.created_at,fps:mfrs,text:txt.slice(0,8000)},null,2));
          try{const a=await callAI('Extract device info from this Tuya diagnostic:\n'+txt.slice(0,2000),'Tuya Zigbee expert. Extract fingerprints, DPs, errors.');
            if(a?.text)fs.writeFileSync(path.join(DD,'pm-'+t.id+'-'+p.id+'-ai.json'),JSON.stringify({analysis:a.text,model:a.model},null,2));
          }catch{}
        }
        if(p.id>st.lastId)st.lastId=p.id;proc++;
      }
    }catch(e){console.log('PM topic err:',e.message)}
  }
  st.date=new Date().toISOString();st.processed=proc;st.diag=diag;st.replied=replied;
  saveState(st);
  console.log('PM Done:',proc,'processed,',diag,'diagnostics,',replied,'replies');
}
main().catch(e=>{console.error('Fatal:',e);process.exit(0)});
