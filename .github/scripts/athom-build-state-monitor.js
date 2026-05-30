#!/usr/bin/env node
/**
 * athom-build-state-monitor.js
 *
 * Monitors the current build state via AthomAppsAPI (CLI token).
 * Shows ALL builds: state, version, SDK, driver count, archive size.
 * Detects draft builds ready for promotion.
 * Does NOT need HOMEY_EMAIL/PASSWORD — uses CLI session directly.
 *
 * Usage:
 *   node .github/scripts/athom-build-state-monitor.js
 *   node .github/scripts/athom-build-state-monitor.js --watch     (polls every 30s)
 *   node .github/scripts/athom-build-state-monitor.js --ci        (exit 1 if no test build)
 *   node .github/scripts/athom-build-state-monitor.js --wait-test (block until test state)
 */
'use strict';

const path = require('path');
const fs   = require('fs');

const ROOT   = path.join(__dirname, '..', '..');
const APP_ID = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8')).id || 'com.dlnraja.tuya.zigbee';
const WATCH  = process.argv.includes('--watch');
const CI     = process.argv.includes('--ci');
const WAIT   = process.argv.includes('--wait-test');
const LIMIT  = parseInt(process.argv.find(a => a.startsWith('--limit='))?.split('=')[1] || '20');
const WAIT_TIMEOUT = 600; // 10 min max

const SHOTS_DIR = path.join(ROOT, 'screenshots', 'monitor');
fs.mkdirSync(SHOTS_DIR, { recursive: true });

// ─── Color output ─────────────────────────────────────────────────────────────
const C = {
  red:    s => `\x1b[31m${s}\x1b[0m`,
  green:  s => `\x1b[32m${s}\x1b[0m`,
  yellow: s => `\x1b[33m${s}\x1b[0m`,
  blue:   s => `\x1b[34m${s}\x1b[0m`,
  bold:   s => `\x1b[1m${s}\x1b[0m`,
  dim:    s => `\x1b[2m${s}\x1b[0m`,
};

function stateLabel(state) {
  if (!state) return C.red('❌ undefined');
  switch (state) {
    case 'test':               return C.green('✅ test');
    case 'live':               return C.green('🌐 live');
    case 'draft':              return C.yellow('📝 draft');
    case 'processing':         return C.yellow('⏳ processing');
    case 'processing_failed':  return C.red('❌ processing_failed');
    default:                   return C.dim(`⚪ ${state}`);
  }
}

// ─── Load AthomAppsAPI ────────────────────────────────────────────────────────
async function getApi() {
  // Try to load from homey CLI global install
  const candidates = [
    path.join(process.env.APPDATA || '', 'npm', 'node_modules', 'homey'),
    path.join(process.env.HOME || '', '.npm', 'lib', 'node_modules', 'homey'),
    '/usr/lib/node_modules/homey',
    '/usr/local/lib/node_modules/homey',
  ];

  for (const homeyRoot of candidates) {
    try {
      const AthomApi = require(path.join(homeyRoot, 'services', 'AthomApi'));
      const { AthomAppsAPI } = require(path.join(homeyRoot, 'node_modules', 'homey-api'));

      const token = await AthomApi.createDelegationToken({ audience: 'apps' });
      const api   = new AthomAppsAPI();
      api._token  = token;
      return { api, token };
    } catch {}
  }

  // Try local homey-api package
  try {
    const { AthomAppsAPI } = require('homey-api');
    // Still need a token from CLI settings
    const settingsPath = path.join(process.env.APPDATA || '', 'athom-cli', 'settings.json');
    if (!fs.existsSync(settingsPath)) throw new Error('No CLI settings');
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    const token    = settings?.homeyApi?.token?.access_token;
    if (!token) throw new Error('No token in settings');
    const api   = new AthomAppsAPI();
    api._token  = token;
    return { api, token };
  } catch (e) {
    console.error(C.red('[API] Cannot load AthomAppsAPI: ' + e.message));
    console.error(C.dim('  → Ensure: npm install -g homey  and  homey login'));
    return null;
  }
}

// ─── Format bytes ─────────────────────────────────────────────────────────────
function fmtBytes(n) {
  if (!n) return C.red('N/A');
  const mb = (n / 1024 / 1024).toFixed(2);
  const color = n > 30 * 1024 * 1024 ? C.red : n > 20 * 1024 * 1024 ? C.yellow : C.green;
  return color(`${mb} MB`);
}

// ─── Fetch and display build list ─────────────────────────────────────────────
async function fetchBuilds(api, token) {
  let builds = [];
  try {
    const result = await api.getBuilds({ '$token': token, appId: APP_ID });
    builds = Array.isArray(result) ? result : (result.items || result.data || [result]);
  } catch (e) {
    console.error(C.red('[API] getBuilds error: ' + e.message));
    return [];
  }

  // Sort by ID descending (newest first)
  builds.sort((a, b) => (b.id || 0) - (a.id || 0));
  return builds.slice(0, LIMIT);
}

