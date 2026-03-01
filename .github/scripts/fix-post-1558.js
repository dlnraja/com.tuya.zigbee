#!/usr/bin/env node
'use strict';
const {getForumAuth,refreshCsrf,fmtCk,FORUM}=require('./forum-auth');
const {fetchWithRetry}=require('./retry-helper');
const TID=140352,PN=1558;
const RAW=`**v5.11.27** is now on the [test channel](https://homey.app/a/com.dlnraja.tuya.zigbee/test/).

What's new in recent updates:
- Fixed forum duplication issues and improved AI ensemble routing
- Fixed voltage divisor in driver #137 (plug readings off by 10x)
- Dashboard fallback rewrite (device tiles update properly now)
- 17 new fingerprints from community contributions
- RawClusterFallback for non-Tuya-DP devices

_143 drivers | 5,360+ fingerprints_

**Note:** I've fully deactivated all automated bot responses and scanning on other community threads. The bot now only operates on this thread (T140352). Sorry for any spam on other topics — that's been cleaned up and won't happen again.`;
async function main(){
  const auth=await getForumAuth();
  if(!auth){console.error('No auth');process.exit(1);}
  if(auth.type==='session')await refreshCsrf(auth);
  const r=await fetchWithRetry(FORUM+'/t/'+TID+'/'+(PN-1)+'.json',{},{retries:3,label:'f'});
  if(!r.ok){console.error('Fetch:',r.status);process.exit(1);}
  const p=(await r.json()).post_stream?.posts?.find(x=>x.post_number===PN);
  if(!p){console.error('Post not found');process.exit(1);}
  console.log('Found post id='+p.id+' #'+p.post_number+' by '+p.username);
  const h=auth.type==='apikey'?{'Content-Type':'application/json','User-Api-Key':auth.key}:{'Content-Type':'application/json','X-CSRF-Token':auth.csrf,'X-Requested-With':'XMLHttpRequest',Cookie:fmtCk(auth.cookies)};
  const e=await fetchWithRetry(FORUM+'/posts/'+p.id,{method:'PUT',headers:h,body:JSON.stringify({post:{raw:RAW}})},{retries:3,label:'edit'});
  if(e.ok)console.log('EDITED OK');
  else console.error('Edit failed:',e.status,await e.text().catch(()=>''));
}
main().catch(e=>{console.error(e.message);process.exit(1);});
