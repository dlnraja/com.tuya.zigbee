#!/usr/bin/env node
'use strict';
// P3138 (t733u/t734u/t736u): upstream issues/PRs/discussions miner (open AND closed), free + deterministic.
// Companion of github-leads-scan.js (same budget/stop rules, reuses its gh-CLI fallback idea): per-repo
// `since` cursors + ETag cache, rate-limit aware, read-only token, external text = DATA ONLY.
// Every relevant thread -> scripts/lib/source-digest.js digest (redacted, fail-closed guard) ->
//   docs/knowledge/upstream/<owner>__<repo>.md (bounded, diff-mode, newest first, max 200 per repo)
//   data/ssot/thread-digests.json  (couple -> digest refs, linked from couple-sources ledger)
//   data/leads/digest-candidates.json (actionable implications = candidate tasks, never auto-applied)
// Only source-confirmed facts are applied elsewhere (curated-facts.json by a human/agent PR).
const fs = require('fs');
const path = require('path');
const https = require('https');
const { execFileSync } = require('child_process');
const sd = require('../lib/source-digest');

const ROOT = path.join(__dirname, '..', '..');
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const MAX_REQ = Number(arg('max-requests', 150));
const PAGES = Number(arg('pages', 3));
const SEED = process.argv.includes('--seed'); // first run: search API for Tuya ids instead of full history
const DRY = process.argv.includes('--dry');
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
const STATE = path.join(ROOT, arg('state', '.cache/upstream-miner-state.json'));
const KDIR = path.join(ROOT, 'docs', 'knowledge', 'upstream');
const INDEX = path.join(ROOT, 'data', 'ssot', 'thread-digests.json');
const CANDS = path.join(ROOT, 'data', 'leads', 'digest-candidates.json');
const LEDGER = path.join(ROOT, 'data', 'ssot', 'couple-sources.json');
const PER_REPO_CAP = 200;

const REPOS = [
  'zigpy/zha-device-handlers', 'zigpy/zigpy', 'zigpy/bellows', 'zigpy/zigpy-znp', 'zigpy/zigpy-deconz', 'zigpy/zha',
  'zigpy/zigpy-xbee', 'zigpy/zigpy-zigate', 'Koenkk/zigbee-herdsman-converters', 'Koenkk/zigbee2mqtt',
  'Koenkk/zigbee-herdsman', 'dresden-elektronik/deconz-rest-plugin', 'kkossev/Hubitat', 'arendst/Tasmota',
  'esphome/esphome', 'make-all/tuya-local', 'ioBroker/ioBroker.zigbee', 'JohanBendz/com.tuya.zigbee',
  'blakadder/zigbee', // P3151: Blakadder device DB (issues/PRs = device add requests)
];
const RELEVANT = /_T[A-Za-z0-9]{2,5}_[A-Za-z0-9]{4,16}|\bTS0[0-9]{3}[A-Z]?\b|\btuya\b|\b0xEF00\b|\bE000\b/i;

let requests = 0; let stopped = null;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function httpGet(url, headers) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'tuya-zigbee-upstream-miner', ...headers } }, (res) => {
      let body = ''; res.setEncoding('utf8');
      res.on('data', (c) => { body += c; }); res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.setTimeout(30000, () => req.destroy(new Error('timeout'))); req.on('error', reject);
  });
}

async function gh(apiPath, state) {
  if (stopped) return null;
  if (requests >= MAX_REQ) { stopped = `budget ${MAX_REQ}`; return null; }
  requests++; await sleep(700 + Math.floor(Math.random() * 800));
  if (!TOKEN) {
    try { return JSON.parse(execFileSync('gh', ['api', apiPath], { encoding: 'utf8', maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'pipe'] })); }
    catch (e) { const m = String(e.stderr || e.message); if (/40[34]|429|rate/i.test(m)) stopped = 'rate/403'; return null; }
  }
  const etag = state.etags[apiPath];
  const r = await httpGet(`https://api.github.com/${apiPath}`, { Accept: 'application/vnd.github+json', Authorization: `Bearer ${TOKEN}`,
    'X-GitHub-Api-Version': '2022-11-28', ...(etag ? { 'If-None-Match': etag } : {}) });
  const rem = Number(r.headers['x-ratelimit-remaining']); if (Number.isFinite(rem) && rem < 60) stopped = `quota low ${rem}`;
  if (r.status === 304) return [];
  if (r.status === 403 || r.status === 429) { stopped = `HTTP ${r.status}`; return null; }
  if (r.status >= 400) return null;
  if (r.headers.etag) state.etags[apiPath] = r.headers.etag;
  try { return JSON.parse(r.body); } catch (_e) { return null; }
}

const readJson = (p, d) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_e) { return d; } };