async function displayBuilds(builds) {
  const now = new Date().toLocaleTimeString();
  console.clear();

  console.log(C.bold(`\n╔══════════════════════════════════════════════════════════════╗`));
  console.log(C.bold(`║  ATHOM BUILD STATE MONITOR — ${APP_ID}`));
  console.log(C.bold(`║  Last check: ${now}  (showing ${builds.length} builds)`));
  console.log(C.bold(`╚══════════════════════════════════════════════════════════════╝\n`));

  // Header
  const h = (s, w) => s.toString().padEnd(w);
  console.log(C.dim(
    h('ID',6) + h('Version',10) + h('State',25) + h('SDK',5) + h('Drivers',9) + h('Size',12) + 'Changed'
  ));
  console.log(C.dim('─'.repeat(85)));

  let hasDraft = false;
  let hasTest  = false;
  let latestDraft = null;
  let latestTest  = null;

  for (const b of builds) {
    const id      = String(b.id || '?').padEnd(6);
    const ver     = String(b.version || '?').padEnd(10);
    const state   = stateLabel(b.state).padEnd(25);  // note: includes ANSI codes
    const sdk     = String(b.sdk ?? C.red('?')).padEnd(5);
    const drivers = String(b.drivers?.length ?? '?').padEnd(9);
    const size    = fmtBytes(b.size).padEnd(12);
    const ts      = b.stateChangedAt ? new Date(b.stateChangedAt).toLocaleString() : '?';

    console.log(`${id}${ver}${stateLabel(b.state).padEnd(14)} ${sdk}${drivers}${fmtBytes(b.size).padEnd(10)} ${C.dim(ts)}`);

    if (b.state === 'draft') {
      hasDraft = true;
      if (!latestDraft || b.id > latestDraft.id) latestDraft = b;
    }
    if (b.state === 'test') {
      hasTest = true;
      if (!latestTest || b.id > latestTest.id) latestTest = b;
    }
  }

  console.log();

  // Summary
  if (latestTest) {
    console.log(C.green(`✅ Latest test build: #${latestTest.id} v${latestTest.version} (${latestTest.drivers?.length ?? '?'} drivers)`));
    console.log(C.dim(`   Install: https://homey.app/a/${APP_ID}/test/`));
  }
  if (latestDraft) {
    console.log(C.yellow(`📝 Draft available: #${latestDraft.id} v${latestDraft.version}`));
    if (latestDraft.sdk && latestDraft.drivers?.length > 0) {
      console.log(C.green(`   Draft appears parseable (sdk=${latestDraft.sdk}, ${latestDraft.drivers.length} drivers)`));
      console.log(C.dim(`   → Run Draft-to-Test workflow to promote`));
    } else {
      console.log(C.red(`   ⚠️  Draft may be broken: sdk=${latestDraft.sdk ?? 'undefined'}, ${latestDraft.drivers?.length ?? 0} drivers`));
      console.log(C.dim(`   → Archive may still be too large or app.json malformed`));
    }
  }

  const failedBuilds = builds.filter(b => b.state === 'processing_failed');
  if (failedBuilds.length > 0) {
    console.log(C.red(`\n❌ ${failedBuilds.length} processing_failed build(s):`));
    for (const b of failedBuilds.slice(0, 3)) {
      const urlBad = (b.archiveUrl || '').includes('/undefined/');
      console.log(C.red(`   #${b.id} v${b.version}${urlBad ? ' — archive URL /undefined/ (manifest not parsed)' : ''}`));
    }
  }

  // Save state snapshot
  const snapshot = {
    timestamp: new Date().toISOString(),
    hasDraft, hasTest,
    latestDraft: latestDraft ? { id: latestDraft.id, version: latestDraft.version, sdk: latestDraft.sdk, drivers: latestDraft.drivers?.length } : null,
    latestTest:  latestTest  ? { id: latestTest.id,  version: latestTest.version,  sdk: latestTest.sdk,  drivers: latestTest.drivers?.length  } : null,
    failedCount: failedBuilds.length,
  };
  fs.writeFileSync(path.join(SHOTS_DIR, 'state-snapshot.json'), JSON.stringify(snapshot, null, 2));

  return { hasDraft, hasTest, latestDraft, latestTest };
}

// ─── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  const ctx = await getApi();
  if (!ctx) process.exit(1);

  const { api, token } = ctx;

  if (WAIT) {
    // Poll until test build appears or timeout
    console.log(C.yellow(`⏳ Waiting for test build (max ${WAIT_TIMEOUT}s)...`));
    const start = Date.now();
    while ((Date.now() - start) / 1000 < WAIT_TIMEOUT) {
      const builds = await fetchBuilds(api, token);
      const { hasTest, latestTest } = await displayBuilds(builds);
      if (hasTest) {
        console.log(C.green(`\n✅ Test build confirmed: #${latestTest.id} v${latestTest.version}`));
        process.exit(0);
      }
      console.log(C.dim(`  No test build yet. Retrying in 30s... (${Math.round((Date.now() - start) / 1000)}s elapsed)`));
      await new Promise(r => setTimeout(r, 30000));
    }
    console.error(C.red(`\n❌ Timeout: no test build after ${WAIT_TIMEOUT}s`));
    process.exit(1);
  }

  if (WATCH) {
    // Continuous watch
    while (true) {
      const builds = await fetchBuilds(api, token);
      await displayBuilds(builds);
      await new Promise(r => setTimeout(r, 30000));
    }
  }

  // Single run
  const builds = await fetchBuilds(api, token);
  const { hasTest } = await displayBuilds(builds);

  if (CI && !hasTest) {
    console.error(C.red('\n❌ CI: No test build found'));
    process.exit(1);
  }

})().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
