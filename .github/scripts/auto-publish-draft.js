#!/usr/bin/env node
/**
 * auto-publish-draft.js — Promotes latest draft build to "test" channel.
 *
 * Auth: PAT -> AthomCloudAPI delegation token (audience: 'apps')
 * API:  apps-api.athom.com/api/v1 (from homey-api SDK spec)
 *   GET  /app/{appId}/build -> list builds
 *   POST /app/{appId}/build/{buildId}/channel -> promote
 */
'use strict';
const fs = require('fs'), path = require('path');
const APP = 'com.dlnraja.tuya.zigbee';
const PAT = process.env.HOMEY_PAT;
const DRY = process.env.DRY_RUN === 'true';
const SUM = process.env.GITHUB_STEP_SUMMARY || null;

const CLOUD_BASE = 'https://api.athom.com';
const APPS_BASE = 'https://apps-api.athom.com/api/v1';

if (!PAT) { console.error('HOMEY_PAT not set'); process.exit(0); }

function log(t) { console.log(t); if (SUM) try { fs.appendFileSync(SUM, t + '\n'); } catch {} }

async function apiFetch(url, method, headers, body) {
  const opts = { method, headers: { ...headers } };
  if (body) opts.body = JSON.stringify(body);
  try {
    const r = await fetch(url, opts);
    const t = await r.text();
    let d; try { d = JSON.parse(t); } catch { d = t; }
    return { ok: r.ok, status: r.status, data: d };
  } catch (e) { return { ok: false, status: 0, data: e.message }; }
}

// Exchange PAT for delegation token (audience: 'apps')
// Mirrors AthomCloudAPI.createDelegationToken() from homey-api SDK
async function getDelegationToken() {
  log('  Requesting delegation token (audience: apps)...');
  const h = { 'Authorization': 'Bearer ' + PAT, 'Content-Type': 'application/json' };
  const r = await apiFetch(CLOUD_BASE + '/delegation/token', 'POST', h, { audience: 'apps' });
  if (r.ok && r.data && r.data.token) {
    log('  Delegation token obtained (' + r.data.token.length + ' chars)');
    return r.data.token;
  }
  log('  Delegation failed: ' + r.status + ' ' + JSON.stringify(r.data).slice(0, 300));
  return null;
}

// List builds: GET /app/{appId}/build
async function getBuilds(token) {
  const h = { 'Authorization': 'Bearer ' + token, 'Accept': 'application/json' };
  const r = await apiFetch(APPS_BASE + '/app/' + APP + '/build', 'GET', h);
  if (r.ok && Array.isArray(r.data)) return r.data;
  if (r.ok && r.data && Array.isArray(r.data.builds)) return r.data.builds;
  if (r.ok && r.data && Array.isArray(r.data.data)) return r.data.data;
  log('  getBuilds: ' + r.status + ' ' + JSON.stringify(r.data).slice(0, 300));
  return null;
}

// Promote: POST /app/{appId}/build/{buildId}/channel
async function promoteBuild(token, buildId) {
  const h = { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' };
  const r = await apiFetch(APPS_BASE + '/app/' + APP + '/build/' + buildId + '/channel', 'POST', h, { channel: 'test' });
  if (r.ok) { log('  Promoted build ' + buildId + ' to test'); return true; }
  log('  promoteBuild ' + buildId + ': ' + r.status + ' ' + JSON.stringify(r.data).slice(0, 300));
  return false;
}

async function main() {
  const ver = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'app.json'), 'utf8')).version;
  log('## Auto-Publish Draft -> Test');
  log('App: ' + APP + ' | Version: v' + ver + ' | DRY=' + DRY);
  log('PAT: ' + PAT.slice(0, 8) + '...(' + PAT.length + ' chars)');

  // Step 1: Get delegation token
  log('\n### Step 1: Authentication');
  let token = await getDelegationToken();
  if (!token) {
    log('  Falling back to PAT as direct bearer...');
    token = PAT;
  }

  // Step 2: List builds and find drafts
  log('\n### Step 2: List builds');
  const builds = await getBuilds(token);
  if (!builds) {
    log('Could not list builds. Check PAT validity.');
    process.exitCode = 1;
    return;
  }
  log('Found ' + builds.length + ' build(s)');
  for (const b of builds.slice(0, 10)) {
    const id = b.id || b._id || 'unknown';
    const bv = b.version || 'unknown';
    const ch = b.channel || b.status || 'none';
    log('  ' + id + ' v' + bv + ' channel=' + ch);
  }

  // Step 3: Find draft builds to promote (matching current version or any draft)
  const drafts = builds.filter(b => {
    const ch = String(b.channel || b.status || '').toLowerCase();
    return ch === 'draft' || ch === '' || ch === 'none';
  });

  // Prefer builds matching current app.json version
  const verDrafts = drafts.filter(b => b.version === ver);
  const toPromote = verDrafts.length > 0 ? verDrafts : drafts;

  if (!toPromote.length) {
    log('\nNo draft builds to promote. All builds already have a channel.');
    return;
  }
  log('\n' + toPromote.length + ' draft build(s) to promote');

  if (DRY) { log('\nDRY RUN - would promote ' + toPromote.length + ' build(s)'); return; }

  // Step 4: Promote
  log('\n### Step 3: Promote to test');
  let promoted = 0;
  for (const b of toPromote) {
    const bid = b.id || b._id;
    if (!bid) { log('  Skipping build with no id'); continue; }
    let ok = await promoteBuild(token, bid);
    if (!ok) {
      log('  Retrying in 10s...');
      await new Promise(r => setTimeout(r, 10000));
      ok = await promoteBuild(token, bid);
    }
    if (ok) promoted++;
  }

  log('\n### Result: ' + promoted + '/' + toPromote.length + ' promoted to test');
  if (promoted === 0) {
    log('\nCould not auto-promote. Manual: https://tools.developer.homey.app/apps/app/' + APP + '/versions');
    process.exitCode = 1;
  }
  log('\nManage: https://tools.developer.homey.app/apps/app/' + APP);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