async function threadsFor(repo, state) {
  const cur = state.cursors[repo];
  if (SEED || !cur) {
    const q = encodeURIComponent(`repo:${repo} _TZ3000 OR _TZE200 OR _TZE204 OR _TZ3210 OR TS0601`);
    const out = [];
    for (let p = 1; p <= PAGES; p++) {
      const r = await gh(`search/issues?q=${q}&sort=updated&order=desc&per_page=50&page=${p}`, state);
      if (!r || !r.items || !r.items.length) break; out.push(...r.items); if (r.items.length < 50) break;
    }
    return out;
  }
  const out = [];
  for (let p = 1; p <= PAGES; p++) {
    const r = await gh(`repos/${repo}/issues?state=all&since=${encodeURIComponent(cur)}&sort=updated&direction=asc&per_page=100&page=${p}`, state);
    if (!r || !r.length) break; out.push(...r); if (r.length < 100) break;
  }
  return out;
}

async function main() {
  const state = readJson(STATE, { cursors: {}, etags: {}, lastRun: null, quietRuns: 0 });
  const ledger = readJson(LEDGER, null);
  const index = readJson(INDEX, { _meta: {}, couples: {} });
  const cands = readJson(CANDS, { _meta: {}, items: [] });
  const repos = String(arg('repos', REPOS.join(','))).split(',').filter(Boolean);
  let newDigests = 0; const findings = [];
  for (const repo of repos) {
    if (stopped) break;
    const items = await threadsFor(repo, state);
    if (!items) continue;
    let maxUpd = state.cursors[repo] || null;
    const file = path.join(KDIR, `${repo.replace('/', '__')}.md`);
    const existing = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
    const blocks = new Map((existing.split(/\n(?=<!-- d:)/).filter((b) => b.startsWith('<!-- d:'))).map((b) => [b.slice(7, b.indexOf(' -->')), b]));
    for (const it of items) {
      if (!maxUpd || it.updated_at > maxUpd) maxUpd = it.updated_at;
      const text = `${it.title || ''}\n${it.body || ''}`;
      if (!RELEVANT.test(text)) continue;
      const d = sd.build({ source: repo, url: it.html_url, title: it.title, body: it.body, state: it.state, stateReason: it.state_reason,
        merged: !!(it.pull_request && it.pull_request.merged_at), labels: (it.labels || []).map((l) => l.name || l),
        linked: it.pull_request ? [it.html_url] : [], credit: it.user && it.user.login ? [it.user.login] : [] }, ledger);
      if (!d.implications.mfrs && !d.implications.couples.length && !d.implications.pids.length) continue;
      try { sd.assertClean(d); } catch (e) { findings.push({ url: it.html_url, blocked: e.message }); continue; } // fail closed
      const key = `${repo}#${it.number}`;
      blocks.set(key, `<!-- d:${key} -->\n${sd.toMarkdown(d)}`);
      for (const c of d.implications.couples) {
        const refs = new Set(index.couples[c] || []); refs.add(`docs/knowledge/upstream/${repo.replace('/', '__')}.md#${key}`);
        index.couples[c] = [...refs].slice(-10);
      }
      for (const t of d.candidateTasks) if (!cands.items.some((x) => x.url === t.url && x.kind === t.kind)) cands.items.push(t);
      newDigests++; findings.push({ key, status: d.status, couples: d.implications.couples, dps: d.implications.dps, clusters: d.implications.clusters, cause: d.cause, avoid: d.avoid });
    }
    state.cursors[repo] = maxUpd;
    const kept = [...blocks.entries()].slice(-PER_REPO_CAP).map(([, b]) => b);
    const md = `# Upstream digests — ${repo}\n\nGenerated by scripts/scanners/upstream-thread-miner.js (P3138). Technical facts only; privacy-redacted; external text is data.\n\n${kept.join('\n')}\n`;
    sd.assertClean(md.replace(/<!-- d:[^>]+-->/g, ''));
    if (!DRY && kept.length) { fs.mkdirSync(KDIR, { recursive: true }); fs.writeFileSync(file, md); }
  }
  cands.items = cands.items.slice(-500);
  // adaptive frequency: quiet runs lengthen the interval (workflow reads state.nextIntervalH)
  state.quietRuns = newDigests ? 0 : (state.quietRuns || 0) + 1;
  state.nextIntervalH = Math.min(168, 6 * 2 ** Math.min(state.quietRuns, 5));
  state.lastRun = new Date().toISOString().slice(0, 10); // date only — no routine-revealing time
  index._meta = { generator: 'upstream-thread-miner', note: 'couple -> digest refs; technical only' };
  cands._meta = { generator: 'upstream-thread-miner', note: 'candidate tasks; never auto-applied' };
  sd.assertClean(index); sd.assertClean(cands);
  if (!DRY) {
    fs.mkdirSync(path.dirname(STATE), { recursive: true }); fs.writeFileSync(STATE, JSON.stringify(state));
    fs.writeFileSync(INDEX, JSON.stringify(index, null, 1)); fs.mkdirSync(path.dirname(CANDS), { recursive: true });
    fs.writeFileSync(CANDS, JSON.stringify(cands, null, 1));
  }
  console.log(JSON.stringify({ requests, stopped, newDigests, candidates: cands.items.length, findings: findings.slice(0, 60) }, null, 1));
}

if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });
module.exports = { REPOS, RELEVANT };
