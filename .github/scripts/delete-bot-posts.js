#!/usr/bin/env node
'use strict';
const {getForumAuth,refreshCsrf,fmtCk,FORUM}=require('./forum-auth');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

// One-shot script: delete specific bot/duplicate posts from T140352
const TO_DELETE=[
  // Cleaned stubs (already blanked by admin)
  714598,714605,714648,714659,714780,
  // v5.11.25 duplicate update posts
  714623,714834,714908,715034,
  // v5.11.26 duplicate update posts
  715292,715294,
  // malformed fallback bot post
  727130
];

async function main(){
  const auth=await getForumAuth();
  if(!auth){console.log('No auth');process.exit(1)}
  console.log('Deleting',TO_DELETE.length,'bot posts...');
  let ok=0,fail=0;
  for(const id of TO_DELETE){
    try{
      if(auth.type==='session')await refreshCsrf(auth);
      const h=auth.type==='apikey'
        ?{'User-Api-Key':auth.key}
        :{'X-CSRF-Token':auth.csrf,'X-Requested-With':'XMLHttpRequest',Cookie:fmtCk(auth.cookies)};
      const r=await fetch(FORUM+'/posts/'+id,{method:'DELETE',headers:h});
      console.log('  Delete',id,':',r.status,r.ok?'OK':'FAIL');
      if(r.ok)ok++;else fail++;
      await sleep(90000);
    }catch(e){console.error('  Delete',id,'error:',e.message);fail++}
  }
  console.log('Done:',ok,'deleted,',fail,'failed');
}
main().catch(e=>{console.error(e.message);process.exit(1)});
