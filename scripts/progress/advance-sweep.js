#!/usr/bin/env node
'use strict';
/**
 * Advance the full-history sweep checkpoint by one small free chunk.
 * No AI. Uses ledger + optional GitHub API (GITHUB_TOKEN). Never invents mfr/pid.
 *
 *   node scripts/progress/advance-sweep.js [--chunk=5] [--dry]
 *
 * Checkpoint: data/leads/sweep-checkpoint.json
 * Deep-read cursor: data/leads/deep-read-checkpoint.json
 * Ledger: data/progress/ledger.json (via scripts/lib/ledger.js)
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.join(__dirname, '../..');
const CP = path.join(ROOT, 'data/leads/sweep-checkpoint.json');
const DEEP = path.join(ROOT, 'data/leads/deep-read-checkpoint.json');
const arg = (k, d) => {
  const a = process.argv.find((x) => x.startsWith(`--${k}=`));
  return a ? a.slice(k.length + 3) : d;
};
const DRY = process.argv.includes('--dry');
const CHUNK = Math.max(0, Math.min(60, Number(arg('chunk', '5')) || 0));
// P2810: forum topics are swept from post 1 as well (public Discourse JSON, no AI).
const FORUM_CHUNK = Math.max(0, Math.min(400, Number(arg('forum-chunk', '40')) || 0));
const ONLY = arg('only', 'all'); // all | johan | forum
const TOPICS = String(arg('topics', '140352,26439,146735,154077,21313,89271')).split(',').filter(Boolean);
const sweepId = require('./lib/sweep-identity');
const sweepForum = require('./lib/sweep-forum');

function loadJson(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fallback; }
}
function saveJson(p, obj) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, `${JSON.stringify(obj, null, 2)}\n`);
}

function ghGet(url) {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'GET',
      headers: {
        'User-Agent': 'dlnraja-sweep',
        Accept: 'application/vnd.github+json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }, (res) => {
      let b = '';
      res.on('data', (c) => { b += c; });
      res.on('end', () => {
        if (res.statusCode === 403 || res.statusCode === 429) {
          resolve({ rateLimited: true, status: res.statusCode });
          return;
        }
        if (res.statusCode >= 400) {
          resolve({ error: true, status: res.statusCode, body: b.slice(0, 200) });
          return;
        }
        try { resolve(JSON.parse(b)); } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.setTimeout(20000, () => { req.destroy(new Error('timeout')); });
    req.end();
  });
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function ensureCheckpoint(seedItems) {
  let cp = loadJson(CP, null);
  if (!cp || typeof cp !== 'object') {
    cp = {
      updated: new Date().toISOString(),
      threads: {
        '140352': { lastPost: 0, status: 'pending' },
        '26439': { lastPost: 0, status: 'pending' },
        '146735': { lastPost: 0, status: 'pending' },
        '154077': { lastPost: 0, status: 'pending' },
        '21313': { lastPost: 0, status: 'pending' },
        '89271': { lastPost: 0, status: 'pending' },
      },
      items: [],
      github: { johan: { next: 1 }, dlnraja: { next: 1 } },
    };
  }
  cp.threads = cp.threads || {};
  for (const id of ['140352', '26439', '146735', '154077', '21313', '89271']) {
    if (!cp.threads[id]) cp.threads[id] = { lastPost: 0, status: 'pending' };
  }
  cp.items = Array.isArray(cp.items) ? cp.items : [];
  cp.github = cp.github || { johan: { next: 1 }, dlnraja: { next: 1 } };
  cp.github.johan = cp.github.johan || { next: 1 };
  cp.github.dlnraja = cp.github.dlnraja || { next: 1 };

  const byId = new Map(cp.items.map((it) => [it.id, it]));
  for (const it of seedItems) {
    if (!byId.has(it.id)) {
      cp.items.push(it);
      byId.set(it.id, it);
    } else {
      const cur = byId.get(it.id);
      if (cur.status === 'pending' && it.status === 'already-fixed') {
        Object.assign(cur, it);
      }
      for (const s of it.sources || []) {
        if (!Array.isArray(cur.sources)) cur.sources = [];
        if (!cur.sources.includes(s)) cur.sources.push(s);
      }
    }
  }
  return cp;
}

function buildDriverIndex() {
  const set = new Set();
  const driversRoot = path.join(ROOT, 'drivers');
  const walk = (dir) => {
    let ents;
    try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const ent of ents) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(full);
      else if (ent.name === 'driver.compose.json') {
        const txt = fs.readFileSync(full, 'utf8');
        const mfrs = txt.match(/_T[A-Z0-9]{2,5}_[a-zA-Z0-9]{8}|TUYATEC-[A-Za-z0-9]{8}|_TYZB01_[a-z0-9]{8}/g) || [];
        const pids = txt.match(/TS[0-9A-F]{3,4}[A-Z]?/g) || [];
        for (const mf of mfrs) for (const pd of pids) set.add(`${mf.toLowerCase()}|${pd.toLowerCase()}`);
      }
    }
  };
  walk(driversRoot);
  return set;
}

/**
 * P2810 classifier: title + body + every comment (open and closed threads), shared
 * case-insensitive identity helper, per-couple coverage. Falls back to the legacy
 * body-only classifier when comments are unavailable.
 */
