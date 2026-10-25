#!/usr/bin/env node
'use strict';
/**
 * P2810 — free forum image ingestion (no AI, no login, never posts).
 * For each tracked Homey community topic it reads new posts first (tail), then backfills from post 1,
 * downloads uploaded screenshots (Discourse CDN only, emoji/avatars skipped), OCRs them with tesseract,
 * and extracts manufacturerName / productId / DP ids / capability ids from the OCR text + post text.
 * Each hit is checked against our drivers (coverage) and stored as a structured lead:
 *   data/leads/forum-image-ocr.json  { entries[{ id, link, author, image, mfrs, pids, dps, caps, missing }], candidates[] }
 * No OCR or post text is stored (C1/C5). Cursor per topic in the same file (resumable, bounded).
 *   node scripts/scanners/forum-image-ocr.js [--topics=140352,...] [--max-images=30] [--max-posts=120] [--dry]
 * Without tesseract the scan still records identities found in post text (images listed as pending).
 * P3048 (free, t538u): tesseract eng+fra when the fra pack is installed (`tesseract --list-langs`), and a hash
 * cache data/leads/ocr-hash-cache.json { byUrl: url -> sha256, byHash: sha256 -> { mfrs, pids, dps, caps,
 * symptoms, models, brands, at } } so an image already seen (same URL or same bytes) is never downloaded or
 * OCRed again. Derived labels only, never the OCR text (C1/C5). Bounded by self-maintain.cjs (20000 keys).
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const { getJson } = require('../progress/lib/sweep-forum');
const { stripHtml, extract: extractIds, coverage } = require('../progress/lib/sweep-identity');
const { extract: extractOcr } = require('./issue-image-ocr');
const { extractSymptoms, extractModels, quirkCandidates } = require('../progress/lib/forum-symptoms');

const ROOT = path.join(__dirname, '../..');
const OUT = path.join(ROOT, 'data/leads/forum-image-ocr.json');
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const TOPICS = String(arg('topics', '140352,26439,146735,154077,21313,89271')).split(',').filter(Boolean);
const MAX_IMAGES = Math.max(0, Number(arg('max-images', 30)) || 0);
const MAX_POSTS = Math.max(20, Number(arg('max-posts', 120)) || 120);
const MAX_ENTRIES = 4000; // bounded file
const DRY = process.argv.includes('--dry');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const HOST_OK = /^https:\/\/(?:[a-z0-9-]+\.)?discourse-cdn\.com\/|^https:\/\/community\.homey\.app\/uploads\//;
const TESS = spawnSync('tesseract', ['--version'], { encoding: 'utf8' }).status === 0;
const CACHE_FILE = path.join(ROOT, 'data/leads/ocr-hash-cache.json');

/** eng+fra when the French pack is installed (free apt package tesseract-ocr-fra), else eng. */
function ocrLangs(listLangsOutput) {
  const langs = new Set(String(listLangsOutput || '').split(/\s+/).filter(Boolean));
  return ['eng', 'fra'].filter((l) => langs.has(l)).join('+') || 'eng';
}
const LANGS = TESS ? ocrLangs(spawnSync('tesseract', ['--list-langs'], { encoding: 'utf8' }).stdout) : 'eng';

function loadCache(file = CACHE_FILE) {
  try { const j = JSON.parse(fs.readFileSync(file, 'utf8')); return { byUrl: j.byUrl || {}, byHash: j.byHash || {}, note: j.note }; } catch { return { byUrl: {}, byHash: {} }; }
}
const CACHE = loadCache();
const cacheStats = { urlHits: 0, hashHits: 0, ocred: 0 };

/** Derived labels of one OCR text (what the cache keeps; the text itself is dropped). */
function labelsOf(t) {
  const e = extractOcr(t);
  const { models, brands } = extractModels(t);
  return { mfrs: e.mfrs || [], pids: e.pids || [], dps: e.dps || [], caps: e.caps || [], symptoms: extractSymptoms(t), models, brands };
}

/** cacheLookup(cache, url, buf?) -> labels or null (pure). */
function cacheLookup(cache, url, buf) {
  const h = cache.byUrl[url] || (buf ? crypto.createHash('sha256').update(buf).digest('hex') : null);
  return h && cache.byHash[h] ? { hash: h, labels: cache.byHash[h] } : (h ? { hash: h, labels: null } : null);
}
let imagesDone = 0;

