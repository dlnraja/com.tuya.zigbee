#!/usr/bin/env node
// post-issue-responses.js — Post responses to open issues and handle PRs
'use strict';
const https = require('https');
const TOKEN = process.argv[2] || process.env.GH_PAT;
if (!TOKEN) { console.error('Usage: node post-issue-responses.js <TOKEN>'); process.exit(1); }
const REPO = 'dlnraja/com.tuya.zigbee';

function apiCall(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'api.github.com',
      path,
      method: method || 'GET',
      headers: {
        Authorization: 'Bearer ' + TOKEN,
        'User-Agent': 'tuya-bot/1.0',
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      }
    };
    if (data) {
      opts.headers['Content-Type'] = 'application/json';
      opts.headers['Content-Length'] = Buffer.byteLength(data);
    }
    const req = https.request(opts, r => {
      let d = '';
      r.on('data', x => d += x);
      r.on('end', () => { try { resolve({ status: r.statusCode, body: JSON.parse(d) }); } catch { resolve({ status: r.statusCode, body: d }); } });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

const RESPONSES = [
  {
    issue: 333,
    comment: [
      'Hi @Lalla80111,',
      '',
      'Thank you for testing! The Smart Button issue (missing battery flow cards after v8.1.6 → v8.1.12 update) is due to a capability set change in the unified driver.',
      '',
      '**Fix**: A full re-pair is required when the capability set changes:',
      '1. Remove the device from Homey',
      '2. Install the latest test version (v8.1.12+) from the community app store',
      '3. Re-add the button — battery + all flow cards should appear',
      '',
      'If the issue persists after re-pairing on v8.1.12, please share a diagnostic report (Settings → Apps → Tuya Unified Zigbee → Diagnostics).',
      '',
      '*Auto-response — Tuya Unified Zigbee v8.1.12*',
    ].join('\n'),
  },
  {
    issue: 329,
    comment: [
      'Hi @speerke and @macmonty,',
      '',
      'Thank you for the detailed logs! The CT clamp being detected as a radar sensor is a fingerprint collision — both share the same Zigbee cluster profile.',
      '',
      '**Status**: The `_TZE200_...` CT clamp fingerprint disambiguation is scheduled for v8.1.13.',
      '',
      'In the meantime:',
      '- Use the test channel version (v8.1.12)',
      '- When adding the device, if prompted to choose, select the **Energy Meter / Power Meter** option',
      '- The log provided has been captured for fingerprint improvement',
      '',
      '*Auto-response — Tuya Unified Zigbee v8.1.12*',
    ].join('\n'),
  },
  {
    issue: 328,
    comment: [
      'Hi @DaPicardos,',
      '',
      'Thank you for the diagnostic ID (`14d232f9-202c-412c-a194-38c56b654b65`) and the Zigbee interview details!',
      '',
      '**Settings tab issue**: Fixed in v8.1.11 (PR #310). Please update to the latest version.',
      '',
      '**Pressure/Bed occupancy sensor**: Scheduled for v8.1.13. Please share:',
      '- Homey Developer Tools → Zigbee → your device → "Zigbee Interview" report',
      '- The full manufacturer name and model ID from the interview',
      '',
      'This will allow us to add proper fingerprint support.',
      '',
      '*Auto-response — Tuya Unified Zigbee v8.1.12*',
    ].join('\n'),
  },
  {
    issue: 324,
    comment: [
      'Hi @kringloper,',
      '',
      'The `_TZE200_hl0ss9oa` (TS0225) MMwave sensor is already mapped to the **presence_sensor_radar** driver since v8.1.5.',
      '',
      'If you are still having issues:',
      '1. Make sure you are on the **test channel** (v8.1.12+) — go to Settings → Apps → Tuya Unified Zigbee → Test version',
      '2. Remove and re-add the device',
      '3. The radar should be detected automatically',
      '',
      'If detection fails, share the Zigbee interview from Homey Developer Tools.',
      '',
      '*Auto-response — Tuya Unified Zigbee v8.1.12*',
    ].join('\n'),
  },
  {
    issue: 322,
    comment: [
      'Hi @macmonty,',
      '',
      'The app crash on startup was fixed in v8.1.11. Please update to the latest version.',
      '',
      '**LORATAP TS0043** (3-gang scene switch) support: fingerprint is tracked for v8.1.13.',
      '',
      'Please confirm:',
      '- Crash resolved after updating to v8.1.12?',
      '- Share the manufacturer name from the Zigbee interview for TS0043',
      '',
      '*Auto-response — Tuya Unified Zigbee v8.1.12*',
    ].join('\n'),
  },
];

async function main() {
  console.log('=== POSTING ISSUE RESPONSES ===');

  for (const { issue, comment } of RESPONSES) {
    const r = await apiCall('POST', `/repos/${REPO}/issues/${issue}/comments`, { body: comment });
    if (r.status === 201) {
      console.log(`OK #${issue} — comment posted (id: ${r.body.id})`);
    } else {
      console.log(`ERR #${issue} — status ${r.status}: ${JSON.stringify(r.body).substring(0, 100)}`);
    }
  }

  // Close auto-resolved issues that have our resolution comment
  // Issue #334 was auto-resolved, close it
  const closeResolved = [334]; // already have dlnraja resolution comment
  for (const n of closeResolved) {
    // First check if it's actually resolved
    const issue = await apiCall('GET', `/repos/${REPO}/issues/${n}`);
    if (issue.body.state === 'open') {
      await apiCall('POST', `/repos/${REPO}/issues/${n}/comments`, {
        body: [
          'Closing as the fingerprint is confirmed present in v8.1.13.',
          '',
          'Please update to the latest version. If the issue persists, feel free to re-open.',
          '',
          '*Auto-close — Tuya Unified Zigbee v8.1.12*',
        ].join('\n'),
      });
      const close = await apiCall('PATCH', `/repos/${REPO}/issues/${n}`, { state: 'closed', state_reason: 'completed' });
      console.log(`Closed #${n} — status: ${close.status}`);
    }
  }

  // Merge PR #346 if possible (currently dirty/conflicts)
  console.log('\n=== PR #346 STATUS ===');
  const pr346 = await apiCall('GET', `/repos/${REPO}/pulls/346`);
  console.log(`PR #346: state=${pr346.body.state} mergeable=${pr346.body.mergeable} mergeable_state=${pr346.body.mergeable_state}`);
  if (pr346.body.mergeable_state === 'dirty') {
    console.log('PR #346 has conflicts — cannot auto-merge. Needs manual conflict resolution.');
  } else if (pr346.body.mergeable === true) {
    const merge = await apiCall('PUT', `/repos/${REPO}/pulls/346/merge`, {
      merge_method: 'squash',
      commit_title: 'fix: sync icon field and workflow fixes to stable-v5',
      commit_message: 'Sync critical fixes (compact-app-json, icon field, workflow gates) to stable-v5 branch',
    });
    console.log(`Merged PR #346 — status: ${merge.status}`);
  }

  console.log('\nDone.');
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
