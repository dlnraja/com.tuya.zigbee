#!/usr/bin/env node
/**
 * capture-build-id.js — Queries Athom API for the latest build ID of this app.
 * Writes "build_id=<ID>" to $GITHUB_OUTPUT (or stdout if not set).
 * Used by publish.yml after the Publish step to reliably get the new build ID.
 *
 * Required env: HOMEY_PAT
 * Optional env: GITHUB_OUTPUT (set automatically by GitHub Actions)
 */
'use strict';
const https = require('https');
const fs = require('fs');
const path = require('path');

const token = process.env.HOMEY_PAT || '';
if (!token) {
  console.error('ERROR: HOMEY_PAT not set');
  process.exit(1);
}

let appId = 'com.dlnraja.tuya.zigbee';
try {
  const appJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'app.json'), 'utf8'));
  appId = appJson.id || appId;
} catch (e) {
  console.error('Warning: could not read app.json, using default app ID');
}

console.log(`Querying builds for app: ${appId}`);

const options = {
  hostname: 'apps-api.athom.com',
  path: `/api/v1/app/${appId}/build`,
  headers: {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/json',
    'User-Agent': 'capture-build-id/1.0',
  },
};

https.get(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log(`API response status: ${res.statusCode}`);
    if (res.statusCode !== 200) {
      console.error(`API error: HTTP ${res.statusCode} — ${data.slice(0, 200)}`);
      // Don't fail — BUILD_ID will be empty and Puppeteer will use draft detection
      writeOutput('');
      return;
    }
    try {
      const parsed = JSON.parse(data);
      const arr = Array.isArray(parsed) ? parsed : (parsed.builds || []);
      console.log(`Total builds found: ${arr.length}`);
      if (arr.length === 0) {
        console.log('No builds found');
        writeOutput('');
        return;
      }
      // Sort by numeric ID descending to get the most recent build
      arr.sort((a, b) => parseInt(b.id || 0, 10) - parseInt(a.id || 0, 10));
      const latest = arr[0];
      const bid = String(latest.id || '');
      console.log(`Latest build: id=${bid} version=${latest.version} state=${latest.state} channel=${latest.channel}`);
      console.log(`Manage: https://tools.developer.homey.app/apps/app/${appId}/build/${bid}`);
      writeOutput(bid);
    } catch (e) {
      console.error('JSON parse error:', e.message);
      console.error('Raw response:', data.slice(0, 300));
      writeOutput('');
    }
  });
}).on('error', (e) => {
  console.error('HTTPS error:', e.message);
  writeOutput('');
});

function writeOutput(bid) {
  const githubOutput = process.env.GITHUB_OUTPUT;
  if (githubOutput) {
    try {
      fs.appendFileSync(githubOutput, `build_id=${bid}\n`);
      console.log(`Written to GITHUB_OUTPUT: build_id=${bid}`);
    } catch (e) {
      console.error('Could not write to GITHUB_OUTPUT:', e.message);
    }
  } else {
    console.log(`build_id=${bid}`);
  }
}
