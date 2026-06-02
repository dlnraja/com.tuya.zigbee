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
  if(builds[0]) log('  [SessAPI] b0: ch='+builds[0].channel+' st='+builds[0].status+' state='+builds[0].state);
  const last=builds[builds.length-1];
  if(last) log('  [SessAPI] bLast: id='+last.id+' state='+last.state+' v='+last.version);
  const drafts=builds.filter(b=>/draft/i.test(b.channel||b.status||b.state||''));
  if(!drafts.length) return 'no-draft';
  drafts.sort((a,b)=>(b.id||0)-(a.id||0));
  const draft=drafts[0];
  log('  [SessAPI] Draft: id='+draft.id+' v='+draft.version+' ('+drafts.length+' drafts)');
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
