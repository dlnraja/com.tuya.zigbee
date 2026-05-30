#!/usr/bin/env node
'use strict';
// APP can be overridden per-call via PROMOTE_APP_ID env var (set by auto-promote-puppeteer.js loop)
const APP = process.env.PROMOTE_APP_ID || 'com.dlnraja.tuya.zigbee';
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

  // === PRIORITY: Use explicit BUILD_ID env var if provided (avoids stale draft confusion) ===
  const envBuildId = process.env.BUILD_ID ? parseInt(process.env.BUILD_ID, 10) : null;
  if (envBuildId) {
    log(`  [SessAPI] BUILD_ID env override: targeting build ${envBuildId}`);
    if (dry) { log('  [SessAPI] DRY_RUN — skipping'); return false; }
    const result = await tryPublishBuild(envBuildId, h, log);
    if (result) return true;
    log('  [SessAPI] BUILD_ID target failed, falling back to draft search...');
  }

  let builds = null;
  for (const ep of ['build','builds','']) {
    try {
      const r = await fetch(`${BASE}/app/${APP}/${ep}`, {headers:h});
      log('  [SessAPI] GET '+ep+' → '+r.status);
      if (r.ok) {
        const d = await r.json();
        builds = Array.isArray(d) ? d : (d.builds || null);
        if (builds) break;
      }
    } catch(e) { log('  [SessAPI] '+e.message); }
  }
  if (!builds) { log('  [SessAPI] No builds'); return false; }
  log('  [SessAPI] '+builds.length+' builds, first: '+JSON.stringify(Object.keys(builds[0]||{})));
  if (builds[0]) log('  [SessAPI] b0: ch='+builds[0].channel+' st='+builds[0].status+' state='+builds[0].state);
  const last = builds[builds.length-1];
  if (last) log('  [SessAPI] bLast: id='+last.id+' state='+last.state+' v='+last.version);

  // Find drafts — include processing_failed as it may be retry-able
  const targetStates = /draft|processing_failed|failed/i;
  const drafts = builds.filter(b => targetStates.test(b.channel||b.status||b.state||''));
  if (!drafts.length) { log('  [SessAPI] No draft/failed builds found'); return 'no-draft'; }

  // Sort descending by numeric ID to get the MOST RECENT build
  drafts.sort((a,b) => parseInt(b.id||0,10) - parseInt(a.id||0,10));
  const draft = drafts[0];
  log('  [SessAPI] Best draft: id='+draft.id+' v='+draft.version+' state='+draft.state+' ('+drafts.length+' candidates)');
  if (dry) return false;
  return await tryPublishBuild(parseInt(draft.id||draft._id,10), h, log);
}

async function tryPublishBuild(pid, h, log) {
  const bodies = [{channel:'test'},{state:'test'},{channel:'test',state:'test'}];
  const eps = [
    ['PUT',  `${BASE}/app/${APP}/build/${pid}`],
    ['PUT',  `${BASE}/app/${APP}/build/${pid}/channel`],
    ['POST', `${BASE}/app/${APP}/build/${pid}/publish`],
  ];
  for (const body of bodies) {
    for (const [m,u] of eps) {
      try {
        const r = await fetch(u, {method:m, headers:{...h,'Content-Type':'application/json'}, body:JSON.stringify(body)});
        const txt = r.ok ? '' : (' '+((await r.text().catch(()=>''))+'').slice(0,120));
        log('  [SessAPI] '+m+' '+u.split('/build/')[1]+' body='+JSON.stringify(body)+' → '+r.status+txt);
        if (r.ok) { log('  [SessAPI] Promoted!'); return true; }
      } catch(e) { log('  [SessAPI] err: '+e.message); }
    }
  }
  return false;
}

module.exports = { promoteViaBrowserSession };
