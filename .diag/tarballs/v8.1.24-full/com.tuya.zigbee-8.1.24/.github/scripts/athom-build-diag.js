#!/usr/bin/env node
/**
 * athom-build-diag.js — Bypass SPA via AthomAppsAPI native SDK
 * 
 * INSPIRED BY:
 *   - draft-to-test.yml           (3-tier: Puppeteer > OAuth > API)
 *   - auto-publish-draft.js       (delegation token + getBuilds/promoteBuild)
 *   - verify-test-version.js      (build status check)
 *   - App.js publish()            (createDelegationToken + createBuild flow)
 *   - AthomAppsAPI.json spec      (real endpoints: getBuilds, getBuild, updateBuildChannel)
 * 
 * ENDPOINTS (from AthomAppsAPI.json spec, host: apps-api.athom.com):
 *   GET  /api/v1/app/{appId}/build             => list all builds
 *   GET  /api/v1/app/{appId}/build/{buildId}   => get build detail
 *   POST /api/v1/app/{appId}/build/{buildId}/channel => promote to test/stable
 * 
 * TOKEN: delegation token via POST /delegation/token (audience: 'apps')
 *   - Input:  PAT (Personal Access Token) or CLI stored access_token
 *   - Output: JWT string (raw, NOT {token:...})
 * 
 * Usage:
 *   node .github/scripts/athom-build-diag.js [buildId] [--promote]
 *   HOMEY_PAT=xxx node .github/scripts/athom-build-diag.js 2202 --promote
 */
'use strict';

const fs   = require('fs');
const path = require('path');

// Reuse retry-helper from existing codebase (auto-publish-draft.js does the same)
const { fetchWithRetry } = require('./retry-helper');

// App metadata
const APP_JSON = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'app.json'), 'utf8'));
const APP_ID   = APP_JSON.id      || 'com.dlnraja.tuya.zigbee';
const APP_VER  = APP_JSON.version || 'unknown';
const BUILD_ID = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : null;
const DO_PROMOTE = process.argv.includes('--promote');

// Confirmed API (from AthomAppsAPI.json spec)
const CLOUD_BASE = 'https://api.athom.com';
const APPS_BASE  = 'https://apps-api.athom.com/api/v1';

// === Get PAT from CLI stored session (AthomApiStorage) or env ===
async function getPAT() {
  if (process.env.HOMEY_PAT) {
    console.log('[AUTH] Using HOMEY_PAT env var');
    return process.env.HOMEY_PAT;
  }
  // Reuse homey CLI stored token (same as AthomApiStorage does internally)
  try {
    const Store = require('C:\\Program Files\\nodejs\\node_modules\\homey\\lib\\AthomApiStorage');
    const store = new Store();
    const data = await store.get('homeyApi');
    if (data && data.token && data.token.access_token) {
      console.log('[AUTH] Using homey CLI stored session token');
      return data.token.access_token;
    }
  } catch (e) {
    console.log('[AUTH] Could not read CLI store:', e.message);
  }
  return null;
}

async function apiFetch(url, opts = {}) {
  try {
    const r = await fetchWithRetry(url, opts, { retries: 3, delay: 1000, label: url.split('/').slice(-2).join('/') });
    const text = await r.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    return { ok: r.ok, status: r.status, data };
  } catch (e) {
    return { ok: false, status: 0, data: e.message };
  }
}

// === Delegation token — returns JWT string directly (confirmed from auto-publish-draft.js) ===
async function getDelegationToken(pat) {
  console.log('[AUTH] Requesting delegation token (audience: apps)...');
  const h = { 'Authorization': `Bearer ${pat}`, 'Content-Type': 'application/json' };
  const r = await apiFetch(`${CLOUD_BASE}/delegation/token`, {
    method: 'POST',
    headers: h,
    body: JSON.stringify({ audience: 'apps' }),
  });
  if (r.status === 200) {
    // JWT returned as raw string OR as {token: '...'} — handle both
    const jwt = (typeof r.data === 'string' && r.data.startsWith('"')) 
      ? JSON.parse(r.data)   // unwrap quoted string
      : (typeof r.data === 'string' ? r.data : r.data?.token);
    if (jwt && jwt.startsWith('ey')) {
      console.log(`[AUTH] ✅ JWT delegation token (${jwt.length} chars)`);
      return jwt;
    }
  }
  console.log(`[AUTH] ⚠️  Delegation fallback to PAT (${r.status})`);
  return pat;
}

