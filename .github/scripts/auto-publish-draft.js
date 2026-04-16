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
const { fetchWithRetry } = require('./retry-helper');
const APP = 'com.dlnraja.tuya.zigbee';
const PAT = process.env.HOMEY_PAT;
const DRY = process.env.DRY_RUN === 'true';
const SUM = process.env.GITHUB_STEP_SUMMARY || null;

const CLOUD_BASE = 'https://api.athom.com';
// v5.11.27: Try multiple API base URLs (Athom has changed these before)
const APPS_BASES = [
  'https://apps-api.athom.com/api/v1',
  'https://api.athom.com/api/manager/apps',
  'https://apps-api.athom.com/api/v2',
];

if (!PAT) { console.error('HOMEY_PAT not set'); process.exit(1); }

function log(t) { console.log(t); if (SUM) try { fs.appendFileSync(SUM, t + '\n'); } catch {} }

async function apiFetch(url, method, headers, body) {
  const opts = { method, headers: { ...headers } };
  if (body) opts.body = JSON.stringify(body);
  try {
    const r = await fetchWithRetry(url, opts, { retries: 3, label: 'athom' });
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
    log('  Delegation token obtained');
    return r.data.token;
  }
  log('  Delegation failed: ' + r.status + ' ' + JSON.stringify(r.data).slice(0, 300));
  return null;
}

// v5.11.27: List builds — try multiple API base URLs
async function getBuilds(token) {
  const h = { 'Authorization': 'Bearer ' + token, 'Accept': 'application/json' };
  const paths = ['/app/' + APP + '/build', '/app/' + APP + '/builds', '/app/' + APP];
  for (const base of APPS_BASES) {
    for (const p of paths) {
      const url = base + p;
      log('  Trying: GET ' + url);
      const r = await apiFetch(url, 'GET', h);
      if (r.ok) {
        const d = r.data;
        if (Array.isArray(d)) { log('  Found ' + d.length + ' builds at ' + url); return { builds: d, base }; }
        if (d?.builds && Array.isArray(d.builds)) { log('  Found ' + d.builds.length + ' builds'); return { builds: d.builds, base }; }
        if (d?.data && Array.isArray(d.data)) { log('  Found ' + d.data.length + ' builds'); return { builds: d.data, base }; }
        log('  OK but unexpected format: ' + JSON.stringify(d).slice(0, 200));
      } else {
        log('  ' + r.status + ': ' + JSON.stringify(r.data).slice(0, 150));
      }
    }
  }
  return null;
}

// v5.11.27: Promote — try multiple endpoints
async function promoteBuild(token, buildId, apiBase) {
  const h = { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' };
  const endpoints = [
    { url: apiBase + '/app/' + APP + '/build/' + buildId + '/channel', body: { channel: 'test' } },
    { url: apiBase + '/app/' + APP + '/build/' + buildId + '/publish', body: { channel: 'test' } },
    { url: apiBase + '/app/' + APP + '/build/' + buildId, body: { channel: 'test' }, method: 'PUT' },
  ];
  for (const ep of endpoints) {
    log('  Trying: ' + (ep.method || 'POST') + ' ' + ep.url);
    const r = await apiFetch(ep.url, ep.method || 'POST', h, ep.body);
    if (r.ok) { log('  ✓ Promoted build ' + buildId + ' to test'); return true; }
    log('  ' + r.status + ': ' + JSON.stringify(r.data).slice(0, 200));
  }
  return false;
}

async function main() {
  const ver = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'app.json'), 'utf8')).version;
  log('## Auto-Publish Draft -> Test');
  log('App: ' + APP + ' | Version: v' + ver + ' | DRY=' + DRY);
  log('PAT: present (' + PAT.length + ' chars)');

  // Step 1: Get delegation token
  log('\n### Step 1: Authentication');
  let token = await getDelegationToken();
  if (!token) {
    log('  Falling back to PAT as direct bearer...');
    token = PAT;
  }

  // Step 2: List builds and find drafts
  log('\n### Step 2: List builds');
  let result = await getBuilds(token);
  if (!result) {
    // v5.11.27: Try again with raw PAT if delegation token was used
    if (token !== PAT) {
      log('  Retrying with raw PAT...');
      result = await getBuilds(PAT);
      if (!result) {
        log('Could not list builds with any token. Check PAT validity.');
        process.exitCode = 1;
        return;
      }
      token = PAT;
    } else {
      log('Could not list builds. Check PAT validity.');
      process.exitCode = 1;
      return;
    }
  }
  const builds = result.builds;
  const apiBase = result.base;
  log('Found ' + builds.length + ' build(s) via ' + apiBase);
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

  // Sort by id desc to get latest first (Athom API returns unsorted)
  drafts.sort((a, b) => (b.id || 0) - (a.id || 0));

  // Prefer builds matching current app.json version
  const verDrafts = drafts.filter(b => b.version === ver);
  const toPromote = verDrafts.length > 0 ? verDrafts : drafts;

  if (!toPromote.length) {
    // v5.11.80: Retry — Athom may still be processing the draft
    for (let retry = 1; retry <= 3; retry++) {
      log('\nNo draft builds yet. Retry ' + retry + '/3 — waiting 60s for Athom...');
      await new Promise(r => setTimeout(r, 60000));
      const r2 = await getBuilds(token);
      if (r2) {
        const d2 = r2.builds.filter(b => {
          const ch = String(b.channel || b.status || '').toLowerCase();
          return ch === 'draft' || ch === '' || ch === 'none';
        });
        const vd2 = d2.filter(b => b.version === ver);
        const tp2 = vd2.length > 0 ? vd2 : d2;
        if (tp2.length) {
          toPromote.push(...tp2);
          log('Found ' + tp2.length + ' draft build(s) after retry ' + retry);
          break;
        }
      }
    }
    if (!toPromote.length) {
      log('\nNo draft builds to promote after retries. All builds already have a channel.');
      return;
    }
  }
  log('\n' + toPromote.length + ' draft build(s) to promote');

  if (DRY) { log('\nDRY RUN - would promote ' + toPromote.length + ' build(s)'); return; }

  // Step 4: Promote
  log('\n### Step 3: Promote to test');
  let promoted = 0;
  for (const b of toPromote) {
    const bid = b.id || b._id;
    if (!bid) { log('  Skipping build with no id'); continue; }
    let ok = await promoteBuild(token, bid, apiBase);
    if (!ok && token !== PAT) {
      log('  Retrying with raw PAT...');
      ok = await promoteBuild(PAT, bid, apiBase);
    }
    if (!ok) {
      log('  Retrying after 5s...');
      await new Promise(r => setTimeout(r, 5000));
      ok = await promoteBuild(token, bid, apiBase);
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
