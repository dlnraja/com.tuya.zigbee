#!/usr/bin/env node
/**
 * recursive-publish-monitor.js
 * Boucle récursive toutes les 30s jusqu'à publication complète sur Athom App Store
 * Vérifie: workflows GitHub, statut draft/test/live, re-dispatch si échec
 */
'use strict';

const https = require('https');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const APP_ID = 'com.dlnraja.tuya.zigbee';
const REPO = 'dlnraja/com.tuya.zigbee';
const MAX_ITER = 60; // 60 x 30s = 30 min max
const INTERVAL_MS = 30000;

// ── TOKENS ────────────────────────────────────────────────────────────────────
function getGithubToken() {
  try {
    const out = execSync('git credential fill', {
      input: 'protocol=https\nhost=github.com\n',
      encoding: 'utf8', timeout: 5000
    });
    const m = out.match(/password=(.+)/);
    return m ? m[1].trim() : null;
  } catch (e) { return null; }
}

function getAthomToken() {
  try {
    const s = JSON.parse(fs.readFileSync(
      path.join(process.env.APPDATA || '', 'athom-cli', 'settings.json'), 'utf8'
    ));
    return s?.homeyApi?.token?.access_token || null;
  } catch (e) { return null; }
}

// ── HTTP HELPER ───────────────────────────────────────────────────────────────
function apiGet(hostname, pathname, token, tokenType = 'token') {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname, path: pathname, method: 'GET',
      headers: {
        Authorization: `${tokenType} ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'tuya-monitor/1.0'
      }
    };
    const req = https.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch (e) { resolve({ status: res.statusCode, body: d }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
    req.end();
  });
}

function apiPost(hostname, pathname, token, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const opts = {
      hostname, path: pathname, method: 'POST',
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'User-Agent': 'tuya-monitor/1.0'
      }
    };
    const req = https.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
    req.write(data);
    req.end();
  });
}

// ── WORKFLOW DISPATCH ─────────────────────────────────────────────────────────
const WORKFLOW_FILES = {
  'Auto-Publish':          'auto-publish-on-push.yml',
  'Draft to Test':         'draft-to-test.yml',
  'Draft to Test Promotion': 'draft-to-test.yml',
  'Security':              'security-gate.yml',
  'Fleet-Wide':            'fleet-validation.yml',
  'Unified CI':            'unified-cicd.yml',
  'Force Publish':         'force-publish-safe.yml',
};

async function dispatchWorkflow(ghToken, wfFile) {
  try {
    const r = await apiPost('api.github.com',
      `/repos/${REPO}/actions/workflows/${wfFile}/dispatches`,
      ghToken, { ref: 'master' });
    return r.status === 204 || r.status === 200;
  } catch (e) { return false; }
}

// ── APP STORE CHECK ───────────────────────────────────────────────────────────
async function checkAppStore(athomToken) {
  // Essai 1: API publique Athom Apps
  try {
    const r = await apiGet('apps.athom.com', `/api/v1/app/${APP_ID}`, athomToken || 'none', 'Bearer');
    if (r.status === 200 && r.body) {
      return { source: 'athom-public', status: r.body.status, version: r.body.version };
    }
  } catch (e) {}

  // Essai 2: Community store
  try {
    const r2 = await apiGet('homey.community', `/t/app/${APP_ID}`, 'none', 'Bearer');
    if (r2.status === 200) return { source: 'community', status: 'found', version: '?' };
  } catch (e) {}

  // Essai 3: Athom API avec token
  if (athomToken) {
    try {
      const r3 = await apiGet('api.athom.com', `/app/${APP_ID}/versions`, athomToken, 'Bearer');
      if (r3.status === 200 && r3.body) {
        const latest = Array.isArray(r3.body) ? r3.body[0] : r3.body;
        return { source: 'athom-versions', status: latest.status || 'unknown', version: latest.version };
      }
    } catch (e) {}
  }

  return null;
}

// ── MAIN LOOP ─────────────────────────────────────────────────────────────────
async function main() {
  const ghToken = getGithubToken();
  const athomToken = getAthomToken();

  const localVersion = JSON.parse(fs.readFileSync('app.json', 'utf8')).version;

  console.log('='.repeat(70));
  console.log(`RECURSIVE PUBLISH MONITOR — ${APP_ID}`);
  console.log(`Local version: v${localVersion} | Max: ${MAX_ITER} iterations x ${INTERVAL_MS/1000}s`);
  console.log(`GH Token: ${ghToken ? ghToken.slice(0,12)+'...' : 'NOT FOUND'}`);
  console.log(`Athom Token: ${athomToken ? athomToken.slice(0,12)+'...' : 'NOT FOUND (login required)'}`);
  console.log('='.repeat(70));
  console.log('');

  let iteration = 0;
  let done = false;
  let lastDispatchedDraftTest = 0;

  while (iteration < MAX_ITER && !done) {
    iteration++;
    const ts = new Date().toLocaleTimeString('fr-FR');
    console.log(`--- [${ts}] Iteration ${iteration}/${MAX_ITER} ${'─'.repeat(40)}`);

    // 1. Récupérer les workflows
    let runs = [];
    try {
      const r = await apiGet('api.github.com',
        `/repos/${REPO}/actions/runs?per_page=20&branch=master`, ghToken);
      runs = r.status === 200 ? r.body.workflow_runs : [];
    } catch (e) { console.log(`  [GH API error] ${e.message}`); }

    // 2. Analyser les workflows clés
    const seen = new Set();
    const latestByName = [];
    for (const run of runs) {
      if (!seen.has(run.name)) { seen.add(run.name); latestByName.push(run); }
    }

    const keyRuns = latestByName.filter(r =>
      /Auto-Publish|Draft.to.Test|Security|Fleet|Orchestrator|Syntax|Mandatory|Force.Publish/i.test(r.name)
    );

    const failed = [], inProgress = [], succeeded = [];
    for (const r of keyRuns) {
      const icon = { success: 'OK', failure: 'FAIL', skipped: 'SKIP' }[r.conclusion] ||
        (r.status === 'in_progress' ? 'RUN' : r.status === 'queued' ? 'WAIT' : '?');
      console.log(`  [${icon}] #${r.run_number} ${r.name}`);
      if (r.conclusion === 'failure') failed.push(r);
      else if (r.status === 'in_progress') inProgress.push(r);
      else if (r.conclusion === 'success') succeeded.push(r);
    }

    // 3. Vérifier Auto-Publish et Draft-to-Test
    const lastPublish = latestByName.find(r => /Auto-Publish/i.test(r.name));
    const lastDraftTest = latestByName.find(r => /Draft.to.Test/i.test(r.name));

    console.log('');
    if (lastPublish) {
      const pIcon = lastPublish.conclusion === 'success' ? 'OK' : lastPublish.status === 'in_progress' ? 'RUN' : lastPublish.conclusion || lastPublish.status;
      console.log(`  [PUBLISH] #${lastPublish.run_number}: ${pIcon}`);
    }
    if (lastDraftTest) {
      const dIcon = lastDraftTest.conclusion === 'success' ? 'OK' : lastDraftTest.status === 'in_progress' ? 'RUN' : lastDraftTest.conclusion || lastDraftTest.status;
      console.log(`  [DRAFT-TEST] #${lastDraftTest.run_number}: ${dIcon}`);
    }

    // 4. Vérifier App Store
    const storeInfo = await checkAppStore(athomToken);
    if (storeInfo) {
      console.log(`  [STORE] source=${storeInfo.source} status=${storeInfo.status} v=${storeInfo.version}`);
      if (/live|published|approved|test/i.test(storeInfo.status || '')) {
        console.log('');
        console.log('[SUCCESS] APP IS ' + storeInfo.status.toUpperCase() + ' ON APP STORE!');
        done = true;
      }
    } else {
      console.log('  [STORE] No public response (normal for draft — checking workflow status)');
    }

    // 5. Condition de succès : Publish OK + Draft-to-Test OK
    if (lastPublish?.conclusion === 'success' && lastDraftTest?.conclusion === 'success') {
      console.log('');
      console.log('[SUCCESS] Auto-Publish OK + Draft-to-Test OK');
      console.log('  => App v' + localVersion + ' disponible en canal TEST sur Homey Pro');
      console.log('  => Les utilisateurs peuvent tester via: Homey > More Apps > Test Channel');
      done = true;
    }

    // 6. Si Publish OK mais Draft-to-Test absent/skipped → re-dispatch
    if (lastPublish?.conclusion === 'success' &&
        (!lastDraftTest || lastDraftTest.conclusion === 'skipped' || lastDraftTest.conclusion === 'failure') &&
        !done) {
      const now = Date.now();
      if (now - lastDispatchedDraftTest > 120000) { // max 1 dispatch toutes les 2min
        console.log('  => Re-dispatching Draft-to-Test...');
        const ok = await dispatchWorkflow(ghToken, 'draft-to-test.yml');
        console.log(`  => Dispatch: ${ok ? 'OK' : 'FAILED'}`);
        lastDispatchedDraftTest = now;
      }
    }

    // 7. Re-dispatch workflows en failure
    if (failed.length > 0 && !done) {
      console.log('');
      console.log(`  Failures detected (${failed.length}):`);
      for (const f of failed.slice(0, 3)) {
        const wfFile = Object.entries(WORKFLOW_FILES).find(([k]) => f.name.includes(k))?.[1];
        if (wfFile) {
          const ok = await dispatchWorkflow(ghToken, wfFile);
          console.log(`  => Re-dispatch ${f.name}: ${ok ? 'OK' : 'FAILED'}`);
        }
      }
    }

    if (!done) {
      console.log(`  Next check in ${INTERVAL_MS/1000}s...`);
      await new Promise(r => setTimeout(r, INTERVAL_MS));
    }
  }

  if (!done) {
    console.log('');
    console.log('[TIMEOUT] Max iterations reached — manual check required');
    console.log(`  => https://github.com/${REPO}/actions`);
    console.log(`  => https://tools.developer.homey.app`);
  }

  console.log('');
  console.log('='.repeat(70));
  console.log('MONITOR COMPLETE');
  console.log('='.repeat(70));
}

main().catch(e => { console.error('[FATAL]', e.message); process.exit(1); });
