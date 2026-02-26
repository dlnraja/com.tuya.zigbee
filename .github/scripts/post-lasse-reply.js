#!/usr/bin/env node
'use strict';
// One-shot script to post corrective reply to Lasse_K forum #1515
const{getForumAuth,fmtCk,FORUM}=require('./forum-auth');
const{refreshCsrf}=require('./forum-auth');

const reply=`Hi @Lasse_K,

Apologies for the confusing bot reply — your **HOBEIAN ZG-102Z** is indeed recognized and pairs correctly as a **Contact Sensor**.

### The Issue: Inverted Open/Closed

Your device reports IAS Zone alarm status **inverted** compared to the ZCL standard (alarm1=1 means *closed* instead of *open*). This was a known issue we fixed before (v5.5.506), but the fix was accidentally removed in a later cleanup (v5.9.13).

### The Fix (v5.11.26)

We have just re-added HOBEIAN to the **auto-inversion list** in both:
- \`HybridSensorBase.js\` (IAS Zone path)
- \`contact_sensor/device.js\` (DP path)

This means your sensor will **automatically show the correct open/closed state** without needing any manual settings.

### What You Need To Do

1. **Wait for the next test version** to appear on the [Test channel](https://homey.app/a/com.dlnraja.tuya.zigbee/test/)
2. **Update** the app
3. **Remove and re-pair** the ZG-102Z
4. If still inverted, go to device **Settings → Invert Contact State** and toggle it

The \`invert_contact\` setting now also works correctly for IAS-based events, so you have full manual control as a fallback.

Sorry for the back-and-forth on this one!

---
*Universal Tuya Zigbee — [Install test](https://homey.app/a/com.dlnraja.tuya.zigbee/test/) | [GitHub](https://github.com/dlnraja/com.tuya.zigbee/issues)*`;

(async()=>{
  try{
    const auth=await getForumAuth();
    if(!auth){console.error('No forum auth available');process.exit(1)}
    await refreshCsrf(auth);
    const h=auth.type==='apikey'
      ?{'Content-Type':'application/json','User-Api-Key':auth.key}
      :{'Content-Type':'application/json','X-CSRF-Token':auth.csrf,'X-Requested-With':'XMLHttpRequest',Cookie:fmtCk(auth.cookies)};
    const r=await fetch(FORUM+'/posts',{method:'POST',headers:h,body:JSON.stringify({topic_id:140352,raw:reply,reply_to_post_number:1515})});
    const d=await r.json();
    if(r.ok&&d.id){console.log('Posted reply id:',d.id)}
    else{console.error('Post failed:',r.status,d.errors||d)}
  }catch(e){console.error('Error:',e.message);process.exit(1)}
})();
