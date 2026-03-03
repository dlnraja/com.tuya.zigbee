#!/usr/bin/env node
'use strict';
/**
 * promote-via-session.js — After Puppeteer login, use browser session to promote draft via API.
 * Called from auto-promote-puppeteer.js as fallback when SPA doesn't render.
 */
const APP_ID = 'com.dlnraja.tuya.zigbee';

async function promoteViaBrowserSession(page, log, dry) {
  log('  [Session API] Fetching builds via browser session...');
  const r = await page.evaluate(async (appId) => {
    const urls = [
      `https://apps-api.athom.com/api/v1/app/${appId}/build`,
      `/api/app/${appId}/build`,
    ];
    for (const u of urls) {
      try {
        const res = await fetch(u, {credentials:'include'});
        if (res.ok) return {url:u, data: await res.json()};
      } catch {}
    }
    return null;
  }, APP_ID);

  if (!r) { log('  [Session API] No working endpoint'); return false; }
  log('  [Session API] Builds from: ' + r.url);

  const builds = Array.isArray(r.data) ? r.data : (r.data?.builds || []);
  const draft = builds.find(b => /draft/i.test(b.channel || b.status || ''));
  if (!draft) {
    log('  [Session API] No draft (' + builds.length + ' builds)');
    return 'no-draft';
  }
  log('  [Session API] Draft: ' + (draft.id || draft.version));
  if (dry) { log('  DRY RUN'); return false; }

  const pid = draft.id || draft._id;
  const eps = [
    {m:'PUT', u:`https://apps-api.athom.com/api/v1/app/${APP_ID}/build/${pid}`, b:{channel:'test'}},
    {m:'POST', u:`https://apps-api.athom.com/api/v1/app/${APP_ID}/build/${pid}/publish`, b:{channel:'test'}},
  ];
  for (const ep of eps) {
    const pr = await page.evaluate(async (ep) => {
      try {
        const r = await fetch(ep.u, {method:ep.m, credentials:'include',
          headers:{'Content-Type':'application/json'}, body:JSON.stringify(ep.b)});
        return {ok:r.ok, status:r.status};
      } catch(e) { return {ok:false, error:e.message}; }
    }, ep);
    log(`  [Session API] ${ep.m} → ${pr.status||pr.error}`);
    if (pr.ok) { log('  [Session API] Promoted to test!'); return true; }
  }
  return false;
}

module.exports = { promoteViaBrowserSession };
