#!/usr/bin/env node
/**
 * athom-build-compare.js
 * 
 * Uses AthomAppsAPI (exactly like homey CLI) to:
 * 1. Fetch full build details for GOOD and BAD builds
 * 2. Extract the exact error message from stateMeta
 * 3. Download archives for comparison
 * 4. List all recent builds with their states
 * 
 * Usage:
 *   node .github/scripts/athom-build-compare.js [goodBuildId] [badBuildId]
 *   node .github/scripts/athom-build-compare.js 2159 2204
 */
'use strict';

const path   = require('path');
const fs     = require('fs');
const https  = require('https');
const http   = require('http');

const homeyRoot = path.join(process.env.APPDATA, 'npm', 'node_modules', 'homey');
const AthomApi  = require(path.join(homeyRoot, 'services', 'AthomApi'));
const { AthomAppsAPI } = require(path.join(homeyRoot, 'node_modules', 'homey-api'));

const APP_JSON = JSON.parse(fs.readFileSync(path.join(__dirname,'..','..','app.json'),'utf8'));
const APP_ID   = APP_JSON.id || 'com.dlnraja.tuya.zigbee';

const GOOD_ID = process.argv[2] || '2159';
const BAD_ID  = process.argv[3] || '2204';
const DO_DL   = process.argv.includes('--download');
const SHOTS   = path.join(__dirname,'..','..','screenshots');
fs.mkdirSync(SHOTS, {recursive:true});

function log(m) { console.log(m); }

// Download a URL to a local file
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    log(`  [DL] ${url.slice(0,80)}...`);
    const proto = url.startsWith('https') ? https : http;
    proto.get(url, res => {
      if ([301,302,307,308].includes(res.statusCode)) {
        return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      const out = fs.createWriteStream(dest);
      res.pipe(out);
      out.on('finish', () => { out.close(); resolve(dest); });
      out.on('error', reject);
    }).on('error', reject);
  });
}

// Get archive URL from build
async function getArchiveUrl(api, token, buildId) {
  const build = await api.getBuild({
    '$token': token,
    appId: APP_ID,
    buildId: String(buildId),
  }).catch(e => null);
  
  if (!build) return null;
  
  // Try direct archiveUrl
  if (build.archiveUrl) return build.archiveUrl;
  
  // Try archiveId → construct URL
  if (build.archiveId) {
    return `https://apps-api.athom.com/api/v1/archive/${build.archiveId}`;
  }
  
  return null;
}

(async () => {
  log('\n╔══════════════════════════════════════════════════════════════╗');
  log(`║  ATHOM BUILD COMPARE — ${APP_ID}`);
  log(`║  Good: #${GOOD_ID} | Bad: #${BAD_ID}`);
  log('╚══════════════════════════════════════════════════════════════╝\n');
  
  // Auth
  log('[AUTH] Creating delegation token...');
  const token = await AthomApi.createDelegationToken({ audience: 'apps' });
  log(`[AUTH] ✅ Token obtained (${typeof token === 'string' ? token.length : 0} chars)`);
  
  const api = new AthomAppsAPI();
  log(`[API] Base URL: ${api.baseUrl}`);
  
  // List all builds (to understand history)
  log('\n[BUILDS] Listing all builds...');
  const builds = await api.getBuilds({
    '$token': token,
    appId: APP_ID,
  }).catch(e => { log(`Error: ${e.message}`); return []; });
  
  const recentBuilds = Array.isArray(builds) ? builds.slice(-20).reverse() : [];
  log(`Found ${recentBuilds.length} recent builds:`);
  for (const b of recentBuilds.slice(0, 20)) {
    const stateIcon = {
      'live':             '🟢',
      'test':             '🔵',
      'draft':            '⚪',
      'processing':       '🔄',
      'processing_failed':'🔴',
      'inreview':         '🟡',
    }[b.state] || '❓';
    log(`  ${stateIcon} #${b.id} v${b.version} state=${b.state} created=${b.createdAt?.slice(0,10)}`);
  }
  
  // Get good build details
  log('\n[GOOD BUILD #' + GOOD_ID + '] Fetching details...');
  const goodBuild = await api.getBuild({
    '$token': token,
    appId: APP_ID,
    buildId: GOOD_ID,
  }).catch(e => ({ error: e.message }));
  
  log('[GOOD] Full data:');
  log(JSON.stringify(goodBuild, null, 2));
  fs.writeFileSync(path.join(SHOTS, `build-${GOOD_ID}-good.json`), JSON.stringify(goodBuild, null, 2));
  
  // Get bad build details
  log('\n[BAD BUILD #' + BAD_ID + '] Fetching details...');
  const badBuild = await api.getBuild({
    '$token': token,
    appId: APP_ID,
    buildId: BAD_ID,
  }).catch(e => ({ error: e.message }));
  
  log('[BAD] Full data:');
  log(JSON.stringify(badBuild, null, 2));
  fs.writeFileSync(path.join(SHOTS, `build-${BAD_ID}-bad.json`), JSON.stringify(badBuild, null, 2));
  
  // Extract error
  log('\n=== ROOT CAUSE ANALYSIS ===');
  if (badBuild.stateMeta) {
    log('⚠️  stateMeta (ERROR MESSAGE):');
    log(JSON.stringify(badBuild.stateMeta, null, 2));
  }
  if (badBuild.error) {
    log('⚠️  error field: ' + badBuild.error);
  }
  
  // Compare key fields
  log('\n=== FIELD COMPARISON ===');
  const compareFields = ['state', 'stateMeta', 'version', 'sdk', 'changelog'];
  for (const field of compareFields) {
    const gv = JSON.stringify(goodBuild[field]);
    const bv = JSON.stringify(badBuild[field]);
    const same = gv === bv;
    log(`  ${same ? '✅' : '❌'} ${field}: good=${gv?.slice(0,60)} | bad=${bv?.slice(0,60)}`);
  }
  
  // Download archives
  if (DO_DL) {
    log('\n=== DOWNLOADING ARCHIVES ===');
    
    // Good build archive
    const goodArchUrl = await getArchiveUrl(api, token, GOOD_ID);
    if (goodArchUrl) {
      const dest = path.join(SHOTS, `archive-${GOOD_ID}-good.tgz`);
      try { await downloadFile(goodArchUrl, dest); log(`✅ Good archive: ${dest}`); }
      catch(e) { log(`❌ Good archive error: ${e.message}`); }
    } else { log(`⚠️  No archive URL for build #${GOOD_ID}`); }
    
    // Bad build archive
    const badArchUrl = await getArchiveUrl(api, token, BAD_ID);
    if (badArchUrl) {
      const dest = path.join(SHOTS, `archive-${BAD_ID}-bad.tgz`);
      try { await downloadFile(badArchUrl, dest); log(`✅ Bad archive: ${dest}`); }
      catch(e) { log(`❌ Bad archive error: ${e.message}`); }
    } else { log(`⚠️  No archive URL for build #${BAD_ID}`); }
  }
  
  log('\n=== SUMMARY ===');
  log(`Good #${GOOD_ID}: state=${goodBuild.state}`);
  log(`Bad  #${BAD_ID}: state=${badBuild.state}`);
  if (badBuild.stateMeta) {
    log(`\n🔴 AggregateError reason from stateMeta:`);
    log(JSON.stringify(badBuild.stateMeta));
  } else {
    log('\n⚠️  No stateMeta found in bad build — error may be in archive processing');
  }
  
})().catch(e => {
  console.error('FATAL:', e.message);
  console.error(e.stack?.split('\n').slice(0, 8).join('\n'));
  process.exit(1);
});
