#!/usr/bin/env node
'use strict';
// v5.11.29: Comprehensive forum cleanup — delete spam, edit bot signatures, merge consecutive posts
// Run with: DISCOURSE_API_KEY=xxx node .github/scripts/forum-cleanup.js
const {getForumAuth,refreshCsrf,fmtCk,FORUM}=require('./forum-auth');
const {fetchWithRetry}=require('./retry-helper');

const DRY=process.env.DRY_RUN==='true';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

// ===== 1. POSTS TO DELETE =====
const TO_DELETE=[
  // T140352: Raw FP dumps (nightly-processor per-post spam)
  {id:714577,num:'140352#1495',reason:'Raw FP dump'},
  {id:714579,num:'140352#1496',reason:'Raw FP dump'},
  {id:714580,num:'140352#1497',reason:'Raw FP dump'},
  {id:714581,num:'140352#1498',reason:'Raw FP dump'},
  {id:714583,num:'140352#1499',reason:'Raw FP dump'},
  {id:714585,num:'140352#1500',reason:'Raw FP dump'},
  // T140352: Individual AI replies (should be ONE batched)
  {id:714588,num:'140352#1501',reason:'Individual reply (should be batched)'},
  {id:714589,num:'140352#1502',reason:'Individual reply'},
  {id:714591,num:'140352#1503',reason:'Individual reply'},
  {id:714592,num:'140352#1504',reason:'Duplicate FP dump'},
  {id:714593,num:'140352#1505',reason:'Individual reply'},
  // T140352: Exact duplicates (12 min later)
  {id:714596,num:'140352#1506',reason:'DUPLICATE of #1501'},
  {id:714598,num:'140352#1507',reason:'DUPLICATE of #1502'},
  {id:714599,num:'140352#1508',reason:'DUPLICATE of #1503'},
  {id:714603,num:'140352#1509',reason:'DUPLICATE of #1504'},
  {id:714605,num:'140352#1510',reason:'DUPLICATE of #1505'},
  // T140352: Wrong reply + duplicate updates
  {id:714648,num:'140352#1514',reason:'Wrong HOBEIAN reply (IS supported)'},
  {id:714563,num:'140352#1493',reason:'Duplicate update post (keep #1487)'},
  {id:714780,num:'140352#1522',reason:'3rd duplicate update post'},
  // T140352: Consecutive bot-signature replies (merge into #1488)
  {id:714503,num:'140352#1489',reason:'Merge into #1488'},
  {id:714507,num:'140352#1490',reason:'Merge into #1488'},
  {id:714511,num:'140352#1491',reason:'Merge into #1488'},
  // T26439: HIDDEN by community (flagged as spam!)
  {id:714597,num:'26439#5403',reason:'HIDDEN — community flagged as spam'},
  {id:714602,num:'26439#5404',reason:'HIDDEN — community flagged as spam'},
  // T146735: Consecutive individual replies (merge into #182)
  {id:714609,num:'146735#183',reason:'Merge into #182'},
  {id:714610,num:'146735#184',reason:'Merge into #182'},
];