function load() {
  try { return JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch { return { cursor: {}, entries: [], candidates: [] }; }
}

function imageUrls(cooked) {
  const out = [];
  const re = /<img [^>]*src="([^"]+)"[^>]*>/g;
  let m;
  while ((m = re.exec(String(cooked || '')))) {
    const tag = m[0]; let u = m[1];
    if (/class="(?:emoji|avatar)/.test(tag) || /\/images\/emoji\//.test(u)) continue;
    if (u.startsWith('//')) u = `https:${u}`;
    if (HOST_OK.test(u) && !out.includes(u)) out.push(u);
  }
  return out.slice(0, 6);
}

/** ocr(url) -> labels { mfrs, pids, dps, caps, symptoms, models, brands } or null. */
async function ocr(url) {
  const known = cacheLookup(CACHE, url);
  if (known && known.labels) { cacheStats.urlHits++; return known.labels; }
  if (!TESS || imagesDone >= MAX_IMAGES) return null;
  imagesDone++;
  await sleep(1000);
  const res = await fetch(url, { headers: { 'User-Agent': 'dlnraja-forum-ocr' }, signal: AbortSignal.timeout(30000) }).catch(() => null);
  if (res && res.status === 429) { await sleep(Math.min(Number(res.headers.get('retry-after')) * 1000 || 30000, 90000)); return null; }
  if (!res || !res.ok) return null;
  const type = res.headers.get('content-type') || '';
  if (!/^image\/(png|jpe?g|gif|webp|bmp)/.test(type)) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > 8 << 20) return null;
  const same = cacheLookup(CACHE, url, buf);
  CACHE.byUrl[url] = same.hash;
  if (same.labels) { cacheStats.hashHits++; return same.labels; }
  const f = path.join(os.tmpdir(), `focr-${process.pid}-${imagesDone}.${type.split('/')[1].replace('jpeg', 'jpg')}`);
  fs.writeFileSync(f, buf);
  const r = spawnSync('tesseract', [f, 'stdout', '-l', LANGS, '--psm', '6'], { encoding: 'utf8', timeout: 90000 });
  fs.rmSync(f, { force: true });
  if (r.status !== 0) return { mfrs: [], pids: [], dps: [], caps: [], symptoms: [], models: [], brands: [] };
  const labels = labelsOf(r.stdout || '');
  CACHE.byHash[same.hash] = { ...labels, at: new Date().toISOString() };
  cacheStats.ocred++;
  return labels;
}

async function handlePost(tid, p, out) {
  const text = stripHtml(p.cooked);
  const imgs = imageUrls(p.cooked);
  const base = extractIds(text);
  let ocrIds = { mfrs: [], pids: [], dps: [], caps: [] };
  let ocrState = imgs.length ? (TESS ? 'done' : 'no-tesseract') : 'none';
  for (const u of imgs) {
    if (imagesDone >= MAX_IMAGES) { ocrState = 'image-cap'; break; }
    const e = await ocr(u);
    if (e == null) continue;
    for (const k of ['mfrs', 'pids', 'dps', 'caps', 'symptoms', 'models', 'brands']) ocrIds[k] = [...new Set([...(ocrIds[k] || []), ...(e[k] || [])])];
  }
  const mfrs = [...new Set([...base.mfrs, ...ocrIds.mfrs])].slice(0, 12);
  const pids = [...new Set([...base.pids, ...ocrIds.pids])].slice(0, 8);
  // WHY(2026-10-11, forum 140352 #2238–#2258): symptom-only posts (Flow lag, missing History,
  // datapoint write errors) and white-label model codes (ZG-106Z, AY-303Z, MTG075) were dropped
  // because only Tuya mfr/pid made an entry. Labels only, never the text (C1/C5).
  // P3048: image labels come from the hash cache / fresh OCR (labels only), merged with the post text ones.
  const fromText = extractModels(text);
  const symptoms = [...new Set([...extractSymptoms(text), ...(ocrIds.symptoms || [])])];
  const models = [...new Set([...fromText.models, ...(ocrIds.models || [])])];
  const brands = [...new Set([...fromText.brands, ...(ocrIds.brands || [])])];
  if (!mfrs.length && !pids.length && !models.length && !symptoms.length && !ocrIds.dps.length && !ocrIds.caps.length && ocrState !== 'image-cap' && ocrState !== 'no-tesseract') return ocrState;
  const cov = coverage({ mfrs, pids });
  const id = `forum:${tid}#${p.post_number}`;
  const entry = {
    id, link: `https://community.homey.app/t/${tid}/${p.post_number}`, author: p.username, at: p.created_at,
    images: imgs.length, ocr: ocrState, mfrs, pids,
    fromImage: ocrIds.mfrs.length || ocrIds.pids.length ? { mfrs: ocrIds.mfrs, pids: ocrIds.pids } : undefined,
    dps: ocrIds.dps.length ? ocrIds.dps : undefined, caps: ocrIds.caps.length ? ocrIds.caps : undefined,
    missing: cov.missing.length ? cov.missing.map((x) => `${x.mfr}|${x.pid || '?'}`) : undefined,
    models: models.length ? models : undefined,
    brands: brands.length ? brands : undefined,
    symptoms: symptoms.length ? symptoms : undefined,
    quirkCandidates: symptoms.length ? quirkCandidates({ mfrs, pids, models }, symptoms) : undefined,
    triage: symptoms.length ? 'daily-resume' : undefined,
  };
  const i = out.entries.findIndex((e) => e.id === id);
  if (i >= 0) out.entries[i] = entry; else out.entries.push(entry);
  return ocrState;
}

