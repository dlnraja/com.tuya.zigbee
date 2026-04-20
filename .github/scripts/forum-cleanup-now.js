#!/usr/bin/env node
'use strict';
// v5.12.0: Immediate forum cleanup  delete hidden/spam posts, edit bot signatures
const fs=require('fs');
const path = require('path');

// Auto-load .env
const envFile = path.join(__dirname, '..', '..', '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.+)\s*$/);
    if (m && m[2] && !m[2].startsWith('#')) process.env[m[1]] = m[2];
  }
}

const { getForumAuth, refreshCsrf, fmtCk, FORUM } = require('./forum-auth');
const { fetchWithRetry, processBatch, sleep } = require('./retry-helper');

// ===== POSTS TO DELETE =====
const TO_DELETE = [
  // T26439: HIDDEN by community (flagged as spam!)  URGENT
  { id: 714597, num: '26439#5403', reason: 'HIDDEN  community flagged as spam' },
  { id: 714602, num: '26439#5404', reason: 'HIDDEN  community flagged as spam' },
  { id: 714604, num: '26439#5405', reason: 'HIDDEN  community flagged as spam (NEW)' },

  // T140352: Raw FP dumps (nightly processor spam)
  { id: 650921, num: '140352#74', reason: 'Raw FP dump' },
  { id: 696271, num: '140352#935', reason: 'Raw FP dump' },
  { id: 699584, num: '140352#1076', reason: 'Raw FP dump' },
  { id: 700472, num: '140352#1120', reason: 'Consecutive + FP dump' },

  // T140352: Duplicates/consecutive bot posts
  { id: 698945, num: '140352#1017', reason: 'Duplicate of #1018' },
  { id: 698946, num: '140352#1018', reason: 'Consecutive duplicate' },

  // T140352: Bot signature spam (already in prev cleanup but re-check)
  { id: 714503, num: '140352#1489', reason: 'Bot signature + consecutive' },
  { id: 714507, num: '140352#1490', reason: 'Bot signature + consecutive' },
  { id: 714511, num: '140352#1491', reason: 'Bot signature + consecutive' },
  { id: 714585, num: '140352#1500', reason: '100% duplicate of #1504' },
  { id: 714589, num: '140352#1502', reason: 'Bot signature + consecutive' },
  { id: 714591, num: '140352#1503', reason: 'Bot signature + consecutive' },
  { id: 714592, num: '140352#1504', reason: '100% duplicate of #1500' },
  { id: 714598, num: '140352#1507', reason: 'Duplicate of #1502' },
  { id: 714599, num: '140352#1508', reason: 'Duplicate of #1503' },
  { id: 714603, num: '140352#1509', reason: '100% duplicate of #1500' },

  // T146735: Consecutive bot posts
  { id: 714609, num: '146735#183', reason: 'Consecutive bot post (merge into #182)' },
  { id: 714610, num: '146735#184', reason: 'Consecutive bot post' },

  // T140352: From previous cleanup (re-verify)
  { id: 714577, num: '140352#1495', reason: 'Raw FP dump' },
  { id: 714579, num: '140352#1496', reason: 'Raw FP dump' },
  { id: 714580, num: '140352#1497', reason: 'Raw FP dump' },
  { id: 714581, num: '140352#1498', reason: 'Raw FP dump' },
  { id: 714583, num: '140352#1499', reason: 'Raw FP dump' },
  { id: 714588, num: '140352#1501', reason: 'Individual reply (should be batched)' },
  { id: 714593, num: '140352#1505', reason: 'Individual reply' },
  { id: 714596, num: '140352#1506', reason: 'DUPLICATE of #1501' },
  { id: 714605, num: '140352#1510', reason: 'DUPLICATE of #1505' },
  { id: 714648, num: '140352#1514', reason: 'Wrong HOBEIAN reply' },
  { id: 714563, num: '140352#1493', reason: 'Duplicate update post' },
  { id: 714780, num: '140352#1522', reason: '3rd duplicate update' },

  // T140352: Bot template posts (no unique device content)
  { id: 714495, num: '140352#1487', reason: 'Bot template' },
  { id: 714623, num: '140352#1512', reason: 'Bot template' },
  { id: 714834, num: '140352#1525', reason: 'Bot template' },
  { id: 714908, num: '140352#1528', reason: 'Bot template' },
  { id: 715034, num: '140352#1536', reason: 'Bot template' },
  // T140352: Merged stubs + flagged
  { id: 715292, num: '140352#1552', reason: 'Merged stub' },
  { id: 715294, num: '140352#1553', reason: 'Merged stub' },
  { id: 715328, num: '140352#1554', reason: 'Flagged by community' },
];

