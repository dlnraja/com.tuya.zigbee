#!/usr/bin/env node
'use strict';
/**
 * Source registry runner (W10 free ingestion). Reads data/sources/registry.json, checks each due
 * source for changes since its cursor in data/sources/state.json, and turns ONLY the changes into
 * proposals (mfr+pid couples, DP ids, quirk/bug signals) in data/leads/source-proposals.json.
 * Free: GitHub REST (token optional), Discourse JSON, page hashes. No AI here (optional layers may
 * read the proposals later, capped). Proposals hold extracted identifiers + a short summary in our
 * own words + link + credit; never copied code.
 *
 * Usage: node .github/scripts/source-registry.js [--dry] [--force] [--only id1,id2] [--max-calls N]
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..', '..');
const REG_F = path.join(ROOT, 'data', 'sources', 'registry.json');
const STATE_F = path.join(ROOT, 'data', 'sources', 'state.json');
const OUT_F = path.join(ROOT, 'data', 'leads', 'source-proposals.json');
const GH = 'https://api.github.com';
const CADENCE_MS = Object.freeze({ daily: 20 * 3600e3, weekly: 6.5 * 86400e3, monthly: 28 * 86400e3 });
const MAX_PROPOSALS = 5000; // R21: bounded output file
const MAX_PATCH_CHARS = 400000;

const MFR_RE = /\b_T[ZY][A-Z0-9]{1,4}_[a-z0-9]{8}\b/gi;
const PID_RE = /\bTS[0-9]{3,4}[A-Z]?\b/g;
const DP_RE = /\b(?:dp|dpId|datapoint)\s*[:=(]?\s*(\d{1,3})\b/gi;
const BUG_RE = /\b(bug|broken|wrong|invert(?:ed)?|reverse[d]?|not working|regression|fix(?:es|ed)?)\b/i;
const IDEA_RE = /\b(zigbee|tuya|aqara|xiaomi|sonoff|hue|philips|ikea|moes|lexman|legrand|matter|thread|local|energy|ir\b|infrared|flow|timer|child lock|sub-?device|per channel|availability|power cut|reliab)/i;
const QUIRK_RE = /\b(quirk|workaround|magic packet|binding|configure reporting|tuya_magic|no response|leave)\b/i;

function readJson(f, dflt) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return dflt; } }
function writeJson(f, v) { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, `${JSON.stringify(v, null, 2)}\n`); }
const uniq = (a) => [...new Set(a)];

function extract(text) {
  const t = String(text || '');
  const dps = [];
  for (const m of t.matchAll(DP_RE)) { const n = Number(m[1]); if (n > 0 && n < 256) {dps.push(n);} }
  return {
    mfrs: uniq((t.match(MFR_RE) || []).map((s) => s)).slice(0, 200),
    pids: uniq(t.match(PID_RE) || []).slice(0, 50),
    dps: uniq(dps).slice(0, 60),
    bug: BUG_RE.test(t),
    quirk: QUIRK_RE.test(t),
  };
}

function isDue(src, st, now, force) {
  if (force) {return true;}
  const last = st && st.checkedAt ? Date.parse(st.checkedAt) : 0;
  return now - last >= (CADENCE_MS[src.cadence] || CADENCE_MS.weekly);
}

function makeClient({ token, maxCalls, fetchImpl }) {
  let calls = 0;
  const f = fetchImpl || globalThis.fetch;
  return {
    get calls() { return calls; },
    async json(url, headers = {}) {
      if (calls >= maxCalls) {throw new Error('call budget exhausted');}
      calls++;
      const h = { 'User-Agent': 'tuya-source-registry', Accept: 'application/vnd.github+json', ...headers };
      if (token && url.startsWith(GH)) {h.Authorization = `Bearer ${token}`;}
      const r = await f(url, { headers: h });
      if (!r.ok) {throw new Error(`HTTP ${r.status} ${url}`);}
      return r.json();
    },
    async text(url) {
      if (calls >= maxCalls) {throw new Error('call budget exhausted');}
      calls++;
      const r = await f(url, { headers: { 'User-Agent': 'tuya-source-registry' } });
      if (!r.ok) {throw new Error(`HTTP ${r.status} ${url}`);}
      return r.text();
    },
  };
}

function proposal(src, ref, summary, text) {
  const x = extract(text);
  if (!x.mfrs.length && !x.dps.length && !x.bug && !x.quirk) {return null;}
  return { source: src.id, kind: src.kind, ref, summary, ...x, credit: src.credit, seenAt: new Date().toISOString() };
}

async function scanGithub(src, st, c) {
  const out = [];
  const paths = src.paths && src.paths.length ? src.paths : [''];
  const shas = {};
  for (const p of paths) {
    const q = `${GH}/repos/${src.repo}/commits?sha=${encodeURIComponent(src.branch)}&per_page=1${p ? `&path=${encodeURIComponent(p)}` : ''}`;
    const list = await c.json(q);
    if (Array.isArray(list) && list[0]) {shas[p] = list[0].sha;}
  }
  const head = Object.values(shas)[0];
  const prev = st.lastSha;
  if (head && prev && head !== prev) {
    const cmp = await c.json(`${GH}/repos/${src.repo}/compare/${prev}...${head}`);
    let budget = MAX_PATCH_CHARS;
    for (const f of (cmp.files || [])) {
      if (src.paths.length && !src.paths.some((p) => f.filename.startsWith(p))) {continue;}
      const added = String(f.patch || '').split('\n').filter((l) => l.startsWith('+')).join('\n');
      budget -= added.length;
      if (budget < 0) {break;}
      const pr = proposal(src, `https://github.com/${src.repo}/blob/${head}/${f.filename}`,
        `${f.status} ${f.filename} (+${f.additions}/-${f.deletions}) between ${prev.slice(0, 7)}..${head.slice(0, 7)}`, added);
      if (pr) {out.push(pr);}
    }
  }
  let issuesSince = st.issuesSince;
  if (src.issues) {
    const since = issuesSince || new Date(Date.now() - 7 * 86400e3).toISOString();
    const items = await c.json(`${GH}/repos/${src.repo}/issues?state=all&sort=updated&direction=asc&per_page=50&since=${encodeURIComponent(since)}`);
    for (const it of Array.isArray(items) ? items : []) {
      const txt = `${it.title}\n${it.body || ''}`;
      if (!/tuya|_TZ|TS0|TS1|_TYZB|_TYST/i.test(txt)) {continue;}
      const pr = proposal(src, it.html_url, `${it.pull_request ? 'PR' : 'issue'} #${it.number} (${it.state}) by ${it.user && it.user.login}: ${String(it.title).slice(0, 140)}`, txt);
      if (pr) {out.push(pr);}
    }
    if (Array.isArray(items) && items.length) {issuesSince = items[items.length - 1].updated_at;}
  }
  return { out, next: { lastSha: head || prev || null, issuesSince } };
}

async function scanForks(src, st, c) {
  const forks = await c.json(`${GH}/repos/${src.repo}/forks?sort=newest&per_page=100`);
  const since = st.pushedSince ? Date.parse(st.pushedSince) : 0;
  const baseline = !st.pushedSince; // first run only sets the cursor
  const out = [];
  let max = since;
  for (const f of Array.isArray(forks) ? forks : []) {
    const t = Date.parse(f.pushed_at || 0);
    if (t > since && !baseline) { out.push({ source: src.id, kind: 'forks', ref: f.html_url, summary: `fork ${f.full_name} pushed ${f.pushed_at}`, mfrs: [], pids: [], dps: [], bug: false, quirk: false, credit: f.owner && f.owner.login, seenAt: new Date().toISOString() }); }
    if (t > max) {max = t;}
  }
  return { out, next: { pushedSince: max ? new Date(max).toISOString() : null } };
}

async function scanDiscourse(src, st, c) {
  // Incremental per-topic cursor (last post_number seen). Discourse posts.json takes post IDS (not numbers),
  // so map the topic stream (ids, in post order) and take at most `batch` new posts per run; the cursor only
  // advances to the last post actually read, so nothing is skipped when a thread is busy.
  const out = [];
  const lastPost = { ...(st.lastPost || {}) };
  const batch = Math.max(1, Math.min(100, Number(src.batch) || 20));
  for (const id of src.topics || []) {
    const t = await c.json(`${src.url}/t/${id}.json`);
    const hi = t.highest_post_number || 0;
    const from = lastPost[id] || Math.max(0, hi - batch);
    if (hi <= from) {continue;}
    const ids = (t.post_stream && t.post_stream.stream) || [];
    // stream index ~ post_number - 1 (deleted posts shift it a little): start a bit early and filter by number.
    const start = Math.max(0, Math.min(ids.length, from) - 5);
    const want = ids.slice(start, start + batch + 5);
    if (!want.length) {lastPost[id] = hi; continue;}
    const posts = await c.json(`${src.url}/t/${id}/posts.json?${want.map((n) => `post_ids[]=${n}`).join('&')}`).catch(() => null);
    const stream = ((posts && posts.post_stream && posts.post_stream.posts) || []).filter((p) => p.post_number > from)
      .sort((x, y) => x.post_number - y.post_number).slice(0, batch);
    let last = from;
    for (const p of stream) {
      last = Math.max(last, p.post_number);
      const pr = proposal(src, `${src.url}/t/${id}/${p.post_number}`, `post #${p.post_number} by ${p.username}`, String(p.cooked || '').replace(/<[^>]+>/g, ' '));
      if (pr) {out.push(pr);}
    }
    lastPost[id] = stream.length ? last : hi;
  }
  return { out, next: { lastPost } };
}

async function scanDiscourseCategory(src, st, c) {
  // New topics in a Discourse category (e.g. Homey "Apps" c/apps/7). Cursor = highest topic id seen;
  // first run only sets the cursor. Read-only: never posts. Emits idea leads for relevant titles/excerpts.
  const out = [];
  const pages = Math.max(1, Math.min(3, Number(src.pages) || 1));
  const since = Number(st.maxTopicId) || 0;
  const baseline = !since;
  const kw = new RegExp(src.match || IDEA_RE.source, 'i');
  let max = since;
  const seen = new Set();
  const listed = new Map();
  for (let p = 0; p < pages; p++) {
    const listPath = src.tag ? `tag/${src.tag}` : `c/${src.category}`;
    const j = await c.json(`${src.url}/${listPath}.json?page=${p}`);
    const topics = ((j && j.topic_list && j.topic_list.topics) || []).slice().sort((a, b) => a.id - b.id);
    for (const t of topics) {
      if (seen.has(t.id)) {continue;}
      seen.add(t.id);
      listed.set(t.id, t);
      if (t.id > max) {max = t.id;}
      if (baseline || t.id <= since || t.pinned) {continue;}
      const txt = `${t.title || ''} ${t.excerpt || ''}`;
      if (!kw.test(txt)) {continue;}
      out.push({ source: src.id, kind: 'forum-app', ref: `${src.url}/t/${t.id}`, summary: `new app topic #${t.id}: ${String(t.title).slice(0, 140)} (review for ideas; credit author)`, ...extract(txt), credit: src.credit, seenAt: new Date().toISOString() });
    }
  }
  // Follow new posts in recently active list topics (bounded, per-topic cursor = last post_number).
  const tracked = { ...(st.tracked || {}) };
  const maxTrack = Math.max(0, Math.min(40, Number(src.trackTopics) || 0));
  if (maxTrack) {
    const recent = [...listed.values()].filter((t) => !t.pinned).sort((a, b) => Date.parse(b.last_posted_at || 0) - Date.parse(a.last_posted_at || 0)).slice(0, maxTrack);
    const due = recent.filter((t) => tracked[t.id] !== undefined && (t.highest_post_number || 0) > tracked[t.id]);
    for (const t of recent) { if (tracked[t.id] === undefined) { tracked[t.id] = t.highest_post_number || 0; } }
    if (due.length && !baseline) {
      const r = await scanDiscourse({ ...src, topics: due.map((t) => t.id), batch: src.batch || 10 }, { lastPost: tracked }, c);
      out.push(...r.out);
      Object.assign(tracked, r.next.lastPost);
    }
    const keep = new Set(recent.map((t) => String(t.id)));
    for (const k of Object.keys(tracked)) { if (!keep.has(String(k))) { delete tracked[k]; } }
  }
  return { out, next: { maxTopicId: max || null, tracked } };
}

async function scanPage(src, st, c) {
  const body = await c.text(src.url);
  const hash = crypto.createHash('sha256').update(body.replace(/\s+/g, ' ')).digest('hex');
  const out = [];
  if (st.hash && st.hash !== hash) {
    out.push({ source: src.id, kind: src.kind, ref: src.url, summary: 'page changed since last check (review manually)', mfrs: [], pids: [], dps: [], bug: false, quirk: false, credit: src.credit, seenAt: new Date().toISOString() });
  }
  return { out, next: { hash } };
}

const NEWS_RELEVANT_RE = /\b(sdk|firmware|zigbee|matter|thread|z-wave|homekit|alexa|google|smartthings|chatgpt|mcp|ai agent|deprecat|retire|remov|developer|app store|device updates?|ota|flow card|capabilit|energy|self-hosted|homey pro v\d)/i;

async function scanNewsIndex(src, st, c) {
  const html = await c.text(src.url);
  const base = new URL(src.url);
  const slugs = uniq((html.match(/\/news\/[a-z0-9-]{6,}\//g) || []));
  const seen = new Set(st.seen || []);
  const baseline = !st.seen;
  const out = [];
  for (const sl of slugs) {
    if (seen.has(sl)) {continue;}
    seen.add(sl);
    if (baseline || out.length >= 10) {continue;}
    const url = `${base.origin}${base.pathname.replace(/\/news\/?$/, '')}${sl}`;
    const art = await c.text(url).catch(() => '');
    const date = (art.match(/"datePublished":"([^"]+)"/) || [])[1] || null;
    const title = ((art.match(/<title>([^<]+)<\/title>/) || [])[1] || sl).replace(/\s+/g, ' ').split(' – ')[0].trim();
    const body = art.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ');
    if (!NEWS_RELEVANT_RE.test(`${title} ${body}`)) {continue;}
    out.push({ source: src.id, kind: 'news', ref: url, summary: `${date ? date.slice(0, 10) : '?'} ${title} (relevant to apps/drivers: review and queue)`, mfrs: [], pids: [], dps: [], bug: false, quirk: false, credit: src.credit, seenAt: new Date().toISOString() });
  }
  return { out, next: { seen: [...seen].slice(-2000) } };
}

const SCANNERS = { 'news-index': scanNewsIndex, github: scanGithub, 'github-forks': scanForks, discourse: scanDiscourse, 'discourse-category': scanDiscourseCategory, page: scanPage };

async function run({ dry = false, force = false, only = null, maxCalls = 400, token = process.env.GH_PAT || process.env.GITHUB_TOKEN, fetchImpl } = {}) {
  const reg = readJson(REG_F, { sources: [] });
  const state = readJson(STATE_F, { sources: {} });
  state.sources = state.sources || {};
  const c = makeClient({ token, maxCalls, fetchImpl });
  const now = Date.now();
  const proposals = [];
  const summary = [];
  for (const src of reg.sources) {
    if (only && !only.includes(src.id)) {continue;}
    const st = state.sources[src.id] || {};
    if (!isDue(src, st, now, force)) { summary.push(`${src.id}: not due`); continue; }
    const fn = SCANNERS[src.type];
    if (!fn) { summary.push(`${src.id}: unknown type ${src.type}`); continue; }
    try {
      const { out, next } = await fn(src, st, c);
      proposals.push(...out);
      state.sources[src.id] = { ...st, ...next, checkedAt: new Date().toISOString(), lastError: null };
      summary.push(`${src.id}: ${out.length} proposal(s)${st.checkedAt ? '' : ' (baseline cursor set)'}`);
    } catch (e) {
      state.sources[src.id] = { ...st, lastError: String(e.message || e).slice(0, 200), erroredAt: new Date().toISOString() };
      summary.push(`${src.id}: error ${e.message}`);
      if (/budget/.test(e.message)) {break;}
    }
  }
  if (!dry) {
    const prev = readJson(OUT_F, { proposals: [] });
    const all = (prev.proposals || []).concat(proposals);
    const seen = new Set();
    const dedup = all.filter((p) => { const k = `${p.source}|${p.ref}`; if (seen.has(k)) {return false;} seen.add(k); return true; });
    writeJson(OUT_F, { $comment: 'Change-driven proposals from data/sources/registry.json. Identifiers + our own one-line summaries; review before landing (W4 couples, research first).', updated: new Date().toISOString(), proposals: dedup.slice(-MAX_PROPOSALS) });
    writeJson(STATE_F, state);
  }
  return { calls: c.calls, proposals, summary };
}

module.exports = { extract, isDue, run, CADENCE_MS };

if (require.main === module) {
  const a = process.argv.slice(2);
  const oi = a.indexOf('--only');
  const mi = a.indexOf('--max-calls');
  run({ dry: a.includes('--dry'), force: a.includes('--force'), only: oi >= 0 ? a[oi + 1].split(',') : null, maxCalls: mi >= 0 ? Number(a[mi + 1]) : 400 })
    .then((r) => { for (const s of r.summary) {console.log(`[sources] ${s}`);} console.log(`[sources] calls=${r.calls} new proposals=${r.proposals.length}`); })
    .catch((e) => { console.error(e); process.exit(1); });
}
