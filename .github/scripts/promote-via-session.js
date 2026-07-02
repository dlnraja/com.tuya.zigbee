#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const {
  selectPromotionTarget,
  sortBuildsDesc,
  summarizeBuild,
} = require('./homey-build-selection');

// Read App ID dynamically from app.json
let APP = 'com.dlnraja.tuya.zigbee';
let APP_VERSION = null;
try {
  const appJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'app.json')));
  if (appJson.id) APP = appJson.id;
  if (appJson.version) APP_VERSION = appJson.version;
} catch {}

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
  if (tk) log('  [SessAPI] Token: present');
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
  sortBuildsDesc(builds).slice(0,5).forEach((b,i)=>log('  [SessAPI] recent #'+(i+1)+': '+summarizeBuild(b)));
  const selection = selectPromotionTarget(builds, APP_VERSION);
  log('  [SessAPI] Selection: '+selection.status+' '+summarizeBuild(selection.build));
  if(selection.status === 'already-test') return true;
  if(selection.status !== 'promote') return selection.status;
  const draft=selection.build;
  if(dry) return false;
  const pid=draft.id||draft._id;
  log('  [SessAPI] Using build id='+pid);
  const bodies=[{channel:'test'},{state:'test'},{channel:'test',state:'test'}];
  const eps=[
    ['PUT',`${BASE}/app/${APP}/build/${pid}`],
    ['PUT',`${BASE}/app/${APP}/build/${pid}/channel`],
    ['POST',`${BASE}/app/${APP}/build/${pid}/publish`],
  ];
  for(const body of bodies){
    for(const [m,u] of eps){
      try{
        const r=await fetch(u,{method:m,headers:{...h,'Content-Type':'application/json'},body:JSON.stringify(body)});
        const txt=r.ok?'':(' '+((await r.text().catch(()=>''))+'').slice(0,120));
        log('  [SessAPI] '+m+' '+u.split('/build/')[1]+' body='+JSON.stringify(body)+' → '+r.status+txt);
        if(r.ok){log('  [SessAPI] Promoted!');return true;}
      }catch(e){log('  [SessAPI] err: '+e.message);}
    }
  }
  return false;
}
module.exports={promoteViaBrowserSession};