async function walk(tid, cur, out, mode) {
  const topic = await getJson(`/t/${tid}.json`);
  if (!topic || topic.rateLimited || topic.error || !topic.post_stream) return { error: topic && (topic.status || 'no-stream') };
  const stream = topic.post_stream.stream || [];
  if (cur.tailId == null) cur.tailId = stream.length > 40 ? stream[stream.length - 41] : 0; // first run: last 40 posts
  const ids = mode === 'tail'
    ? stream.filter((x) => x > cur.tailId).slice(0, MAX_POSTS)
    : stream.filter((x) => x > (cur.backfillId || 0) && x <= cur.tailId).slice(0, Math.floor(MAX_POSTS / 2));
  let n = 0;
  for (let i = 0; i < ids.length; i += 20) {
    await sleep(900);
    const r = await getJson(`/t/${tid}/posts.json?${ids.slice(i, i + 20).map((x) => `post_ids[]=${x}`).join('&')}`);
    if (!r || r.rateLimited || r.error || !r.post_stream) return { error: r && (r.status || 'posts'), n };
    for (const p of (r.post_stream.posts || []).sort((a, b) => a.id - b.id)) {
      const st = await handlePost(tid, p, out);
      if (st === 'image-cap') return { n, capped: true }; // resume this post next run
      n++;
      if (mode === 'tail') cur.tailId = Math.max(cur.tailId, p.id); else cur.backfillId = Math.max(cur.backfillId || 0, p.id);
    }
  }
  return { n };
}

async function main() {
  const out = load();
  out.cursor = out.cursor || {}; out.entries = out.entries || [];
  const report = [];
  for (const mode of ['tail', 'backfill']) {
    for (const tid of TOPICS) {
      const cur = out.cursor[tid] || (out.cursor[tid] = {});
      const r = await walk(tid, cur, out, mode);
      report.push({ tid, mode, ...r });
      if (r.error === 429 || r.error === 403) break;
    }
  }
  if (out.entries.length > MAX_ENTRIES) out.entries = out.entries.slice(-MAX_ENTRIES);
  out.candidates = [...new Set(out.entries.flatMap((e) => e.missing || []))].filter((c) => !c.endsWith('|?')).sort();
  // Symptom triage queue for the daily resume (structured labels + link only).
  out.symptomQueue = out.entries.filter((e) => e.symptoms && e.symptoms.length).slice(-200)
    .map((e) => ({ id: e.id, link: e.link, author: e.author, symptoms: e.symptoms, models: e.models, mfrs: e.mfrs }));
  out.generated = new Date().toISOString();
  out.note = 'Structured leads from forum posts + screenshots (OCR). No post or OCR text stored. candidates = cited couples with no home driver here; verify real hardware (W4) before adding.';
  out.lastRun = { at: out.generated, tesseract: TESS, langs: LANGS, images: imagesDone, cache: cacheStats, report };
  if (!DRY) {
    fs.writeFileSync(OUT, `${JSON.stringify(out, null, 1)}\n`);
    fs.writeFileSync(CACHE_FILE, `${JSON.stringify({ note: 'P3048: OCR hash cache (url -> sha256 -> derived labels). No OCR text. Bounded by scripts/automation/self-maintain.cjs.', byUrl: CACHE.byUrl, byHash: CACHE.byHash }, null, 1)}\n`);
  }
  console.log(JSON.stringify({ tesseract: TESS, images: imagesDone, entries: out.entries.length, candidates: out.candidates.length, report }));
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Forum image OCR\n\`\`\`json\n${JSON.stringify(out.lastRun)}\n\`\`\`\n`);
}
module.exports = { ocrLangs, cacheLookup, labelsOf, loadCache, imageUrls };
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