function classifyIssueFull(n, issue, comments) {
  const id = `johan-issue:${n}`;
  const isPr = !!(issue && issue.pull_request);
  const link = `https://github.com/JohanBendz/com.tuya.zigbee/${isPr ? 'pull' : 'issues'}/${n}`;
  if (!issue || issue.error || issue.rateLimited) {
    return { id, status: issue && issue.rateLimited ? 'api-rate-limited' : 'needs-info', note: 'api unavailable; retry next run', sources: [link] };
  }
  if (issue.status === 404 || (issue.error && issue.status === 404)) {
    return { id, status: 'no-action', note: 'number not found upstream', sources: [link] };
  }
  const texts = [issue.title, issue.body, ...(Array.isArray(comments) ? comments.map((c) => c.body) : [])].join('\n');
  const ids = sweepId.extract(texts);
  const merged = isPr && issue.pull_request && issue.pull_request.merged_at;
  const c = sweepId.classify(ids, { closedPr: isPr && issue.state === 'closed' });
  const kind = isPr ? (merged ? 'merged PR' : `${issue.state} PR`) : `${issue.state} issue`;
  const missing = c.cov.missing.map((x) => `${x.mfr}|${x.pid || '?'}`);
  const note = c.status === 'already-fixed'
    ? `${kind}; identities covered (${ids.mfrs.slice(0, 3).join(',') || ids.pids.slice(0, 3).join(',') || 'historical'})`
    : c.status === 'pending' ? `${kind}; missing couple(s) ${missing.slice(0, 4).join(',')}; needs code check`
      : c.status === 'needs-info' ? `${kind}; ${c.why}; research or diag needed` : `${kind}; ${c.why}`;
  const out = {
    id, status: c.status, note, sources: [link],
    author: issue.user && issue.user.login,
    closedAt: issue.closed_at || undefined,
    comments: Array.isArray(comments) ? comments.length : undefined,
    mfrs: ids.mfrs.length ? ids.mfrs : undefined,
    pids: ids.pids.length ? ids.pids : undefined,
    missing: missing.length ? missing : undefined,
  };
  return out;
}

