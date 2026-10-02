#!/usr/bin/env node
'use strict';
/**
 * scripts/scanners/johan-canonical-index.js — upstream maintainer triage index (P2798).
 *
 * Parses the upstream maintainer's issue/PR comments (including closed + duplicate items and the
 * "Batch NN" consolidation comments) into a machine-readable index:
 *   data/leads/johan-canonical-index.json
 *     issues[n] = { n, title, state, state_reason, closed_at, canonical, sources[], identities[[mfr,pid]],
 *                   objectives[{ key, text }], regression, implemented[], batches[], lastComment }
 *
 *   node scripts/scanners/johan-canonical-index.js                    (GitHub API, GITHUB_TOKEN optional)
 *   node scripts/scanners/johan-canonical-index.js --comments=a.jsonl --items=b.jsonl   (offline)
 *   [--since=ISO] [--max-pages=20] [--out=data/leads/johan-canonical-index.json]
 *
 * Incremental: the cursor (`cursor.since`) is stored inside the output file. Read-only on GitHub,
 * no AI, Node built-ins only; polite (sequential requests, small delay).
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const REPO = arg('repo', 'JohanBendz/com.tuya.zigbee');
const AUTHOR = arg('author', 'JohanBendz');
const OUT = path.resolve(arg('out', path.join(__dirname, '../../data/leads/johan-canonical-index.json')));
const MAX_PAGES = Number(arg('max-pages', 20));

const MFR = /\b(_T[A-Z0-9]{2,5}_[a-zA-Z0-9]{8}|TUYATEC-[A-Za-z0-9]{8}|NTCHT0\d)\b/;
const PAIR_RE = /`?(_T[A-Z0-9]{2,5}_[a-zA-Z0-9]{8}|TUYATEC-[A-Za-z0-9]{8})`?\s*(?:\/|\+|,)\s*`?(TS[0-9A-F]{3,4}[A-Z]?|[A-Z][A-Za-z0-9._-]{2,30}(?:\(\d{4}\))?)`?/g;

function parseComment(body) {
  const b = String(body || '');
  const out = { batch: null, canonical: null, identities: [], objectives: [], regression: false, implemented: [], duplicateOnly: false };
  const bm = b.match(/Batch\s+(\d+[a-z]?)/i);
  if (bm) {out.batch = bm[1];}
  const cm = b.match(/canonical[^#\n]{0,60}#(\d{1,5})/i) || b.match(/consolidated (?:as duplicate )?(?:into|under)[^#\n]{0,80}#(\d{1,5})/i)
    || b.match(/tracked under[^#\n]{0,40}#(\d{1,5})/i);
  if (cm) {out.canonical = Number(cm[1]);}
  let m;
  const seen = new Set();
  PAIR_RE.lastIndex = 0;
  for (m = PAIR_RE.exec(b); m; m = PAIR_RE.exec(b)) {
    const k = `${m[1]}|${m[2]}`;
    if (!seen.has(k) && !/^(and|or|the|with)$/i.test(m[2])) { seen.add(k); out.identities.push([m[1], m[2]]); }
  }
  // Objectives: "**A. title:** text" / "A. text" / "- [ ] text" lines.
  for (const line of b.split(/\n+/)) {
    const om = line.match(/^\s*(?:\*\*)?\s*([A-H])\.\s*(.+)$/);
    if (om) {out.objectives.push({ key: om[1], text: om[2].replace(/\*\*/g, '').trim().slice(0, 400) });}
    // Acceptance table rows naming an identity: | `mfr / pid` | source | manifest | outcome |
    if (/^\s*\|/.test(line) && MFR.test(line) && !/^\s*\|\s*-{3}/.test(line)) {
      const cells = line.split('|').map((x) => x.replace(/[`*]/g, '').trim()).filter(Boolean);
      if (cells.length >= 2) {out.objectives.push({ key: 'row', text: cells.join(' | ').slice(0, 300) });}
    }
    const rc = line.match(/(?:Remaining closure condition|Outcome still required|Required acceptance|acceptance objective)[:\s]+(.{10,})/i);
    if (rc) {out.objectives.push({ key: 'accept', text: rc[1].replace(/\*\*/g, '').trim().slice(0, 300) });}
    const cb = line.match(/^\s*[-*]\s*\[[ x]\]\s*(.+)$/i);
    if (cb) {out.objectives.push({ key: '-', text: cb[1].trim().slice(0, 300) });}
  }
  out.regression = /\bregression\b|stopped working|no longer|broke|firmware update caused/i.test(b);
  out.duplicateOnly = /duplicate (?:work )?tracking|NOT completed|not as implemented|NOT a claim/i.test(b);
  const im = b.match(/(?:Implemented|Resolved) on `?([\w.-]+)`? in `([0-9a-f]{7,40})`/g) || [];
  out.implemented = im.map((s) => s.replace(/`/g, ''));
  return out;
}

function mergeIndex(prev, items, comments) {
  const idx = prev && prev.issues ? prev : { issues: {} };
  const get = (n) => idx.issues[n] = idx.issues[n] || { n: Number(n), sources: [], identities: [], objectives: [], batches: [], implemented: [] };
  for (const it of items) {
    const e = get(it.n);
    Object.assign(e, { title: it.t || it.title || e.title, state: it.state, state_reason: it.state_reason || null, closed_at: it.closed_at || null, pr: !!it.pr });
    if (it.body && it.user === AUTHOR) {
      const p = parseComment(it.body);
      for (const id of p.identities) {if (!e.identities.some((x) => x[0] === id[0] && x[1] === id[1])) {e.identities.push(id);}}
    }
  }
  for (const c of comments.filter((x) => x.user === AUTHOR).sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    const e = get(c.issue);
    const p = parseComment(c.body);
    if (p.batch && !e.batches.includes(p.batch)) {e.batches.push(p.batch);}
    if (p.canonical && p.canonical !== Number(c.issue)) {
      e.canonical = p.canonical;
      const can = get(p.canonical);
      if (!can.sources.includes(Number(c.issue))) {can.sources.push(Number(c.issue));}
    }
    for (const id of p.identities) {if (!e.identities.some((x) => x[0] === id[0] && x[1] === id[1])) {e.identities.push(id);}}
    for (const o of p.objectives) {if (!e.objectives.some((x) => x.text === o.text)) {e.objectives.push(o);}}
    for (const s of p.implemented) {if (!e.implemented.includes(s)) {e.implemented.push(s);}}
    if (p.regression) {e.regression = true;}
    if (p.duplicateOnly) {e.duplicateTrackingOnly = true;}
    e.lastComment = { at: c.created_at, url: c.url || `https://github.com/${REPO}/issues/${c.issue}#issuecomment-${c.id}`, excerpt: String(c.body).replace(/\s+/g, ' ').slice(0, 280) };
  }
  for (const e of Object.values(idx.issues)) {
    e.objectives = e.objectives.slice(0, 20);
    e.identities = e.identities.slice(0, 40);
  }
  return idx;
}

function summarize(idx) {
  const all = Object.values(idx.issues);
  return {
    issues: all.length,
    canonical: all.filter((e) => e.sources.length).length,
    closed: all.filter((e) => e.state === 'closed').length,
    duplicate: all.filter((e) => e.state_reason === 'duplicate').length,
    withObjectives: all.filter((e) => e.objectives.length).length,
    identities: new Set(all.flatMap((e) => e.identities.map((x) => x.join('|')))).size,
    regressions: all.filter((e) => e.regression).length,
  };
}

function ghGet(url) {
  return new Promise((resolve, reject) => {
    const headers = { 'User-Agent': 'tuya-zigbee-leads-scan', Accept: 'application/vnd.github+json' };
    if (process.env.GITHUB_TOKEN) {headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;}
    https.get(url, { headers }, (res) => {
      let d = '';
      res.on('data', (x) => { d += x; });
      res.on('end', () => {
        if (res.statusCode !== 200) {return reject(new Error(`HTTP ${res.statusCode} ${url}`));}
        try { resolve({ json: JSON.parse(d), link: res.headers.link || '' }); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); // CLI script, not app runtime

async function fetchAll(since) {
  const comments = [];
  const items = [];
  let url = `https://api.github.com/repos/${REPO}/issues/comments?since=${since}&per_page=100&sort=created&direction=asc`;
  for (let i = 0; url && i < MAX_PAGES; i++) {
    const { json, link } = await ghGet(url);
    for (const c of json) {comments.push({ id: c.id, user: c.user && c.user.login, created_at: c.created_at, issue: String(c.issue_url).split('/').pop(), url: c.html_url, body: c.body });}
    const nx = link.match(/<([^>]+)>;\s*rel="next"/);
    url = nx ? nx[1] : null;
    await sleep(700);
  }
  url = `https://api.github.com/repos/${REPO}/issues?state=all&since=${since}&per_page=100`;
  for (let i = 0; url && i < MAX_PAGES; i++) {
    const { json, link } = await ghGet(url);
    for (const it of json) {items.push({ n: it.number, t: it.title, state: it.state, state_reason: it.state_reason, closed_at: it.closed_at, pr: !!it.pull_request, user: it.user && it.user.login, body: it.body });}
    const nx = link.match(/<([^>]+)>;\s*rel="next"/);
    url = nx ? nx[1] : null;
    await sleep(700);
  }
  return { comments, items };
}

const readJsonl = (f) => fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));

async function main() {
  let prev = null;
  try { prev = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch (_e) { prev = null; }
  const since = arg('since', (prev && prev.cursor && prev.cursor.since) || '2026-09-15T00:00:00Z');
  const startedAt = new Date().toISOString();
  let data;
  if (arg('comments')) {
    data = { comments: readJsonl(arg('comments')), items: arg('items') ? readJsonl(arg('items')) : [] };
  } else {
    try { data = await fetchAll(since); } catch (e) { console.log(`[johan-index] soft-skip: ${e.message}`); return; }
  }
  const idx = mergeIndex(prev, data.items, data.comments);
  idx.generated = startedAt;
  idx.repo = REPO;
  idx.author = AUTHOR;
  idx.cursor = { since: arg('comments') ? (prev && prev.cursor && prev.cursor.since) || since : startedAt };
  idx.summary = summarize(idx);
  idx.note = 'Maintainer triage index. canonical = target of a consolidation; duplicateTrackingOnly = closed as duplicate tracking, NOT implemented. Leads only; fingerprints still need the strict rule.';
  const sorted = {};
  for (const k of Object.keys(idx.issues).sort((a, b) => Number(a) - Number(b))) {sorted[k] = idx.issues[k];}
  idx.issues = sorted;
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(idx, null, 1)}\n`);
  console.log('[johan-index]', JSON.stringify(idx.summary));
}

if (require.main === module) {main();}
module.exports = { parseComment, mergeIndex, summarize };
