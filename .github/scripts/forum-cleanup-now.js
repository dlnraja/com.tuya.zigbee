#!/usr/bin/env node
'use strict';
// v5.12.0: Immediate forum cleanup — delete hidden/spam posts, edit bot signatures
const fs = require('fs');
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
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ===== POSTS TO DELETE =====
const TO_DELETE = [
  // T26439: HIDDEN by community (flagged as spam!) — URGENT
  { id: 714597, num: '26439#5403', reason: 'HIDDEN — community flagged as spam' },
  { id: 714602, num: '26439#5404', reason: 'HIDDEN — community flagged as spam' },
  { id: 714604, num: '26439#5405', reason: 'HIDDEN — community flagged as spam (NEW)' },

  // T140352: Raw FP dumps (nightly processor spam)
  { id: 650921, num: '140352#74', reason: 'Raw FP dump' },
  { id: 696271, num: '140352#935', reason: 'Raw FP dump' },
  { id: 699584, num: '140352#1076', reason: 'Raw FP dump' },
  { id: 700472, num: '140352#1120', reason: 'Consecutive + FP dump' },

  // T140352: Duplicates / consecutive bot posts
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
];

// ===== POSTS TO EDIT (remove bot signatures, clean up) =====
const TO_EDIT = [
  // T140352 #1488: Remove bot signature
  { id: 714499, num: '140352#1488', reason: 'Remove bot signature + merge FPs',
    newRaw: 'These fingerprints are already supported in v5.11.25:\n\n' +
      '- `_TZ3000_itb0omhv` → **switch_1gang**\n' +
      '- `_TZ3000_u3nv1jwk` → **switch_4gang**\n' +
      '- `_TZE200_crq3r3la`, `_TZE200_gkfbdvyx` → **thermostat_radiator**\n' +
      '- `_TZE204_clrdrnya` → **thermostat_radiator**\n\n' +
      'You\'ll need to remove and re-pair your device, making sure to select the correct device type during pairing.' },
  // T140352 #1516: Remove "my bot" mention
  { id: 714659, num: '140352#1516', reason: 'Remove bot mention',
    newRaw: 'Sorry for the duplicate replies earlier — there was an issue with the automated system.\n' +
      'I\'ll check your device manually.' },
  // T146735 #182: Merge content from #183, #184 into one clean reply
  { id: 714607, num: '146735#182', reason: 'Merge 3 individual replies into 1',
    newRaw: 'Hi,\n\nIt looks like some of the device fingerprints mentioned aren\'t in our driver database yet. ' +
      'To help add support, could you please perform a [device interview](https://tools.developer.homey.app/tools/zigbee) ' +
      'for each unrecognized device?\n\n' +
      'Select your device under Zigbee and share the results here — this gives us the cluster and endpoint data ' +
      'needed to create a proper driver.\n\n' +
      'If you\'re seeing "unknown" after pairing, try removing the device and re-pairing it.' },
  // T140352 #1300: Remove bot pattern
  { id: 704939, num: '140352#1300', reason: 'Contains bot pattern',
    newRaw: 'This fingerprint is already supported. Please remove and re-pair the device to get the correct driver.' },
];

function getHeaders(auth, json) {
  const h = auth.type === 'apikey'
    ? { 'Api-Key': auth.key, 'Api-Username': 'dlnraja' }
    : { 'X-CSRF-Token': auth.csrf, 'X-Requested-With': 'XMLHttpRequest', Cookie: fmtCk(auth.cookies) };
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

async function deletePost(postId, auth) {
  const r = await fetch(FORUM + '/posts/' + postId, {
    method: 'DELETE', headers: getHeaders(auth)
  });
  return r.ok;
}

async function editPost(postId, newRaw, auth) {
  const r = await fetch(FORUM + '/posts/' + postId, {
    method: 'PUT', headers: getHeaders(auth, true),
    body: JSON.stringify({ post: { raw: newRaw } })
  });
  return r.ok;
}

async function main() {
  console.log('=== Forum Cleanup v5.12.0 ===');
  console.log(`Delete: ${TO_DELETE.length} posts | Edit: ${TO_EDIT.length} posts`);

  let auth = await getForumAuth();
  if (!auth) { console.error('❌ No forum auth'); process.exit(1); }
  // Refresh CSRF to avoid 403 BAD CSRF errors
  if (auth.type !== 'apikey') auth = await refreshCsrf(auth);
  console.log('✅ Auth:', auth.type);

  // Phase 1: Edit posts FIRST
  console.log('\n--- Phase 1: EDIT ---');
  let editOk = 0, editFail = 0;
  for (const p of TO_EDIT) {
    console.log(`EDIT ${p.num} (id=${p.id}): ${p.reason}`);
    try {
      if (await editPost(p.id, p.newRaw, auth)) { editOk++; console.log('  ✓ Edited'); }
      else { editFail++; console.log('  ✗ Edit failed (may be already deleted)'); }
    } catch (e) { editFail++; console.log('  ✗ Error:', e.message); }
    await sleep(2000);
  }

  // Phase 2: Delete spam/duplicate posts
  console.log('\n--- Phase 2: DELETE ---');
  let delOk = 0, delFail = 0;
  for (const p of TO_DELETE) {
    console.log(`DEL ${p.num} (id=${p.id}): ${p.reason}`);
    try {
      const r = await fetch(FORUM + '/posts/' + p.id, { method: 'DELETE', headers: getHeaders(auth) });
      if (r.ok) { delOk++; console.log('  ✓ Deleted'); }
      else if (r.status === 429) {
        console.log('  ⏳ Rate limited — waiting 30s...');
        await sleep(30000);
        // Refresh CSRF and retry
        if (auth.type !== 'apikey') auth = await refreshCsrf(auth);
        const r2 = await fetch(FORUM + '/posts/' + p.id, { method: 'DELETE', headers: getHeaders(auth) });
        if (r2.ok) { delOk++; console.log('  ✓ Deleted (retry)'); }
        else { delFail++; console.log(`  ✗ Retry failed: ${r2.status}`); }
      }
      else if (r.status === 404) { console.log('  ○ Already deleted'); }
      else { delFail++; console.log(`  ✗ Failed: ${r.status} ${r.statusText}`); }
    } catch (e) { delFail++; console.log('  ✗ Error:', e.message); }
    await sleep(5000);
  }

  console.log('\n=== Done ===');
  console.log(`Edited: ${editOk}/${TO_EDIT.length} | Deleted: ${delOk}/${TO_DELETE.length}`);
  if (editFail || delFail) console.log(`Failures: edit=${editFail} delete=${delFail}`);
}

main().catch(e => { console.error(e); process.exit(1); });