// ===== 2. POSTS TO EDIT =====
const TO_EDIT=[
  // T140352 #1488: Remove bot signature, merge FPs from #1489-#1491
  {id:714499,num:'140352#1488',reason:'Remove bot signature + merge FPs',
   newRaw:'These fingerprints are already supported in v5.11.25:\n\n'+
     '- `_TZ3000_itb0omhv` → **switch_1gang**\n'+
     '- `_TZ3000_u3nv1jwk` → **switch_4gang**\n'+
     '- `_TZE200_crq3r3la`, `_TZE200_gkfbdvyx` → **thermostat_radiator**\n'+
     '- `_TZE204_clrdrnya` → **thermostat_radiator**\n\n'+
     'You\'ll need to remove and re-pair your device, making sure to select the correct device type during pairing.'},
  // T140352 #1516: Remove "my bot" mention
  {id:714659,num:'140352#1516',reason:'Remove bot mention',
   newRaw:'Sorry for the duplicate replies earlier — there was an issue with the automated system.\n'+
     'I\'ll check your device manually.'},
  // T146735 #182: Merge content from #183, #184 into one clean reply
  {id:714607,num:'146735#182',reason:'Merge 3 individual replies into 1',
   newRaw:'Hi,\n\nIt looks like some of the device fingerprints mentioned aren\'t in our driver database yet. '+
     'To help add support, could you please perform a [device interview](https://tools.developer.homey.app/tools/zigbee) '+
     'for each unrecognized device?\n\n'+
     'Select your device under Zigbee and share the results here — this gives us the cluster and endpoint data '+
     'needed to create a proper driver.\n\n'+
     'If you\'re seeing "unknown" after pairing, try removing the device and re-pairing it.'},
];

function getHeaders(auth,json){
  const h=auth.type==='apikey'
    ?{'User-Api-Key':auth.key}
    :{'X-CSRF-Token':auth.csrf,'X-Requested-With':'XMLHttpRequest',Cookie:fmtCk(auth.cookies)};
  if(json)h['Content-Type']='application/json';
  return h;
}

async function deletePost(postId,auth){
  const r=await fetchWithRetry(FORUM+'/posts/'+postId,{
    method:'DELETE',headers:getHeaders(auth)
  },{retries:2,label:'delete'});
  return r.ok;
}

async function editPost(postId,newRaw,auth){
  const r=await fetchWithRetry(FORUM+'/posts/'+postId,{
    method:'PUT',headers:getHeaders(auth,true),
    body:JSON.stringify({post:{raw:newRaw}})
  },{retries:2,label:'edit'});
  return r.ok;
}

async function main(){
  console.log('=== Forum Cleanup v5.11.29 ===');
  console.log('Delete: '+TO_DELETE.length+' posts | Edit: '+TO_EDIT.length+' posts');
  console.log(DRY?'DRY RUN':'LIVE');

  let auth=null;
  if(!DRY){
    auth=await getForumAuth();
    if(!auth){console.error('No forum auth');process.exit(1);}
    if(auth.type==='session')auth=await refreshCsrf(auth);
  }

  // Phase 1: Edit posts FIRST (before deleting merged content)
  console.log('\n--- Phase 1: EDIT ---');
  let editOk=0,editFail=0;
  for(const p of TO_EDIT){
    console.log((DRY?'[DRY] ':'')+'EDIT '+p.num+' (id='+p.id+'): '+p.reason);
    if(!DRY){
      try{
        if(await editPost(p.id,p.newRaw,auth)){editOk++;console.log('  ✓ Edited')}
        else{editFail++;console.log('  ✗ Edit failed')}
      }catch(e){editFail++;console.log('  ✗ Error:',e.message)}
      await sleep(2000);
    }else{editOk++}
  }

  // Phase 2: Delete spam/duplicate posts
  console.log('\n--- Phase 2: DELETE ---');
  let delOk=0,delFail=0;
  for(const p of TO_DELETE){
    console.log((DRY?'[DRY] ':'')+'DEL '+p.num+' (id='+p.id+'): '+p.reason);
    if(!DRY){
      try{
        if(await deletePost(p.id,auth)){delOk++;console.log('  ✓ Deleted')}
        else{delFail++;console.log('  ✗ Delete failed')}
      }catch(e){delFail++;console.log('  ✗ Error:',e.message)}
      await sleep(1500);
    }else{delOk++}
  }

  console.log('\n=== Done ===');
  console.log('Edited: '+editOk+'/'+TO_EDIT.length+' | Deleted: '+delOk+'/'+TO_DELETE.length);
  if(editFail||delFail)console.log('Failures: edit='+editFail+' delete='+delFail);
}

main().catch(e=>{console.error(e);process.exit(1)});
