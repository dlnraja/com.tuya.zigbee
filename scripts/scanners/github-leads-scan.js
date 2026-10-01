#!/usr/bin/env node
'use strict';
/**
 * Incremental, read-only GitHub leads scanner (no AI, Node built-ins only).
 *
 * Phases (each resumes from the cursor in docs/automation/leads-other-apps-cursor.json → "scan"):
 *   comments  — issue/PR conversation comments of the tracked repos (newest first, page by page)
 *   issues    — issues/PRs (open + closed) of the tracked repos (most recently updated first)
 *   peers     — issues + comments of other Homey Zigbee/Tuya app repos
 *   peerDrivers — driver.compose.json of peer repos (git tree 1 call, files via raw host)
 *   forks     — forks of the root repos, every branch compared to the root default branch
 *               (forks never pushed after creation are skipped without an API call)
 *
 * Output: data/leads/github-leads.json (dedup by mfr+url) with mfr, pids, DPs, firmware keywords,
 * a short snippet and whether the mfr is already in one of our drivers.
 *
 * Safety: polite random delay between calls, hard request budget (--max-requests, default 120),
 * stops immediately on 403/429 (and on low remaining quota) and saves the cursor.
 * Auth: GITHUB_TOKEN / GH_TOKEN env (CI); otherwise falls back to the `gh api` CLI if present.
 *
 *   node scripts/scanners/github-leads-scan.js [--max-requests=120] [--min-delay=1500] [--max-delay=4000]
 *        [--phases=comments,issues,peers,peerDrivers,forks] [--dry]
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const CURSOR_FILE = path.join(ROOT, 'docs', 'automation', 'leads-other-apps-cursor.json');
const LEADS_FILE = path.join(ROOT, 'data', 'leads', 'github-leads.json');
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const MAX_REQ = Number(arg('max-requests', 120));
const MIN_DELAY = Number(arg('min-delay', 1500));
const MAX_DELAY = Number(arg('max-delay', 4000));
const PHASES = String(arg('phases', 'comments,issues,peers,peerDrivers,forks')).split(',').filter(Boolean);
const DRY = process.argv.includes('--dry');
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';

const DEFAULT_SCAN = {
  tracked: ['dlnraja/com.tuya.zigbee', 'JohanBendz/com.tuya.zigbee'],
  peers: ['JohanBendz/com.lidl', 'ChrisBloem/Homey-Zigbee-Community', 'gpmachado/com.gpm.homesuite', 'kodalissri/com.MyZigbee.Devices'],
  forkRoots: ['JohanBendz/com.tuya.zigbee', 'dlnraja/com.tuya.zigbee'],
  comments: {}, issues: {}, peerIssues: {}, peerComments: {}, peerDrivers: {}, forks: {},
};

let requests = 0;
let stopped = null;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const jitter = () => sleep(MIN_DELAY + Math.floor(Math.random() * Math.max(0, MAX_DELAY - MIN_DELAY)));

function httpGet(url, headers) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'tuya-zigbee-leads-scan', ...headers } }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { body += c; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.setTimeout(30000, () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}

/** GitHub REST GET with budget + stop rules. Returns parsed JSON or null (stop / not found). */
async function gh(apiPath) {
  if (stopped) {return null;}
  if (requests >= MAX_REQ) { stopped = `budget ${MAX_REQ} reached`; return null; }
  requests++;
  await jitter();
  if (TOKEN) {
    const r = await httpGet(`https://api.github.com/${apiPath}`, {
      Accept: 'application/vnd.github+json', Authorization: `Bearer ${TOKEN}`, 'X-GitHub-Api-Version': '2022-11-28',
    });
    if (r.status === 403 || r.status === 429) { stopped = `HTTP ${r.status} on ${apiPath}`; return null; }
    const remaining = Number(r.headers['x-ratelimit-remaining']);
    if (Number.isFinite(remaining) && remaining < 50) {stopped = `quota low (${remaining})`;}
    if (r.status === 404 || r.status === 409 || r.status === 422) {return null;}
    if (r.status >= 400) { stopped = `HTTP ${r.status} on ${apiPath}`; return null; }
    return JSON.parse(r.body);
  }
  try {
    const out = execFileSync('gh', ['api', '-H', 'Accept: application/vnd.github+json', apiPath], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
    return JSON.parse(out);
  } catch (e) {
    const msg = String(e.stderr || e.message);
    if (/HTTP (403|429)|rate limit|abuse/i.test(msg)) { stopped = `HTTP 403/429 on ${apiPath}`; return null; }
    if (/HTTP (404|409|422)/.test(msg)) {return null;}
    stopped = `error on ${apiPath}: ${msg.slice(0, 120)}`;
    return null;
  }
}

async function raw(repo, ref, file) {
  if (stopped) {return null;}
  await sleep(300 + Math.floor(Math.random() * 700));
  const r = await httpGet(`https://raw.githubusercontent.com/${repo}/${ref}/${file}`, {});
  if (r.status === 403 || r.status === 429) { stopped = `raw HTTP ${r.status}`; return null; }
  return r.status === 200 ? r.body : null;
}

// ---------- extraction ----------
const MFR_RE = /\b_T[A-Z0-9]{2,5}_[a-zA-Z0-9]{8}\b/g;
const PID_RE = /\b(TS[0-9]{3,4}[A-Z]?|ZG-[0-9]{3}[A-Z0-9-]*)\b/g;
const DP_RE = /\bDP\s?#?(\d{1,3})\b/gi;
const FW_RE = /\b(firmware|inverted|invert|leaves? the network|drops? off|keep-?alive|workaround|wrong (scale|unit)|divide[ds]? by|x10|×10|bug)\b/gi;

function buildIndex() {
  const idx = new Map();
  const dir = path.join(ROOT, 'drivers');
  for (const d of fs.readdirSync(dir)) {
    const f = path.join(dir, d, 'driver.compose.json');
    if (!fs.existsSync(f)) {continue;}
    try {
      const j = JSON.parse(fs.readFileSync(f, 'utf8'));
      for (const m of (j.zigbee && j.zigbee.manufacturerName) || []) {
        const k = String(m).toLowerCase();
        if (!idx.has(k)) {idx.set(k, []);}
        idx.get(k).push(d);
      }
    } catch { /* skip broken compose */ }
  }
  return idx;
}

function extract(text, url, idx, out) {
  if (!text) {return 0;}
  let n = 0;
  for (const para of String(text).split(/\n\s*\n|\r\n\s*\r\n/)) {
    const mfrs = [...new Set(para.match(MFR_RE) || [])];
    if (!mfrs.length) {continue;}
    const pids = [...new Set((para.match(PID_RE) || []).map((p) => p.toUpperCase()))];
    const dps = [...new Set([...para.matchAll(DP_RE)].map((m) => Number(m[1])))].slice(0, 20);
    const fw = [...new Set((para.match(FW_RE) || []).map((s) => s.toLowerCase()))];
    for (const mfr of mfrs.slice(0, 40)) {
      if (/x{6,}|_TZ[0-9A-Z]+_[0-9]{8}$/i.test(mfr)) {continue;} // placeholders / bogus ids
      const key = `${mfr.toLowerCase()}|${url}`;
      if (out.byKey.has(key)) {continue;}
      const known = idx.get(mfr.toLowerCase()) || [];
      const i = para.indexOf(mfr);
      out.byKey.set(key, {
        mfr, pids: mfrs.length <= 3 ? pids : [], dps: mfrs.length === 1 ? dps : [], firmware: mfrs.length === 1 ? fw : [],
        knownDrivers: [...new Set(known)].slice(0, 6), url,
        snippet: para.slice(Math.max(0, i - 80), i + 140).replace(/\s+/g, ' ').trim(),
        seen: new Date().toISOString().slice(0, 10),
      });
      n++;
    }
  }
  return n;
}

// ---------- phases ----------
async function pagedPhase(state, repos, listPath, textOf) {
  const runStart = new Date().toISOString();
  for (const repo of repos) {
    const st = state[repo] || (state[repo] = { page: 1, done: false });
    // History fully read once → later runs only fetch what changed since the previous pass.
    if (st.done && !st.sinceMode) { st.sinceMode = true; st.since = st.doneAt || runStart; st.page = 1; st.done = false; }
    if (st.sinceMode && st.done) { st.page = 1; st.done = false; }
    while (!st.done && !stopped) {
      const url = listPath(repo, st.page) + (st.sinceMode && st.since ? `&since=${encodeURIComponent(st.since)}` : '');
      const items = await gh(url);
      if (items === null) {break;}
      if (!Array.isArray(items) || items.length === 0) {
        st.done = true;
        st.doneAt = runStart;
        if (st.sinceMode) {st.since = runStart;}
        break;
      }
      for (const it of items) {textOf(it);}
      st.page++;
      st.last = items[items.length - 1].created_at || items[items.length - 1].updated_at;
    }
  }
}

async function phaseForks(scan, idx, out) {
  for (const rootRepo of scan.forkRoots) {
    const st = scan.forks[rootRepo] || (scan.forks[rootRepo] = { page: 1, done: false, seen: {} });
    // Full pass finished → restart the fork list; unchanged forks (same pushed_at) cost no extra call.
    if (st.done) { st.page = 1; st.done = false; }
    const meta = st.base ? null : await gh(`repos/${rootRepo}`);
    if (meta) {st.base = meta.default_branch;}
    if (!st.base) {return;}
    while (!st.done && !stopped) {
      const forks = await gh(`repos/${rootRepo}/forks?sort=oldest&per_page=100&page=${st.page}`);
      if (forks === null) {return;}
      if (!forks.length) { st.done = true; break; }
      for (const f of forks) {
        if (stopped) {return;}
        const pushedAfterFork = new Date(f.pushed_at) - new Date(f.created_at) > 60 * 1000;
        if (!pushedAfterFork) { st.seen[f.full_name] = 'never-pushed'; continue; }
        if (st.seen[f.full_name] === f.pushed_at) {continue;}
        const branches = await gh(`repos/${f.full_name}/branches?per_page=100`);
        if (branches === null) { if (stopped) {return;} st.seen[f.full_name] = f.pushed_at; continue; }
        let complete = true;
        for (const b of branches) {
          const cmp = await gh(`repos/${rootRepo}/compare/${encodeURIComponent(st.base)}...${f.owner.login}:${encodeURIComponent(b.name)}`);
          if (cmp === null) { if (stopped) { complete = false; break; } continue; }
          if (!cmp.ahead_by) {continue;}
          for (const file of cmp.files || []) {
            if (!/driver\.compose\.json$|\.js$|quirk|README|\.md$/i.test(file.filename) || !file.patch) {continue;}
            const added = file.patch.split('\n').filter((l) => l.startsWith('+')).map((l) => l.slice(1)).join('\n');
            extract(added, `https://github.com/${f.full_name}/blob/${encodeURIComponent(b.name)}/${file.filename}`, idx, out);
          }
        }
        if (!complete) {return;}
        st.seen[f.full_name] = f.pushed_at;
      }
      st.page++;
    }
  }
}

async function phasePeerDrivers(scan, idx, out) {
  for (const repo of scan.peers) {
    const st = scan.peerDrivers[repo] || (scan.peerDrivers[repo] = {});
    const meta = await gh(`repos/${repo}`);
    if (!meta) { if (stopped) {return;} continue; }
    if (st.pushed_at === meta.pushed_at) {continue;}
    const tree = await gh(`repos/${repo}/git/trees/${encodeURIComponent(meta.default_branch)}?recursive=1`);
    if (!tree) { if (stopped) {return;} continue; }
    const files = (tree.tree || []).filter((t) => /driver\.compose\.json$|drivers\/[^/]+\/driver\.json$/.test(t.path)).slice(0, 400);
    for (const t of files) {
      const body = await raw(repo, meta.default_branch, t.path);
      if (stopped) {return;}
      if (!body) {continue;}
      try {
        const j = JSON.parse(body);
        const z = j.zigbee || {};
        const mfrs = [].concat(z.manufacturerName || []);
        const pids = [].concat(z.productId || []);
        const text = `${mfrs.join(' ')}\n${pids.join(' ')}`;
        extract(text.replace(/\n/g, ' '), `https://github.com/${repo}/blob/${meta.default_branch}/${t.path}`, idx, out);
      } catch { /* not JSON */ }
    }
    st.pushed_at = meta.pushed_at;
  }
}

async function main() {
  const cursor = fs.existsSync(CURSOR_FILE) ? JSON.parse(fs.readFileSync(CURSOR_FILE, 'utf8')) : {};
  const scan = { ...DEFAULT_SCAN, ...cursor.scan || {} };
  for (const k of ['comments', 'issues', 'peerIssues', 'peerComments', 'peerDrivers', 'forks']) {scan[k] = scan[k] || {};}
  const prev = fs.existsSync(LEADS_FILE) ? JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8')) : { leads: [] };
  const out = { byKey: new Map(prev.leads.map((l) => [`${l.mfr.toLowerCase()}|${l.url}`, l])) };
  const before = out.byKey.size;
  const idx = buildIndex();

  const issueText = (it) => extract(`${it.title || ''}\n\n${it.body || ''}`, it.html_url, idx, out);
  const commentText = (c) => extract(c.body, c.html_url, idx, out);

  try {
  for (const phase of PHASES) {
    if (stopped) {break;}
    if (phase === 'comments') {
      await pagedPhase(scan.comments, scan.tracked, (r, p) => `repos/${r}/issues/comments?sort=created&direction=desc&per_page=100&page=${p}`, commentText);
    } else if (phase === 'issues') {
      await pagedPhase(scan.issues, scan.tracked, (r, p) => `repos/${r}/issues?state=all&sort=updated&direction=desc&per_page=100&page=${p}`, issueText);
    } else if (phase === 'peers') {
      await pagedPhase(scan.peerIssues, scan.peers, (r, p) => `repos/${r}/issues?state=all&sort=updated&direction=desc&per_page=100&page=${p}`, issueText);
      await pagedPhase(scan.peerComments, scan.peers, (r, p) => `repos/${r}/issues/comments?sort=created&direction=desc&per_page=100&page=${p}`, commentText);
    } else if (phase === 'peerDrivers') {
      await phasePeerDrivers(scan, idx, out);
    } else if (phase === 'forks') {
      await phaseForks(scan, idx, out);
    }
  }
  } catch (e) {
    stopped = `error: ${e.message}`;
    console.error(e.stack);
  }

  const all = [...out.byKey.values()];
  for (const l of all) {l.knownDrivers = [...new Set(idx.get(l.mfr.toLowerCase()) || [])].slice(0, 6);}
  // Keep the committed file small: only mfrs not in any driver yet, or texts with firmware/bug keywords.
  // Cursors guarantee the same pages are not re-read, so known couples need no dedup history.
  const leads = all.filter((l) => !/x{6,}/i.test(l.mfr) && (!l.knownDrivers.length || (l.firmware && l.firmware.length)));
  const fresh = leads.filter((l) => !l.knownDrivers.length);
  scan.lastRun = { at: new Date().toISOString(), requests, stopped: stopped || 'completed phases', mentionsSeen: out.byKey.size - before, kept: leads.length, unknownMfrs: new Set(fresh.map((l) => l.mfr.toLowerCase())).size };
  cursor.scan = scan;
  cursor.updated = new Date().toISOString().slice(0, 10);
  console.log(JSON.stringify(scan.lastRun));
  if (DRY) {return;}
  fs.mkdirSync(path.dirname(LEADS_FILE), { recursive: true });
  leads.sort((a, b) => (a.knownDrivers.length - b.knownDrivers.length) || a.mfr.localeCompare(b.mfr));
  fs.writeFileSync(LEADS_FILE, `${JSON.stringify({ generated: cursor.updated, note: 'read-only scan output; knownDrivers=[] means the mfr is not in any driver yet (review before applying)', leads }, null, 1)}\n`);
  fs.writeFileSync(CURSOR_FILE, `${JSON.stringify(cursor, null, 2)}\n`);
}

main().catch((e) => { console.error(`leads-scan failed: ${e.stack}`); process.exit(0); });
