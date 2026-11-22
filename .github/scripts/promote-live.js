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
const Client = require('./homey-apps-api-client');

const ROOT = path.join(__dirname, '..', '..');
const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : fallback;
};
const DRY = argv.includes('--dry-run');
const DISPATCH = argv.includes('--dispatch') || process.env.GITHUB_EVENT_NAME === 'workflow_dispatch';

function log(...a) { console.log(...a); }

const CLOUD_BASE = 'https://api.athom.com';
const APPS_BASES = [
  'https://apps-api.athom.com/api/v1',
  'https://apps-api.athom.com/api/v2',
];

function summarize(file, text) {
  const sum = process.env.GITHUB_STEP_SUMMARY;
  if (!sum) return;
  try { fs.appendFileSync(sum, String(text).endsWith('\n') ? text : text + '\n'); } catch (_e) { /* ignore */ }
}

async function apiFetch(url, method, headers, body) {
  const opts = { method, headers: { ...headers } };
  if (body !== undefined) opts.body = typeof body === 'string' ? body : JSON.stringify(body);
  const r = await fetch(url, opts);
  const raw = await r.text();
  let data;
  try { data = JSON.parse(raw); } catch { data = raw; }
  return { ok: r.ok, status: r.status, data };
}

/** Actions has HOMEY_PAT, not the Homey CLI SDK (homey/services/AthomApi). */
async function getDelegationToken(pat, logFn) {
  const h = { Authorization: 'Bearer ' + pat, 'Content-Type': 'application/json' };
  let r = await apiFetch(CLOUD_BASE + '/delegation/token', 'POST', h, { audience: 'apps' });
  let token = r.ok && r.data && (r.data.token || r.data.access_token) ? (r.data.token || r.data.access_token) : null;
  if (!token && r.ok && typeof r.data === 'string' && r.data.length > 20) {
    token = String(r.data).trim().replace(/^"|"$/g, '');
  }
  if (!token) {
    r = await apiFetch(CLOUD_BASE + '/delegation/token?audience=apps', 'POST', h, {});
    token = r.ok && r.data && (r.data.token || r.data.access_token) ? (r.data.token || r.data.access_token) : null;
    if (!token && r.ok && typeof r.data === 'string' && r.data.length > 20) {
      token = String(r.data).trim().replace(/^"|"$/g, '');
    }
  }
  if (token) logFn('Delegation token obtained');
  else logFn('Delegation failed (' + r.status + '); falling back to raw PAT');
  return token || pat;
}

function normalizeBuilds(d) {
  if (Array.isArray(d)) return d;
  if (Array.isArray(d && d.builds)) return d.builds;
  if (Array.isArray(d && d.data)) return d.data;
  if (Array.isArray(d && d.items)) return d.items;
  return [];
}

async function listBuilds(token, appId, logFn) {
  const h = { Authorization: 'Bearer ' + token, Accept: 'application/json' };
  for (const base of APPS_BASES) {
    for (const pth of ['/app/' + appId + '/build?limit=50', '/app/' + appId + '/builds?limit=50', '/app/' + appId + '/build']) {
      const url = base + pth;
      logFn('GET ' + url);
      const r = await apiFetch(url, 'GET', h);
      if (r.ok) {
        const builds = normalizeBuilds(r.data);
        if (builds.length) {
          logFn('Found ' + builds.length + ' builds at ' + url);
          return { builds, base, token };
        }
      } else {
        logFn('  ' + r.status + ' ' + JSON.stringify(r.data).slice(0, 160));
      }
    }
  }
  return { builds: [], base: APPS_BASES[0], token };
}

