#!/usr/bin/env node
'use strict';
// v5.12.0: Forum cleanup via EDIT (avoids Discourse delete rate limits)
// Replaces spam content with clean placeholder instead of deleting
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

// Posts that failed DELETE due to rate limiting — EDIT them instead
const TO_EDIT = [
  { id: 700472, num: '140352#1120', reason: 'Consecutive FP dump' },
  { id: 698945, num: '140352#1017', reason: 'Duplicate' },
  { id: 698946, num: '140352#1018', reason: 'Consecutive duplicate' },
  { id: 714507, num: '140352#1490', reason: 'Bot signature consecutive' },
  { id: 714511, num: '140352#1491', reason: 'Bot signature consecutive' },
  { id: 714585, num: '140352#1500', reason: '100% duplicate' },
  { id: 714589, num: '140352#1502', reason: 'Bot signature consecutive' },
  { id: 714591, num: '140352#1503', reason: 'Bot signature consecutive' },
  { id: 714592, num: '140352#1504', reason: '100% duplicate' },
  { id: 714598, num: '140352#1507', reason: 'Duplicate' },
  { id: 714610, num: '146735#184', reason: 'Consecutive bot post' },
  { id: 714577, num: '140352#1495', reason: 'Raw FP dump' },
  { id: 714579, num: '140352#1496', reason: 'Raw FP dump' },
  { id: 714580, num: '140352#1497', reason: 'Raw FP dump' },
  { id: 714581, num: '140352#1498', reason: 'Raw FP dump' },
  { id: 714583, num: '140352#1499', reason: 'Raw FP dump' },
  { id: 714588, num: '140352#1501', reason: 'Individual reply' },
  { id: 714593, num: '140352#1505', reason: 'Individual reply' },
  { id: 714596, num: '140352#1506', reason: 'Duplicate' },
  { id: 714605, num: '140352#1510', reason: 'Duplicate' },
  { id: 714648, num: '140352#1514', reason: 'Wrong HOBEIAN reply' },
  { id: 714563, num: '140352#1493', reason: 'Duplicate update' },
  { id: 714780, num: '140352#1522', reason: '3rd duplicate update' },
];

const CLEAN_TEXT = '*(This post contained duplicate/automated content and has been cleaned up.)*';

function getHeaders(auth, json) {
  const h = auth.type === 'apikey'
    ? { 'Api-Key': auth.key, 'Api-Username': 'dlnraja' }
    : { 'X-CSRF-Token': auth.csrf, 'X-Requested-With': 'XMLHttpRequest', Cookie: fmtCk(auth.cookies) };
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

async function main() {
  console.log(`=== Forum Cleanup via EDIT v5.12.0 ===`);
  console.log(`Posts to edit: ${TO_EDIT.length}`);

  let auth = await getForumAuth();
  if (!auth) { console.error('No auth'); process.exit(1); }
  if (auth.type !== 'apikey') auth = await refreshCsrf(auth);
  console.log('Auth:', auth.type);

  let ok = 0, fail = 0, skip = 0;
  for (const p of TO_EDIT) {
    console.log(`EDIT ${p.num} (id=${p.id}): ${p.reason}`);
    try {
      const r = await fetch(FORUM + '/posts/' + p.id, {
        method: 'PUT',
        headers: getHeaders(auth, true),
        body: JSON.stringify({ post: { raw: CLEAN_TEXT } })
      });
      if (r.ok) { ok++; console.log('  ✓ Cleaned'); }
      else if (r.status === 404 || r.status === 403) { skip++; console.log(`  ○ Already gone (${r.status})`); }
      else if (r.status === 429) {
        console.log('  ⏳ Rate limited — waiting 60s...');
        await sleep(60000);
        if (auth.type !== 'apikey') auth = await refreshCsrf(auth);
        const r2 = await fetch(FORUM + '/posts/' + p.id, {
          method: 'PUT',
          headers: getHeaders(auth, true),
          body: JSON.stringify({ post: { raw: CLEAN_TEXT } })
        });
        if (r2.ok) { ok++; console.log('  ✓ Cleaned (retry)'); }
        else { fail++; console.log(`  ✗ Failed: ${r2.status}`); }
      }
      else { fail++; console.log(`  ✗ Failed: ${r.status}`); }
    } catch (e) { fail++; console.log('  ✗ Error:', e.message); }
    await sleep(3000);
  }

  console.log(`\n=== Done: ${ok} cleaned, ${skip} already gone, ${fail} failed ===`);
}

main().catch(e => { console.error(e); process.exit(1); });
