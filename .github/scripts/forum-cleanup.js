#!/usr/bin/env node
'use strict';
// v5.11.28: One-time forum cleanup — delete duplicate/spam posts, merge similar content
// Run with: DISCOURSE_API_KEY=xxx node .github/scripts/forum-cleanup.js
const {getForumAuth,fmtCk,FORUM}=require('./forum-auth');
const {fetchWithRetry}=require('./retry-helper');

const DRY=process.env.DRY_RUN==='true';

// Posts to delete: duplicates, raw FP dumps, wrong bot replies
const TO_DELETE=[
  // Raw "Fingerprints found:" data dumps (nightly-processor per-post spam)
  {id:714577,num:1495,reason:'Raw FP dump (spam)'},
  {id:714579,num:1496,reason:'Raw FP dump (spam)'},
  {id:714580,num:1497,reason:'Raw FP dump (spam)'},
  {id:714581,num:1498,reason:'Raw FP dump (spam)'},
  {id:714583,num:1499,reason:'Raw FP dump (spam)'},
  {id:714585,num:1500,reason:'Raw FP dump (spam)'},
  // First batch of individual AI replies (should have been ONE batched reply)
  {id:714588,num:1501,reason:'Individual reply (should be batched)'},
  {id:714589,num:1502,reason:'Individual reply (should be batched)'},
  {id:714591,num:1503,reason:'Individual reply (should be batched)'},
  {id:714592,num:1504,reason:'Duplicate FP dump'},
  {id:714593,num:1505,reason:'Individual reply (should be batched)'},
  // Second batch = exact duplicates of first batch (12 min later)
  {id:714596,num:1506,reason:'DUPLICATE of #1501'},
  {id:714598,num:1507,reason:'DUPLICATE of #1502'},
  {id:714599,num:1508,reason:'DUPLICATE of #1503'},
  {id:714603,num:1509,reason:'DUPLICATE of #1504'},
  {id:714605,num:1510,reason:'DUPLICATE of #1505'},
  // Wrong HOBEIAN reply (bug: said "not found" but IS supported)
  {id:714648,num:1514,reason:'Wrong reply: HOBEIAN IS supported (quality gate bug)'},
];

async function deletePost(postId,auth){
  const h=auth.type==='apikey'
    ?{'User-Api-Key':auth.key}
    :{'X-CSRF-Token':auth.csrf,'X-Requested-With':'XMLHttpRequest',Cookie:fmtCk(auth.cookies)};
  const r=await fetchWithRetry(FORUM+'/posts/'+postId,{method:'DELETE',headers:h},{retries:2,label:'delete'});
  return r.ok;
}

async function main(){
  console.log('=== Forum Cleanup — Delete '+TO_DELETE.length+' duplicate/spam posts ===');
  console.log(DRY?'DRY RUN':'LIVE — will delete posts!');

  let auth=null;
  if(!DRY){
    auth=await getForumAuth();
    if(!auth){console.error('No forum auth');process.exit(1);}
  }

  let ok=0,fail=0;
  for(const p of TO_DELETE){
    console.log((DRY?'[DRY] ':'')+'#'+p.num+' (id='+p.id+'): '+p.reason);
    if(!DRY){
      try{
        const success=await deletePost(p.id,auth);
        if(success){ok++;console.log('  ✓ Deleted')}
        else{fail++;console.log('  ✗ Failed')}
      }catch(e){fail++;console.log('  ✗ Error:',e.message)}
      await new Promise(r=>setTimeout(r,1500)); // rate limit
    }else{ok++}
  }
  console.log('\nDone: '+ok+' deleted, '+fail+' failed');
}

main().catch(e=>{console.error(e);process.exit(1)});