/** Heuristic classify: no invented couples. */
function classifyIssue(n, issue) {
  const id = `johan-issue:${n}`;
  if (!issue || issue.error || issue.rateLimited) {
    return { id, status: 'needs-info', note: 'api unavailable or rate-limited', sources: [`https://github.com/JohanBendz/com.tuya.zigbee/issues/${n}`] };
  }
  const body = String(issue.body || '');
  const title = String(issue.title || '');
  const isPr = !!(issue.pull_request);
  const mfrs = body.match(/\b(_T[A-Z0-9]{2,5}_[a-zA-Z0-9]{8}|TUYATEC-[A-Za-z0-9]{8}|_TYZB01_[a-z0-9]{8})\b/g) || [];
  const pids = body.match(/\b(TS[0-9A-F]{3,4}[A-Z]?)\b/g) || [];
  const uniq = (a) => [...new Set(a)];
  const m = uniq(mfrs);
  const p = uniq(pids);

  if (isPr && issue.state === 'closed') {
    return {
      id,
      status: 'already-fixed',
      note: `historical merged/closed PR (${title.slice(0, 80)}); no open reliability work`,
      sources: [`https://github.com/JohanBendz/com.tuya.zigbee/pull/${n}`],
    };
  }
  if (m.length && p.length) {
    // Presence check via prebuilt index (classifyIssue._index), never invent couples.
    const idx = classifyIssue._index || (classifyIssue._index = buildDriverIndex());
    let hit = false;
    try {
      for (const mf of m) {
        for (const pd of p) {
          if (idx.has(`${mf.toLowerCase()}|${pd.toLowerCase()}`)) { hit = true; break; }
        }
        if (hit) break;
      }
    } catch { /* ignore */ }
    if (hit) {
      return {
        id,
        status: 'already-fixed',
        note: `couple(s) already present in drivers (${m.slice(0, 2).join(',')}/${p.slice(0, 2).join(',')})`,
        sources: [`https://github.com/JohanBendz/com.tuya.zigbee/issues/${n}`],
      };
    }
    return {
      id,
      status: 'pending',
      note: `identities seen (${m.slice(0, 3).join(',')}|${p.slice(0, 3).join(',')}); needs code check`,
      sources: [`https://github.com/JohanBendz/com.tuya.zigbee/issues/${n}`],
    };
  }
  if (p.length && !m.length) {
    return {
      id,
      status: 'already-fixed',
      note: `pid-only historical request (${p.slice(0, 3).join(',')}); covered by class drivers when mfr unknown`,
      sources: [`https://github.com/JohanBendz/com.tuya.zigbee/issues/${n}`],
    };
  }
  return {
    id,
    status: 'needs-info',
    note: 'no usable mfr+pid in thread body; defer until interview/diag',
    sources: [`https://github.com/JohanBendz/com.tuya.zigbee/issues/${n}`],
  };
}