async function setChannel(token, appId, buildId, channel, apiBase, logFn) {
  const h = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };
  const id = String(buildId);
  const endpoints = [
    { url: apiBase + '/app/' + appId + '/build/' + id + '/channel', method: 'POST', body: { channel } },
    { url: 'https://apps-api.athom.com/api/v1/app/' + appId + '/build/' + id + '/channel', method: 'POST', body: { channel } },
  ];
  for (const ep of endpoints) {
    logFn((ep.method || 'POST') + ' ' + ep.url);
    const r = await apiFetch(ep.url, ep.method || 'POST', h, ep.body);
    if (r.ok) return r.data || { ok: true };
    logFn('  ' + r.status + ' ' + JSON.stringify(r.data).slice(0, 300));
    if (r.status === 403 || r.status === 401 || /certif/i.test(JSON.stringify(r.data))) {
      throw new Error('Athom refused Live channel update: ' + r.status + ' ' + JSON.stringify(r.data).slice(0, 300));
    }
  }
  throw new Error('updateBuildChannel(live) failed on every endpoint');
}


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
        texts.push({ atMs: at || 0, text: JSON.stringify(ev), source: path.basename(file), kind: ev.kind, historical: !at || (sinceMs && at < sinceMs) });
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
  const ev = [...rows].reverse().find((e) => {
    const id = String(e.app_id || e.app || '');
    if (id !== String(appId) && !(appId.endsWith('.stable') && id === 'stable') && !(appId.endsWith('.zigbee') && id === 'master')) return false;
    if (!/test/i.test(e.state || '')) return false;
    if (version && String(e.version) !== String(version).replace(/^v/i, '')) return false;
    if (build && String(e.build) !== String(build)) return false;
    return true;
  });
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
  let apiBase = 'https://apps-api.athom.com/api/v1';
  let appsToken = null;
  let sdkClient = null;
  if (process.env.HOMEY_PAT) {
    // Proven path (Auto-Publish 44937269110 Tier 3): pinned homey CLI AthomApi
    // + createDelegationToken({ audience: 'apps' }) + AthomAppsAPI.getBuilds.
    if (Client.sdkModulesAvailable()) {
      try {
        sdkClient = await Client.createClient({ log });
        const raw = await Client.getBuilds(sdkClient, profile.appId, { limit: 50 });
        if (raw && raw.length) {
          builds = raw;
          appsToken = sdkClient.token;
          log('Found ' + builds.length + ' builds via HomeySDK');
        } else {
          log('HomeySDK returned no builds');
        }
      } catch (e) {
        if (e && e.code === 'HOMEY_PAT_NOT_LOGGED_IN') {
          log('FATAL: ' + e.message);
          summarize('live', 'HOMEY_PAT not accepted as an Athom Cloud login (expired or lacking scope). Not retrying.\n');
          return 2;
        }
        log('HomeySDK listing failed: ' + (e && e.message || e));
      }
    } else {
      log('WARN: pinned homey CLI AthomApi modules are not installed in this job');
    }
    if (!builds.length) {
      const pat = process.env.HOMEY_PAT;
      appsToken = await getDelegationToken(pat, log);
      let listed = await listBuilds(appsToken, profile.appId, log);
      if ((!listed.builds || !listed.builds.length) && appsToken !== pat) {
        log('Delegation token was not accepted by apps-api; retrying with raw PAT');
        listed = await listBuilds(pat, profile.appId, log);
        if (listed.builds && listed.builds.length) appsToken = pat;
      }
      builds = listed.builds || [];
      apiBase = listed.base || apiBase;
      appsToken = listed.token || appsToken;
      if (!builds.length) log('WARN: could not list Athom builds with HomeySDK or REST');
    }
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
  if (!target && ledger) {
    target = {
      id: ledger.build,
      version: String(ledger.version || '').replace(/^v/i, ''),
      state: 'test',
      atMs: Date.parse(ledger.at || 0) || 0,
    };
    log('No Athom listing; using ledger Test #' + target.id + ' v' + target.version);
  }
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
    target: target || (wantBuild || wantVersion ? { id: wantBuild, version: wantVersion, state: (ledger && ledger.state) || 'unknown' } : null),
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
    summarize('live', 'HELD:\n' + verdict.reasons.map((r) => '- ' + r).join('\n') + '\n');
    return DISPATCH ? 2 : 0;
  }
  if (DRY || !appsToken) {
    log(DRY ? 'DRY-RUN: would call updateBuildChannel(live)' : 'No HOMEY_PAT: skip setChannel');
    summarize('live', 'DRY-RUN or no PAT; no channel update.\n');
    return 0;
  }
  if (!list.length) {
    log('HELD: will not setChannel without a confirmed Athom build listing');
    summarize('live', 'HELD: no confirmed Athom listing; not promoting.\n');
    return DISPATCH ? 2 : 0;
  }
  log(`Promoting #${target.id} v${target.version} to Live via updateBuildChannel`);
  let res;
  if (sdkClient) {
    res = await Client.updateBuildChannel(sdkClient, profile.appId, target.id, 'live');
  } else {
    res = await setChannel(appsToken, profile.appId, target.id, 'live', apiBase, log);
  }
  log('Channel update result:', JSON.stringify(res));
  summarize('live', `Promoted #${target.id} v${target.version} to Live.\n`);
  return 0;
}

main().then((code) => process.exit(code || 0)).catch((e) => {
  console.error('FATAL:', e && e.message || e);
  process.exit(1);
});
