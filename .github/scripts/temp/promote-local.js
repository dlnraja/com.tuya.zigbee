#!/usr/bin/env node
/**
 * promote-local.js — Promotes draft build to test channel using locally stored Homey CLI credentials.
 * Uses the access_token stored in %APPDATA%/athom-cli/settings.json
 * and delegates to AthomCloudAPI to get an apps-audience delegation token.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');

const APP_JSON_PATH = path.join(__dirname, '..', '..', '..', 'app.json');
const APP = JSON.parse(fs.readFileSync(APP_JSON_PATH, 'utf8')).id || 'com.dlnraja.tuya.zigbee';
const VER = JSON.parse(fs.readFileSync(APP_JSON_PATH, 'utf8')).version;

const SETTINGS_PATH = path.join(process.env.APPDATA || '', 'athom-cli', 'settings.json');
const settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
const accessToken = settings?.homeyApi?.token?.access_token;

if (!accessToken) {
  console.error('No access_token found in', SETTINGS_PATH);
  process.exit(1);
}
console.log(`App: ${APP} | Version: ${VER}`);
console.log(`Token: ${accessToken.substring(0, 8)}... (${accessToken.length} chars)`);

function httpsRequest(opts, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(opts, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        let data;
        try { data = JSON.parse(raw); } catch { data = raw; }
        resolve({ status: res.statusCode, headers: res.headers, data });
      });
    });
    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

async function getDelegationToken() {
  console.log('\nStep 1: Requesting delegation token (audience: apps)...');
  const res = await httpsRequest({
    hostname: 'api.athom.com',
    path: '/delegation/token?audience=apps',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  console.log(`  Status: ${res.status}`);
  if (res.status === 200) {
    // The response can be either { token: "..." } or a raw JWT string
    const token = res.data?.token || (typeof res.data === 'string' ? res.data : null);
    if (token) {
      console.log('  Delegation token obtained (' + token.length + ' chars)');
      return token;
    }
  }
  console.log('  Response:', JSON.stringify(res.data).substring(0, 300));
  return null;
}

async function listBuilds(token) {
  console.log('\nStep 2: Listing builds...');
  const bases = [
    'https://apps-api.athom.com/api/v1',
    'https://api.athom.com/api/manager/apps',
  ];
  const paths = ['/app/' + APP + '/build', '/app/' + APP + '/builds', '/app/' + APP];

  for (const base of bases) {
    for (const p of paths) {
      const res = await httpsRequest({
        hostname: new URL(base).hostname,
        path: new URL(base).pathname + p,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });
      console.log(`  ${base}${p} -> ${res.status}`);
      if (res.status === 200) {
        const builds = Array.isArray(res.data) ? res.data : res.data?.builds || res.data?.data || [];
        console.log(`  Found ${builds.length} builds`);
        return builds;
      }
    }
  }
  return null;
}

async function promoteBuild(token, buildId) {
  console.log(`\nStep 3: Promoting build ${buildId} to test...`);
  const endpoints = [
    { method: 'POST', path: `/app/${APP}/build/${buildId}/channel`, body: { channel: 'test' } },
    { method: 'PUT', path: `/app/${APP}/build/${buildId}`, body: { channel: 'test' } },
    { method: 'POST', path: `/app/${APP}/build/${buildId}/publish`, body: { channel: 'test' } },
  ];

  const hostname = 'apps-api.athom.com';
  for (const ep of endpoints) {
    const opts = {
      hostname,
      path: '/api/v1' + ep.path,
      method: ep.method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    };
    console.log(`  ${ep.method} /api/v1${ep.path} body=${JSON.stringify(ep.body)}`);
    const res = await httpsRequest(opts, ep.body);
    console.log(`  -> ${res.status}`);
    if (res.status === 200 || res.status === 204) {
      console.log('  Promoted successfully!');
      return true;
    }
    console.log('  Response:', JSON.stringify(res.data).substring(0, 200));
  }
  return false;
}

(async () => {
  try {
    // Step 1: Get delegation token
    let token = await getDelegationToken();
    if (!token) {
      console.log('\nDelegation failed, trying raw token...');
      token = accessToken;
    }

    // Step 2: List builds
    const builds = await listBuilds(token);
    if (!builds || !builds.length) {
      console.log('\nNo builds found. Check authentication.');
      process.exit(1);
    }

    // Show recent builds
    builds.sort((a, b) => (b.id || 0) - (a.id || 0));
    console.log('\nRecent builds:');
    for (const b of builds.slice(0, 10)) {
      console.log(`  #${b.id} v${b.version} channel=${b.channel || b.status || 'none'} state=${b.state || 'N/A'}`);
    }

    // Step 3: Find draft builds
    const drafts = builds.filter(b => {
      const ch = String(b.channel || b.status || '').toLowerCase();
      return ch === 'draft' || ch === '' || ch === 'none';
    });

    console.log(`\nDraft builds found: ${drafts.length}`);

    if (drafts.length === 0) {
      console.log('No draft builds to promote.');
      // Check if current version is on test
      const testBuilds = builds.filter(b => String(b.channel || '').toLowerCase() === 'test');
      const currentInTest = testBuilds.some(b => b.version === VER);
      if (currentInTest) {
        console.log(`\nv${VER} is already on the test channel.`);
      } else {
        console.log(`\nv${VER} is NOT on test. No draft available to promote.`);
      }
      process.exit(0);
    }

    // Prefer build matching current app.json version
    const verDrafts = drafts.filter(b => b.version === VER);
    const toPromote = verDrafts.length > 0 ? verDrafts : drafts;

    console.log(`\nWill promote ${toPromote.length} build(s):`);
    for (const b of toPromote) {
      console.log(`  #${b.id} v${b.version}`);
    }

    // Step 4: Promote
    let promoted = 0;
    for (const b of toPromote) {
      const bid = b.id || b._id;
      if (!bid) continue;
      const ok = await promoteBuild(token, bid);
      if (ok) promoted++;
    }

    console.log(`\n=== Result: ${promoted}/${toPromote.length} promoted to test ===`);
    if (promoted > 0) {
      console.log(`\nv${VER} should now be on the test channel.`);
      console.log(`Test link: https://homey.app/a/${APP}/test/`);
    } else {
      console.log(`\nPromotion failed. Manual: https://tools.developer.homey.app/apps/app/${APP}/versions`);
      process.exit(1);
    }
  } catch (e) {
    console.error('Fatal:', e.message);
    process.exit(1);
  }
})();
