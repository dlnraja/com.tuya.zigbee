#!/usr/bin/env node
'use strict';
/**
 * scripts/scanners/issue-image-ocr.js — systematic image reading for issue threads (P2791).
 *
 * Walks issues (open + closed, newest first) of the tracked repos, reads the body and EVERY comment,
 * downloads every attached image (GitHub attachment hosts only) and OCRs it with tesseract.
 * Extracts manufacturerName / productId / DP numbers / capability ids from the OCR text and the post
 * text, and stores them as leads (never applied directly — scripts/leads/strict-apply.js decides).
 *
 *   node scripts/scanners/issue-image-ocr.js [--repos=JohanBendz/com.tuya.zigbee,dlnraja/com.tuya.zigbee]
 *        [--max-issues=40] [--max-images=25] [--max-requests=150] [--issue=1035] [--dry]
 *
 * Anti-ban: GITHUB_TOKEN only, polite 0.6–1.5 s jitter between API calls, hard request + image caps,
 * cursor (data/leads/image-ocr-cursor.json) so pages are never re-read; an issue is re-read only when
 * its updated_at changes. Images are fetched from GitHub attachment hosts only, ≤ 8 MB, 1 s apart.
 * No tesseract on the runner → text-only extraction (images listed, not OCR'd).
 * Output: data/leads/image-ocr.json (entries with at least one id / DP / capability hit).
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const ROOT = process.cwd();
const REPOS = String(arg('repos', 'JohanBendz/com.tuya.zigbee,dlnraja/com.tuya.zigbee')).split(',').filter(Boolean);
const MAX_ISSUES = Number(arg('max-issues', 40));
const MAX_IMAGES = Number(arg('max-images', 25));
const MAX_REQ = Number(arg('max-requests', 150));
const ONLY = arg('issue', '');
const DRY = process.argv.includes('--dry');
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
const CURSOR = path.join(ROOT, 'data/leads/image-ocr-cursor.json');
const OUT = path.join(ROOT, 'data/leads/image-ocr.json');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const jitter = () => sleep(600 + Math.random() * 900);
let requests = 0;
let images = 0;
let stopped = '';

async function gh(p) {
  if (requests >= MAX_REQ) { stopped = `request budget ${MAX_REQ}`; return null; }
  if (requests++) {await jitter();}
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'tuya-image-ocr', 'X-GitHub-Api-Version': '2022-11-28' };
  if (TOKEN) {headers.Authorization = `Bearer ${TOKEN}`;}
  const res = await fetch(`https://api.github.com/${p}`, { headers, signal: AbortSignal.timeout(30000) }).catch(() => null);
  if (!res) {return null;}
  if (res.status === 403 || res.status === 429) { stopped = `rate limited (${res.status})`; return null; }
  if (!res.ok) {return null;}
  return res.json();
}

// ---------- extraction (lenient for OCR noise, normalised) ----------
const IMG_RE = /https:\/\/(?:github\.com\/user-attachments\/assets\/[0-9a-f-]{36}|(?:private-)?user-images\.githubusercontent\.com\/[^\s)"'<>]+|github\.com\/[^/\s]+\/[^/\s]+\/assets\/\d+\/[0-9a-f-]{36})/gi;
const MFR_LOOSE = /(?<![A-Za-z0-9])_?T[Z2][A-Z0-9]{1,4}[_\s-]{1,2}[A-Za-z0-9]{8}(?![A-Za-z0-9])/g;
const PID_RE = /\b(?:TS|T5)[0-9O]{3,4}[A-Z]?\b/g;
const DP_RE = /\b(?:dp|DP|dpId|dp_id)\s*[:=#]?\s*(\d{1,3})\b/g;
const CAP_RE = /\b(?:alarm|measure|meter|target|windowcoverings|light|dim|onoff)_[a-z_]{3,30}\b/g;

function normMfr(s) {
  let m = String(s).replace(/\s|-/g, '_').replace(/__+/g, '_');
  if (!m.startsWith('_')) {m = `_${m}`;}
  const [, pre, suf] = m.match(/^_([Tt][^_]+)_(.+)$/) || [];
  if (!pre || !suf || suf.length !== 8) {return null;}
  const P = pre.toUpperCase().replace(/^T2/, 'TZ');
  if (!/^TZ[A-Z0-9]{1,4}$/.test(P)) {return null;}
  if (/^[0-9]{8}$/.test(suf) || /x{5,}/i.test(suf)) {return null;}
  return `_${P}_${suf}`;
}
function extract(text) {
  const t = String(text || '');
  const mfrs = [...new Set((t.match(MFR_LOOSE) || []).map(normMfr).filter(Boolean))].slice(0, 20);
  const pids = [...new Set((t.match(PID_RE) || []).map((p) => p.toUpperCase().replace(/^T5/, 'TS').replace(/O/g, '0')))].slice(0, 10);
  const dps = [...new Set([...t.matchAll(DP_RE)].map((m) => Number(m[1])).filter((n) => n > 0 && n < 256))].slice(0, 30);
  const caps = [...new Set(t.match(CAP_RE) || [])].slice(0, 20);
  return { mfrs, pids, dps, caps };
}

function haveTesseract() { return spawnSync('tesseract', ['--version'], { encoding: 'utf8' }).status === 0; }
const TESS = haveTesseract();

async function ocr(url) {
  if (!TESS || images >= MAX_IMAGES) {return null;}
  images++;
  await sleep(1000);
  const headers = { 'User-Agent': 'tuya-image-ocr' };
  // Attachments of public repos are served without auth; the token is only sent to github.com itself.
  if (TOKEN && /^https:\/\/github\.com\//.test(url)) {headers.Authorization = `Bearer ${TOKEN}`;}
  const res = await fetch(url, { headers, redirect: 'follow', signal: AbortSignal.timeout(30000) }).catch(() => null);
  if (!res || !res.ok) {return null;}
  const type = res.headers.get('content-type') || '';
  if (!/^image\/(png|jpe?g|gif|webp|bmp|tiff)/.test(type)) {return null;}
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > 8 << 20) {return null;}
  const f = path.join(os.tmpdir(), `ocr-${process.pid}-${images}.${type.split('/')[1].replace('jpeg', 'jpg')}`);
  fs.writeFileSync(f, buf);
  const r = spawnSync('tesseract', [f, 'stdout', '-l', 'eng', '--psm', '6'], { encoding: 'utf8', timeout: 90000 });
  fs.rmSync(f, { force: true });
  return r.status === 0 ? r.stdout : null;
}

async function readIssue(repo, issue, out) {
  const posts = [{ url: issue.html_url, user: issue.user?.login, body: `${issue.title}\n\n${issue.body || ''}` }];
  if (issue.comments > 0) {
    for (let page = 1; page <= 5; page++) {
      const cs = await gh(`repos/${repo}/issues/${issue.number}/comments?per_page=100&page=${page}`);
      if (!cs) {return false;}
      for (const c of cs) {posts.push({ url: c.html_url, user: c.user?.login, body: c.body || '' });}
      if (cs.length < 100) {break;}
    }
  }
  for (const p of posts) {
    const imgs = [...new Set(p.body.match(IMG_RE) || [])];
    const tx = extract(p.body);
    for (const img of imgs) {
      if (out.seenImages.has(img)) {continue;}
      if (!TESS) {continue;} // no OCR engine: leave the image unseen for a later run that has one
      if (images >= MAX_IMAGES) { out.pendingImages = true; return false; }
      const text = await ocr(img);
      out.seenImages.add(img);
      if (!text) {continue;}
      const ex = extract(text);
      if (ex.mfrs.length || ex.pids.length || ex.dps.length || ex.caps.length) {
        out.entries.push({ repo, issue: issue.number, post: p.url, user: p.user, image: img, source: 'ocr', ...ex, text: text.replace(/\s+/g, ' ').trim().slice(0, 600) });
      }
    }
    if ((tx.mfrs.length && tx.pids.length) || (tx.mfrs.length && tx.dps.length)) {
      out.entries.push({ repo, issue: issue.number, post: p.url, user: p.user, source: 'text', images: imgs.length, ...tx });
    }
  }
  return true;
}

async function main() {
  const cur = fs.existsSync(CURSOR) ? JSON.parse(fs.readFileSync(CURSOR, 'utf8')) : { repos: {}, seenImages: [] };
  const prev = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : { entries: [] };
  const out = { entries: prev.entries || [], seenImages: new Set(cur.seenImages || []) };
  const keyOf = (e) => `${e.post}|${e.image || 'text'}`;
  const known = new Set(out.entries.map(keyOf));
  let issuesRead = 0;
  for (const repo of REPOS) {
    const st = cur.repos[repo] || (cur.repos[repo] = { page: 1, done: false, seen: {} });
    if (ONLY) {
      const it = await gh(`repos/${repo}/issues/${ONLY}`);
      if (it && await readIssue(repo, it, out)) {st.seen[it.number] = it.updated_at;}
      continue;
    }
    // full newest→oldest pass once, then only issues updated since the pass started
    if (st.done) { st.page = 1; st.done = false; st.since = st.passStart; }
    if (st.page === 1 && !st.passStartPending) { st.passStartPending = new Date().toISOString(); }
    while (!st.done && !stopped && issuesRead < MAX_ISSUES) {
      const q = st.since ? `&sort=updated&direction=desc&since=${encodeURIComponent(st.since)}` : '&sort=created&direction=desc';
      const list = await gh(`repos/${repo}/issues?state=all&per_page=50&page=${st.page}${q}`);
      if (!list) {break;}
      if (!list.length) { st.done = true; st.passStart = st.passStartPending; delete st.passStartPending; break; }
      let pageComplete = true;
      for (const it of list) {
        if (st.seen[it.number] === it.updated_at) {continue;}
        if (issuesRead >= MAX_ISSUES || stopped) { pageComplete = false; break; }
        issuesRead++;
        const ok = await readIssue(repo, it, out);
        if (!ok) { pageComplete = false; break; }
        st.seen[it.number] = it.updated_at;
      }
      if (!pageComplete) {break;}
      st.page++;
    }
  }
  const fresh = out.entries.filter((e) => !known.has(keyOf(e)));
  const summary = { at: new Date().toISOString(), tesseract: TESS, requests, images, issuesRead, newEntries: fresh.length, stopped: stopped || (out.pendingImages ? 'image cap' : 'ok') };
  console.log(JSON.stringify(summary));
  if (DRY) {return;}
  cur.seenImages = [...out.seenImages].slice(-20000);
  cur.lastRun = summary;
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const dedup = new Map(out.entries.map((e) => [keyOf(e), e]));
  fs.writeFileSync(OUT, `${JSON.stringify({ note: 'read-only leads from issue posts + OCR of attached images; review before applying', entries: [...dedup.values()] }, null, 1)}\n`);
  fs.writeFileSync(CURSOR, `${JSON.stringify(cur, null, 1)}\n`);
}

module.exports = { extract, normMfr, IMG_RE };
if (require.main === module) {main().catch((e) => { console.error(`image-ocr: ${e.stack}`); process.exit(0); });}
