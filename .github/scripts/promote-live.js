#!/usr/bin/env node
'use strict';
/**
 * P3360: promote a healthy Athom Test build to Live only after objective gates pass.
 * Usage: node .github/scripts/promote-live.js --app master --build 3717 --version 9.0.1636
 *        [--dry-run] [--dispatch]
 * Needs HOMEY_PAT for Athom. Optional GH_TOKEN/gh for CI status.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const G = require('../../scripts/ci/live-promote-gates.cjs');

const ROOT = path.join(__dirname, '..', '..');
const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : fallback;
};
const DRY = argv.includes('--dry-run');
const DISPATCH = argv.includes('--dispatch') || process.env.GITHUB_EVENT_NAME === 'workflow_dispatch';

function log(...a) { console.log(...a); }

function loadJsonl(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split(/\n/).map((l) => {
    try { return JSON.parse(l); } catch { return null; }
  }).filter(Boolean);
}

function load1574Ids() {
  const f = path.join(ROOT, 'test/fixtures/athom-test-9.0.1574-driver-ids.json');
  if (!fs.existsSync(f)) return [];
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  return Array.isArray(j) ? j : (j.ids || []);
}

function loadCandidateIds(sha) {
  let manifest = null;
  if (sha) {
    try {
      const raw = execFileSync('git', ['show', `${sha}:app.json`], { encoding: 'utf8', maxBuffer: 25 * 1024 * 1024 });
      manifest = JSON.parse(raw);
    } catch (e) {
      log('WARN: git show app.json at', sha, e.message || e);
    }
  }
  if (!manifest) {
    manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
  }
  const { sourceToPayload } = require('../../scripts/maintenance/publish-baseline-gate.cjs');
  const view = sourceToPayload(manifest, ROOT);
  return (view.drivers || []).map((d) => d.id);
}

function collectCi(sha) {
  if (!sha) return {};
  try {
    const raw = execFileSync('gh', [
      'run', 'list', '--repo', process.env.GITHUB_REPOSITORY || 'dlnraja/com.tuya.zigbee',
      '--commit', sha, '--limit', '40',
      '--json', 'conclusion,status,name,workflowName,createdAt',
    ], { encoding: 'utf8', timeout: 60000 });
    const list = JSON.parse(raw);
    const ci = {};
    for (const r of list) {
      const name = r.workflowName || r.name;
      if (!ci[name] || r.conclusion === 'success') {
        if (r.status === 'completed') ci[name] = r.conclusion || 'missing';
        else ci[name] = r.status || 'pending';
      }
    }
    return ci;
  } catch (e) {
    log('WARN: could not list CI runs:', e.message || e);
    return {};
  }
}

function collectCrashTexts(sinceMs) {
  const texts = [];
  const files = [
    path.join(ROOT, 'docs/knowledge/athom-publish-outcomes.jsonl'),
    path.join(ROOT, 'docs/status/athom-publish-outcomes.jsonl'),
  ];
  const notebook = process.env.LIVE_NOTEBOOK_PATH
    || '/cursor/stores/store-4fe2e61e-f291-46a0-9661-eab0ee836944/homey/routines-context.md';
  if (fs.existsSync(notebook)) files.push(notebook);
  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    const raw = fs.readFileSync(file, 'utf8');
    if (file.endsWith('.jsonl')) {
      for (const ev of loadJsonl(file)) {
        const at = Date.parse(ev.at || ev.date || ev.when || 0);
        texts.push({ atMs: at || 0, text: JSON.stringify(ev), source: path.basename(file), historical: at && sinceMs && at < sinceMs });
      }
    } else {
      for (const line of raw.split(/\n/)) {
        const m = line.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2})/);
        let at = 0;
        if (m) {
          // Notebook times are Europe/Paris (CET/CEST). Treat as +01:00 in November.
          at = Date.parse(m[1].replace(' ', 'T') + ':00+01:00') || 0;
        }
        texts.push({ atMs: at, text: line, source: path.basename(file), historical: at && sinceMs && at < sinceMs });
      }
    }
  }
  return texts;
}

function candidateFromLedger(appId, version, build) {
  const rows = loadJsonl(path.join(ROOT, 'docs/knowledge/athom-publish-outcomes.jsonl'));
  const ev = [...rows].reverse().find((e) => String(e.app_id) === appId && String(e.version) === String(version)
    && (!build || String(e.build) === String(build)) && /test/i.test(e.state));
  return ev || null;
}

async function main() {
  const appKey = arg('app', process.env.LIVE_APP || 'master');
  const profile = G.APPS[appKey];
  if (!profile) throw new Error(`unknown app ${appKey}`);
  if (appKey === 'bastien' || (profile && profile.neverLive) || profile.appId === 'com.dlnraja.tuya.zigbee.bastien') {
    log('REFUSED: Bastien (com.dlnraja.tuya.zigbee.bastien) must never go to Live; it is only for Bastien\'s house');
    return 2;
  }
  const wantBuild = arg('build', process.env.LIVE_BUILD || '');
  const wantVersion = arg('version', process.env.LIVE_VERSION || '');

  let builds = [];
  let client = null;
  if (process.env.HOMEY_PAT) {
    const { createClient, getBuilds } = require('./homey-apps-api-client');
    client = await createClient({ pat: process.env.HOMEY_PAT, log });
    builds = await getBuilds(client, profile.appId, { limit: 50 });
  } else {
    log('WARN: HOMEY_PAT missing; gates will run without a live Athom listing');
  }

  const norm = (b) => ({
    id: b.id || b.buildId || b._id,
    version: String(b.version || '').replace(/^v/i, ''),
    state: G.stateOf(b),
    atMs: Date.parse(b.stateChangedAt || b.updatedAt || b.createdAt || 0) || 0,
  });
  const list = builds.map(norm);
  const liveNow = list.find((b) => b.state === 'live');
  let target = list.find((b) => (wantBuild && String(b.id) === String(wantBuild))
    || (wantVersion && b.version === String(wantVersion).replace(/^v/i, '') && b.state === 'test'));
  if (!target && !wantBuild && !wantVersion) target = list.find((b) => b.state === 'test');

  const ledger = candidateFromLedger(profile.appId, (target && target.version) || wantVersion, (target && target.id) || wantBuild);
  const testAtMs = (target && target.atMs) || (ledger && Date.parse(ledger.at)) || 0;
  const sha = ledger && ledger.source_sha;
  const ci = collectCi(sha);
  const validatePublish = ci['Homey App Validate (all levels)'] === 'success'
    || ci['🔍 Validate Homey App'] === 'success';

  let candidateIds = [];
  if (appKey === 'master') {
    try {
      candidateIds = loadCandidateIds(sha);
    } catch (e) {
      log('WARN: sourceToPayload failed:', e.message || e);
    }
  }

  const requiredDriverIds = (appKey === 'master') ? load1574Ids() : [];
  let retiredDriverIds = [];
  try {
    const ret = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/live-retired-driver-ids.json'), 'utf8'));
    retiredDriverIds = Object.keys(ret.ids || ret);
  } catch (_e) { /* optional */ }

  const crashTexts = collectCrashTexts(testAtMs);
  const verdict = G.evaluateLiveGates({
    app: appKey,
    nowMs: Date.now(),
    target: target || (wantBuild || wantVersion ? { id: wantBuild, version: wantVersion, state: 'unknown' } : null),
    testAtMs,
    ci,
    validatePublish,
    candidateIds,
    requiredDriverIds,
    retiredDriverIds,
    crashTexts,
    scannedNow: true,
  });

  log(JSON.stringify({
    app: appKey, appId: profile.appId, dryRun: DRY, target, liveNow: liveNow && liveNow.id,
    testAt: testAtMs ? new Date(testAtMs).toISOString() : null, sha, verdict,
  }, null, 2));

  if (verdict.alreadyLive) {
    log('Already Live: nothing to do.');
    return 0;
  }
  if (!verdict.ok) {
    log('HELD: Live promotion blocked by objective gates:');
    for (const r of verdict.reasons) log(' -', r);
    return DISPATCH ? 2 : 0;
  }
  if (DRY || !client) {
    log(DRY ? 'DRY-RUN: would call updateBuildChannel(live)' : 'No HOMEY_PAT: skip setChannel');
    return 0;
  }
  const { updateBuildChannel } = require('./homey-apps-api-client');
  log(`Promoting #${target.id} v${target.version} to Live via updateBuildChannel`);
  const res = await updateBuildChannel(client, profile.appId, target.id, 'live');
  log('Channel update result:', JSON.stringify(res));
  return 0;
}

main().then((code) => process.exit(code || 0)).catch((e) => {
  console.error('FATAL:', e && e.message || e);
  process.exit(1);
});