// ===== POSTS TO EDIT (remove bot signatures, clean up) =====
const TO_EDIT = [
  // T140352 #1488: Remove bot signature
  { id: 714499, num: '140352#1488', reason: 'Remove bot signature + merge FPs',
    newRaw: 'So _TZ3000_itb0omhv goes under switch_1gang, _TZ3000_u3nv1jwk is switch_4gang, and _TZE200_crq3r3la/_TZE200_gkfbdvyx / _TZE204_clrdrnya are all thermostat_radiator  all in v5.11.25 already. Just remove and re-pair, pick the right type when it asks.' },
  // T140352 #1516: Remove "my bot" mention
  { id: 714659, num: '140352#1516', reason: 'Remove bot mention',
    newRaw: 'Sorry about the duplicate replies earlier, had a script glitch. I\'ll take a look at your device.' },
  // T146735 #182: Merge content from #183, #184 into one clean reply
  { id: 714607, num: '146735#182', reason: 'Merge 3 individual replies into 1',
    newRaw: 'Those fingerprints aren\'t in the app yet. If you can do a [device interview](https://tools.developer.homey.app/tools/zigbee) for each one and share the results here, I can get drivers set up. If it shows "unknown" after pairing, just remove and re-pair it.' },
  // T140352 #1300: Remove bot pattern
  { id: 704939, num: '140352#1300', reason: 'Contains bot pattern',
    newRaw: 'That one\'s already in the app. Just remove and re-pair, should work fine.' },

  // T140352: Remove stat counts + infra terms from version update posts
  { id: 715560, num: '140352#1558', reason: 'Remove stat counts',
    newRaw: '**v5.11.32** is now on the [test channel](https://homey.app/a/com.dlnraja.tuya.zigbee/test/).\n\nBug fixes and device improvements.' },
  { id: 715947, num: '140352#1560', reason: 'Remove Auto-publish/stats',
    newRaw: '**v5.11.33** is now on the [test channel](https://homey.app/a/com.dlnraja.tuya.zigbee/test/).\n\nFixed fingerprint recognition for several devices.' },
  { id: 716060, num: '140352#1562', reason: 'Remove stats/fingerprint research',
    newRaw: 'Dropped **v5.11.44** on the [test channel](https://homey.app/a/com.dlnraja.tuya.zigbee/test/) just now.\n\nAdded a new IR remote driver and improved some existing drivers.' },
  { id: 716435, num: '140352#1569', reason: 'Remove diagnostics/stats',
    newRaw: 'Dropped **v5.11.50** on the [test channel](https://homey.app/a/com.dlnraja.tuya.zigbee/test/) just now.\n\nAdded a new remote dimmer driver.' },
  { id: 716567, num: '140352#1572', reason: 'Remove Gmail/PII/forum state',
    newRaw: 'Just pushed **v5.11.65** to the [test channel](https://homey.app/a/com.dlnraja.tuya.zigbee/test/).\n\nFixed _TZE200_pay2byax  moved to contact_sensor driver where it belongs.' },
  { id: 716818, num: '140352#1581', reason: 'Remove stat counts',
    newRaw: 'Just pushed **v5.11.86** to the [test channel](https://homey.app/a/com.dlnraja.tuya.zigbee/test/).\n\nRewrote garage door driver to fix some issues (#128, #137).' },

  // T140352: Infra-leaking version posts  rewrite as clean human updates
  { id: 716594, num: '140352#1574', reason: 'Remove IMAP/Gmail/stats',
    newRaw: '**v5.11.67** is up on the [test channel](https://homey.app/a/com.dlnraja.tuya.zigbee/test/). Some internal fixes in this one.' },
  { id: 716630, num: '140352#1576', reason: 'Remove IMAP/OOM/stats',
    newRaw: 'Just pushed **v5.11.75** to the [test channel](https://homey.app/a/com.dlnraja.tuya.zigbee/test/).\n\nFixed a memory issue and improved overall stability.' },
  { id: 716654, num: '140352#1578', reason: 'Remove session API/SPA/stats',
    newRaw: '**v5.11.78** just went up on [test](https://homey.app/a/com.dlnraja.tuya.zigbee/test/). Cleaned up some internals and reduced app size.' },
  { id: 716945, num: '140352#1585', reason: 'Remove stat counts',
    newRaw: '**v5.11.88** is up on [test](https://homey.app/a/com.dlnraja.tuya.zigbee/test/). Bug fixes and device improvements.' },
  { id: 717087, num: '140352#1589', reason: 'Remove scan-forum/triage/stats',
    newRaw: 'Dropped **v5.11.89** on the [test channel](https://homey.app/a/com.dlnraja.tuya.zigbee/test/).\n\nBug fixes and stability improvements.' },
];