async function main() {
  const seedItems = loadJson(path.join(ROOT, 'data/leads/sweep-seed-cache.json'), []);
  const cp = ensureCheckpoint(seedItems);

  // Sync forum lastPost from digest-state style if present locally (optional).
  const forumState = loadJson(path.join(ROOT, '.github/state/forum/digest-topics.json'), null);
  if (forumState && forumState.topics) {
    for (const [tid, st] of Object.entries(forumState.topics)) {
      if (cp.threads[tid] && typeof st.highest === 'number') {
        cp.threads[tid].lastPost = Math.max(cp.threads[tid].lastPost || 0, st.highest);
        if (cp.threads[tid].status === 'pending') cp.threads[tid].status = 'in-progress';
      }
    }
  }

  const deep = loadJson(DEEP, { next: { JohanBendz: 1, dlnraja: 1 }, done: { JohanBendz: [], dlnraja: [] } });
  let next = Math.max(Number(cp.github.johan.next) || 1, Number(deep.next && deep.next.JohanBendz) || 1);

  const ledger = require('../lib/ledger');
  const L = ledger.load();
  const advanced = [];
  let rateLimited = false;

  const johanChunk = ONLY === 'forum' ? 0 : CHUNK;
  for (let i = 0; i < johanChunk; i++) {
    const n = next + i;
    const key = `johan-issue:${n}`;
    const existing = L.items && L.items[key];
    let issue = null;
    if (!process.env.SWEEP_OFFLINE) {
      issue = await ghGet(`https://api.github.com/repos/JohanBendz/com.tuya.zigbee/issues/${n}`);
      if (issue && issue.rateLimited) { rateLimited = true; break; }
      await sleep(350);
    }
    let comments = null;
    if (issue && !issue.error && !issue.rateLimited && Number(issue.comments) > 0) {
      comments = await ghGet(`https://api.github.com/repos/JohanBendz/com.tuya.zigbee/issues/${n}/comments?per_page=100`);
      if (comments && comments.rateLimited) { rateLimited = true; break; }
      if (!Array.isArray(comments)) comments = null;
      await sleep(250);
    }
    if (issue && issue.error && issue.status === 404) issue = { status: 404 };
    const classified = issue && issue.status === 404
      ? { id: key, status: 'no-action', note: 'number not found upstream', sources: [`https://github.com/JohanBendz/com.tuya.zigbee/issues/${n}`] }
      : (issue && !issue.error ? classifyIssueFull(n, issue, comments) : classifyIssue(n, issue));
    // Never downgrade an item a human already resolved in the checkpoint.
    const prev = cp.items.find((it) => it.id === key);
    if (prev && prev.manual) { advanced.push({ n, status: prev.status, note: 'manual (kept)' }); continue; }
    // Prefer ledger done over reclassification.
    if (existing && existing.status === 'done') {
      classified.status = 'already-fixed';
      classified.note = existing.note || classified.note;
      if (existing.commit) {
        classified.sources = classified.sources || [];
        if (!classified.sources.includes(existing.commit)) classified.sources.push(existing.commit);
      }
    }

    const byId = new Map(cp.items.map((it) => [it.id, it]));
    if (byId.has(classified.id)) Object.assign(byId.get(classified.id), classified);
    else cp.items.push(classified);

    if (!DRY && classified.status === 'already-fixed') {
      const c = (classified.sources || []).find((s) => /^[0-9a-f]{7,40}$/.test(s));
      ledger.record(L, key, { status: 'done', commit: c || undefined, note: classified.note || 'sweep', by: 'advance-sweep' });
    } else if (!DRY && (classified.status === 'needs-info' || classified.status === 'pending')) {
      ledger.record(L, key, { status: 'deferred', note: classified.note || 'needs-info', by: 'advance-sweep' });
    }

    advanced.push({ n, status: classified.status, note: classified.note });
    if (!deep.done) deep.done = { JohanBendz: [], dlnraja: [] };
    if (!deep.done.JohanBendz.includes(n)) deep.done.JohanBendz.push(n);
  }

  if (!rateLimited) {
    cp.github.johan.next = next + advanced.length;
    deep.next = deep.next || {};
    deep.next.JohanBendz = cp.github.johan.next;
  }
  // Forum topics from post 1 (P2810).
  const forum = [];
  let forumRateLimited = false;
  if (ONLY !== 'johan' && FORUM_CHUNK > 0) {
    for (const tid of TOPICS) {
      const st = cp.threads[tid] || (cp.threads[tid] = { lastPost: 0, status: 'pending' });
      if (st.status === 'caught-up' && st.sweptTo >= (st.lastPost || 0)) { /* re-check tail below */ }
      const before = st.sweptTo || 0;
      const r = await sweepForum.advanceTopic(tid, st, FORUM_CHUNK);
      if (r.rateLimited) { forumRateLimited = true; st.retry = 'rate-limited'; }
      const byId = new Map(cp.items.map((it) => [it.id, it]));
      for (const it of r.items) {
        const prev = byId.get(it.id);
        if (prev && prev.manual) continue;
        if (prev) Object.assign(prev, it); else cp.items.push(it);
        if (!DRY) {
          if (it.status === 'already-fixed') ledger.record(L, it.id, { status: 'done', note: it.why, by: 'advance-sweep' });
          else if (it.status !== 'no-action') ledger.record(L, it.id, { status: 'deferred', note: it.why, by: 'advance-sweep' });
        }
      }
      forum.push({ tid, from: before + 1, to: st.sweptTo || 0, scanned: r.scanned, recorded: r.items.length, error: r.error, rateLimited: !!r.rateLimited });
      if (forumRateLimited) break;
    }
  }
  const progressed = advanced.length > 0 || forum.some((f) => f.scanned > 0);
  deep.updated = new Date().toISOString().slice(0, 10);
  cp.updated = new Date().toISOString();
  cp.lastChunk = { at: cp.updated, advanced: advanced.length, rateLimited, items: advanced, forum, forumRateLimited, progressed };
  cp.stats = cp.items.reduce((a, it) => { a[it.status] = (a[it.status] || 0) + 1; return a; }, {});

  if (!DRY) {
    ledger.save(L);
    saveJson(CP, cp);
    saveJson(DEEP, deep);
  }

  const summary = {
    dry: DRY,
    advanced: advanced.length,
    next: cp.github.johan.next,
    rateLimited,
    forum,
    forumRateLimited,
    progressed,
    stats: cp.stats,
    items: advanced,
  };
  console.log(JSON.stringify(summary, null, 2));
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### History sweep chunk\n\`\`\`json\n${JSON.stringify(summary, null, 2)}\n\`\`\`\n`);
  }
}

main().then(() => {
  // Progress guard: a run that only touches 'updated' is a silent stall (exit 2, soft in CI).
  try {
    const cp = loadJson(CP, {});
    if (!DRY && cp.lastChunk && !cp.lastChunk.progressed && !cp.lastChunk.rateLimited && !cp.lastChunk.forumRateLimited) {
      console.error('[advance-sweep] no progress this run');
      process.exitCode = 2;
    }
  } catch { /* ignore */ }
}).catch((e) => { console.error(e); process.exit(1); });
