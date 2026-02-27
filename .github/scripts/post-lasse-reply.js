#!/usr/bin/env node
'use strict';
// One-shot script to post corrective reply to Lasse_K forum #1515
const{getForumAuth,refreshCsrf,fmtCk,FORUM}=require('./forum-auth');
const{fetchWithRetry}=require('./retry-helper');

const reply=`Hi @Lasse_K,

Apologies for the confusing bot reply — your **HOBEIAN ZG-102Z** is indeed recognized and pairs correctly as a **Contact Sensor**. The productId \`ZG-102Z\` was already in our database all along!

### Why the bot said "not found"

Our bot's fingerprint scanner was using a regex that **only matches Tuya-style names** (patterns like \`_TZ3000_xxxx\` and \`TS0203\`). Your device's manufacturer name \`HOBEIAN\` and model \`ZG-102Z\` don't match those patterns, so the bot literally couldn't see them — even though they were already in the driver. We've now fixed the scanner to detect **all** manufacturer names and product IDs, not just Tuya ones.

### The Real Issue: Inverted Open/Closed

Your device reports IAS Zone alarm status **inverted** compared to the ZCL standard (alarm1=1 means *closed* instead of *open*). This was a known issue we fixed before (v5.5.506), but the fix was accidentally removed in a later cleanup (v5.9.13).

### The Fix

We have just:
1. Re-added \`HOBEIAN\` to the **auto-inversion list** (both IAS Zone path and DP path)
2. Added \`HOBEIAN\` to the contact_sensor **manufacturer fingerprint list** for explicit matching
3. Fixed the bot's fingerprint scanner to detect non-Tuya device names

### What You Need To Do

1. **Wait for the next test version** on the [Test channel](https://homey.app/a/com.dlnraja.tuya.zigbee/test/)
2. **Update** the app
3. **Remove and re-pair** the ZG-102Z
4. If still inverted → device **Settings → Invert Contact State** → toggle it

Sorry for the back-and-forth on this one!`;

(async()=>{
  try{
    const auth=await getForumAuth();
    if(!auth){console.error('No forum auth available');process.exit(1)}
    await refreshCsrf(auth);
    const h=auth.type==='apikey'
      ?{'Content-Type':'application/json','User-Api-Key':auth.key}
      :{'Content-Type':'application/json','X-CSRF-Token':auth.csrf,'X-Requested-With':'XMLHttpRequest',Cookie:fmtCk(auth.cookies)};
    const authRef={auth};const r=await fetchWithRetry(FORUM+'/posts',{method:'POST',headers:h,body:JSON.stringify({topic_id:140352,raw:reply,reply_to_post_number:1515})},{retries:3,label:'post',csrfRefresh:refreshCsrf,authRef});
    const d=await r.json();
    if(r.ok&&d.id){console.log('Posted reply id:',d.id)}
    else{console.error('Post failed:',r.status,d.errors||d)}
  }catch(e){console.error('Error:',e.message);process.exit(1)}
})();
