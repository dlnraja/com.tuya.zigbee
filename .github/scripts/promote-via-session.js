#!/usr/bin/env node
'use strict';
const APP = 'com.dlnraja.tuya.zigbee';
const BASE = 'https://apps-api.athom.com/api/v1';

async function promoteViaBrowserSession(page, log, dry, capturedToken) {
  log('  [SessAPI] Extracting auth...');
  const cookies = await page.cookies();
  const ck = cookies.map(c => c.name+'='+c.value).join('; ');
  log('  [SessAPI] Cookies: ' + cookies.length);
  let tk = capturedToken || null;
  if (!tk) {
    tk = await page.evaluate(() => {
      try { for (const s of [localStorage,sessionStorage])
        for (let i=0;i<s.length;i++) {
          const k=s.key(i),v=s.getItem(k);
          if(/token|access|bearer/i.test(k)&&v) return v;
        }
      } catch{} return null;
    });
  }
  if (tk) log('  [SessAPI] Token: '+tk.length+' chars');
  const h = {'Cookie':ck,'Accept':'application/json'};
  if (tk) h['Authorization']='Bearer '+tk;
  let builds=null;
  for (const ep of ['build','builds','']) {
    try {
      const r=await fetch(`${BASE}/app/${APP}/${ep}`,{headers:h});
      log('  [SessAPI] GET '+ep+' → '+r.status);
      if(r.ok){const d=await r.json();builds=Array.isArray(d)?d:(d.builds||null);if(builds)break;}
    } catch(e){log('  [SessAPI] '+e.message);}
  }
  if(!builds){log('  [SessAPI] No builds');return false;}
  log('  [SessAPI] '+builds.length+' builds, first: '+JSON.stringify(Object.keys(builds[0]||{})));
  if(builds[0]) log('  [SessAPI] b0: ch='+builds[0].channel+' st='+builds[0].status+' state='+builds[0].state);
  const draft=builds.find(b=>/draft/i.test(b.channel||b.status||b.state||''));
  if(!draft) return 'no-draft';
  log('  [SessAPI] Draft: '+(draft.id||draft.version));
  if(dry) return false;
  const pid=draft.id||draft._id;
  for(const [m,u] of [['PUT',`${BASE}/app/${APP}/build/${pid}/channel`],['PUT',`${BASE}/app/${APP}/build/${pid}`],['POST',`${BASE}/app/${APP}/build/${pid}/publish`]]){
    try{
      const r=await fetch(u,{method:m,headers:{...h,'Content-Type':'application/json'},body:JSON.stringify({channel:'test'})});
      log('  [SessAPI] '+m+' → '+r.status);
      if(r.ok){log('  [SessAPI] Promoted!');return true;}
    }catch{}
  }
  return false;
}
module.exports={promoteViaBrowserSession};
