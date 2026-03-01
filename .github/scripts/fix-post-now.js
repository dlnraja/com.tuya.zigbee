#!/usr/bin/env node
'use strict';
const {getForumAuth,refreshCsrf,fmtCk,FORUM}=require('./forum-auth');
const {fetchWithRetry}=require('./retry-helper');
const RAW=`Hey everyone,

Quick note — I've deactivated all the automated YML workflows that were posting and replying on other community threads. From now on, everything stays on this thread only. Sorry about the noise on the other topics, that's done.

v5.11.27 is up on the [test channel](https://homey.app/a/com.dlnraja.tuya.zigbee/test/) with various fixes (voltage divisor, dashboard fallback, 17 new fingerprints).

As always, remove and re-pair if something acts up after updating.`;
async function main(){
  const auth=await getForumAuth();
  if(!auth)process.exit(1);
  if(auth.type==='session')await refreshCsrf(auth);
  const r=await fetchWithRetry(FORUM+'/t/140352/1557.json',{},{retries:3,label:'f'});
  const p=(await r.json()).post_stream?.posts?.find(x=>x.post_number===1558);
  if(!p)process.exit(1);
  const h=auth.type==='apikey'?{'Content-Type':'application/json','User-Api-Key':auth.key}:{'Content-Type':'application/json','X-CSRF-Token':auth.csrf,'X-Requested-With':'XMLHttpRequest',Cookie:fmtCk(auth.cookies)};
  const e=await fetchWithRetry(FORUM+'/posts/'+p.id,{method:'PUT',headers:h,body:JSON.stringify({post:{raw:RAW}})},{retries:3,label:'edit'});
  console.log(e.ok?'OK':'FAIL:'+e.status);
}
main().catch(e=>{console.error(e.message);process.exit(1);});