// === getBuilds — GET /api/v1/app/{appId}/build ===
async function getBuilds(token) {
  const h = { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' };
  const url = `${APPS_BASE}/app/${APP_ID}/build`;
  console.log(`[BUILDS] GET ${url}`);
  const r = await apiFetch(url, { method: 'GET', headers: h });
  if (r.ok) {
    const builds = Array.isArray(r.data) ? r.data : (r.data?.builds || r.data?.data || []);
    console.log(`[BUILDS] ✅ ${builds.length} builds found`);
    return builds;
  }
  console.log(`[BUILDS] ❌ ${r.status}: ${JSON.stringify(r.data).slice(0, 200)}`);
  return null;
}

// === getBuild — GET /api/v1/app/{appId}/build/{buildId} ===
async function getBuildDetail(token, buildId) {
  const h = { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' };
  const url = `${APPS_BASE}/app/${APP_ID}/build/${buildId}`;
  console.log(`[BUILD#${buildId}] GET ${url}`);
  const r = await apiFetch(url, { method: 'GET', headers: h });
  if (r.ok) return r.data;
  console.log(`[BUILD#${buildId}] ❌ ${r.status}: ${JSON.stringify(r.data).slice(0,200)}`);
  return null;
}

// === updateBuildChannel — POST /api/v1/app/{appId}/build/{buildId}/channel ===
async function promoteBuild(token, buildId, channel = 'test') {
  const h = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
  const url = `${APPS_BASE}/app/${APP_ID}/build/${buildId}/channel`;
  console.log(`[PROMOTE] POST ${url} → channel=${channel}`);
  const r = await apiFetch(url, {
    method: 'POST',
    headers: h,
    body: JSON.stringify({ channel }),
  });
  if (r.ok) { console.log(`[PROMOTE] ✅ Build ${buildId} promoted to ${channel}`); return true; }
  console.log(`[PROMOTE] ❌ ${r.status}: ${JSON.stringify(r.data).slice(0,300)}`);
  return false;
}

// === Diagnose AggregateError from build data ===
function diagnose(build) {
  const str = JSON.stringify(build || {}).toLowerCase();
  return {
    status:   build?.status || build?.state || build?.channel || 'unknown',
    errors:   [
      str.includes('aggregateerror')    && 'AggregateError in build data',
      str.includes('processing failed') && 'Processing failed status',
      str.includes('invalid image')     && 'Invalid image dimensions',
      str.includes('bom')               && 'BOM encoding issue',
      str.includes('manifest')          && 'Manifest parsing error',
    ].filter(Boolean),
    warnings: [
      str.includes('timeout')  && 'Timeout detected',
      str.includes('readme')   && 'README mentioned in error',
      str.includes('utf')      && 'UTF encoding issue',
    ].filter(Boolean),
    raw: JSON.stringify(build, null, 2).slice(0, 1500),
  };
}

// === MAIN ===
async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log(`║  ATHOM BUILD DIAGNOSTIC — ${APP_ID}`);
  console.log(`║  v${APP_VER} | Build: ${BUILD_ID || 'LATEST'} | Promote: ${DO_PROMOTE}`);
  console.log(`║  ${new Date().toISOString()}`);
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // 1. Auth
  const pat = await getPAT();
  if (!pat) { console.error('❌ No PAT. Set HOMEY_PAT or run `homey login`'); process.exit(1); }
  console.log(`[AUTH] PAT: ${pat.slice(0,8)}... (${pat.length} chars)\n`);

  // 2. Delegation token
  const token = await getDelegationToken(pat);

  // 3. List builds
  console.log('\n[STEP 2] Getting all builds...');
  let builds = await getBuilds(token);
  if (!builds && token !== pat) {
    console.log('[BUILDS] Retrying with raw PAT...');
    builds = await getBuilds(pat);
  }
  if (!builds) { console.error('❌ Cannot list builds.'); process.exit(1); }

  // 4. Display summary
  console.log(`\n┌─ BUILDS SUMMARY (${builds.length} total, last 15) ─────────────────────────┐`);
  builds.slice(-15).forEach(b => {
    const id  = String(b.id || b._id || '?').padEnd(6);
    const ver = String(b.version || '?').padEnd(8);
    const ch  = String(b.channel || b.status || 'draft').padEnd(8);
    const dt  = String(b.createdAt || b.date || '?').slice(0,10);
    const cur = b.version === APP_VER ? ' ◄ CURRENT' : '';
    const err = (b.error || b.errors) ? ' ⚠️ ERROR' : '';
    console.log(`│ #${id} v${ver} [${ch}] ${dt}${cur}${err}`);
    if (b.error) console.log(`│  └─ ${JSON.stringify(b.error).slice(0,150)}`);
  });
  console.log('└──────────────────────────────────────────────────────────────┘');

  // 5. Get target build detail
  let targetId = BUILD_ID;
  if (!targetId) {
    const cur = builds.filter(b => b.version === APP_VER);
    const tgt = cur.length ? cur[cur.length - 1] : builds[builds.length - 1];
    targetId = String(tgt?.id || tgt?._id || '');
    console.log(`\n[INFO] No build ID given → using latest for v${APP_VER}: #${targetId}`);
  }

  if (targetId) {
    console.log(`\n[STEP 3] Fetching build #${targetId} detail...`);
    const detail = await getBuildDetail(token, targetId);
    if (detail) {
      const d = diagnose(detail);
      console.log(`\nStatus:  ${d.status}`);
      if (d.errors.length)   console.log(`❌ ERRORS:\n  · ${d.errors.join('\n  · ')}`);
      if (d.warnings.length) console.log(`⚠️  WARNINGS:\n  · ${d.warnings.join('\n  · ')}`);
      if (!d.errors.length && !d.warnings.length) console.log('✅ No AggregateError patterns detected');
      console.log(`\nBuild data:\n${d.raw}`);
    }
  }

  // 6. Promote if requested
  if (DO_PROMOTE && targetId) {
    console.log(`\n[STEP 4] Promoting build #${targetId} to test...`);
    let ok = await promoteBuild(token, targetId, 'test');
    if (!ok && token !== pat) {
      console.log('[PROMOTE] Retrying with raw PAT...');
      ok = await promoteBuild(pat, targetId, 'test');
    }
    if (ok) {
      console.log(`✅ Build #${targetId} v${APP_VER} promoted to TEST`);
    } else {
      console.log('❌ API promotion failed → run auto-promote-puppeteer.js as fallback');
      console.log(`   Manual: https://tools.developer.homey.app/apps/app/${APP_ID}/build/${targetId}`);
    }
  }

  // 7. Summary
  const drafts = builds.filter(b => {
    const ch = String(b.channel || b.status || '').toLowerCase();
    return (ch === 'draft' || ch === '' || ch === 'none') && b.version === APP_VER;
  });
  const tests  = builds.filter(b => String(b.channel || '').toLowerCase() === 'test' && b.version === APP_VER);

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log(`║  SUMMARY — v${APP_VER}`);
  console.log(`║  Draft builds: ${drafts.length} | Test builds: ${tests.length}`);
  if (drafts.length) console.log(`║  → Promote: node .github/scripts/athom-build-diag.js ${drafts[0].id || ''} --promote`);
  if (tests.length)  console.log(`║  ✅ Already in test channel`);
  console.log(`║  Manage: https://tools.developer.homey.app/apps/app/${APP_ID}/versions`);
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
}

main().catch(e => { console.error('❌ FATAL:', e.message, '\n', e.stack); process.exit(1); });