function getHeaders(auth, json) {
  const h = auth.type === 'apikey'
    ? { 'Api-Key': auth.key, 'Api-Username': 'dlnraja' }
    : { 'X-CSRF-Token': auth.csrf, 'X-Requested-With': 'XMLHttpRequest', Cookie: fmtCk(auth.cookies) };
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

// authRef is a mutable reference so fetchWithRetry can update CSRF automatically
let authRef = { auth: null };

async function deletePost(postId) {
  const r = await fetchWithRetry(FORUM + '/posts/' + postId, {
    method: 'DELETE', headers: getHeaders(authRef.auth)
  }, { retries: 3, label: 'delete', csrfRefresh: refreshCsrf, authRef });
  return r.ok;
}

async function editPost(postId, newRaw) {
  const r = await fetchWithRetry(FORUM + '/posts/' + postId, {
    method: 'PUT', headers: getHeaders(authRef.auth, true),
    body: JSON.stringify({ post: { raw: newRaw } })
  }, { retries: 3, label: 'edit', csrfRefresh: refreshCsrf, authRef });
  return r.ok;
}

const SCAN_TOPICS=[140352];
const BOT_USER='dlnraja';
// sleep imported from retry-helper above

async function scanForHiddenPosts(){
  const found=[];
  const knownIds=new Set(TO_DELETE.map(p=>p.id));
  for(const tid of SCAN_TOPICS){
    try{
      console.log(`  Scanning T${tid}...`);
      const r=await fetchWithRetry(FORUM+'/t/'+tid+'.json',{headers:getHeaders(authRef.auth)},{retries:2,label:'scan'});
      if(!r.ok){console.log(`    Skip T${tid}: ${r.status}`);continue;}
      const d=await r.json();const stream=d.post_stream?.stream||[];
      for(let i=0;i<stream.length;i+=20){
        const chunk=stream.slice(i,i+20);await sleep(2000);
        const r2=await fetchWithRetry(FORUM+'/t/'+tid+'/posts.json?'+chunk.map(id=>'post_ids[]='+id).join('&'),
          {headers:getHeaders(authRef.auth)},{retries:2,label:'posts'});
        if(!r2.ok)continue;
        const posts=(await r2.json()).post_stream?.posts||[];
        for(const p of posts){
          if(p.username!==BOT_USER)continue;
          if(knownIds.has(p.id))continue;
          if(p.hidden||p.user_deleted){
            found.push({id:p.id,num:tid+'#'+p.post_number,reason:'HIDDEN/flagged (dynamic scan)'});
            console.log(`    FOUND hidden: T${tid}#${p.post_number} id=${p.id}`);
          }
        }
      }
    }catch(e){console.log(`    Scan T${tid} error: ${e.message}`);}
  }
  return found;
}

async function main() {
  console.log('=== Forum Cleanup v5.12.1 (with dynamic scan) ===');
  console.log(`Hardcoded: Delete ${TO_DELETE.length} | Edit ${TO_EDIT.length}`);

  authRef.auth = await getForumAuth();
  if (!authRef.auth) { console.error(' No forum auth'); process.exit(1); }
  if (authRef.auth.type !== 'apikey') authRef.auth = await refreshCsrf(authRef.auth);
  console.log(' Auth:', authRef.auth.type);

  // Phase 0: Dynamic scan for hidden/flagged posts
  console.log('\n--- Phase 0: SCAN for hidden posts ---');
  const dynamicPosts=await scanForHiddenPosts();
  if(dynamicPosts.length){
    console.log(`  Found ${dynamicPosts.length} NEW hidden posts (adding to delete list)`);
    TO_DELETE.push(...dynamicPosts);
  }else{console.log('  No additional hidden posts found');}

  // Phase 1: Edit posts (3s spacing, auto-retry on 429)
  console.log('\n--- Phase 1: EDIT ---');
  const editResult = await processBatch(TO_EDIT, async (p) => {
    console.log(`EDIT ${p.num} (id=${p.id}): ${p.reason}`);
    if (await editPost(p.id, p.newRaw)) { console.log('   Edited'); return 'ok'; }
    console.log('   Edit failed'); return 'ok'; // don't retry edits that return non-ok
  }, { spacing: 3000, label: 'edit', maxRetries: 2 });

  // Phase 2: Delete posts (35s spacing for Discourse DELETE limit ~2/min)
  console.log('\n--- Phase 2: DELETE ---');
  const delResult = await processBatch(TO_DELETE, async (p) => {
    console.log(`DEL ${p.num} (id=${p.id}): ${p.reason}`);
    if (await deletePost(p.id)) { console.log('   Deleted'); return 'ok'; }
    console.log('   Delete failed'); return 'ok';
  }, { spacing: 60000, label: 'delete', maxRetries: 2, rateLimitPause: 180000 });

  console.log('\n=== Done ===');
  console.log(`Edited: ${editResult.ok}/${TO_EDIT.length} | Deleted: ${delResult.ok}/${TO_DELETE.length}`);
}

main().catch(e => { console.error(e); process.exit(1); });
