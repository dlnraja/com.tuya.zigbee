'use strict';
/**
 * scripts/digest/leads.js — structured lead capture for the closed feedback loop.
 *
 * Every digest script (homey / forum / inspiration / git-mine) calls record() for each item it
 * reads. At the end flush() writes everything to $DIGEST_LEADS_OUT (JSON), which daily-digest
 * uploads as artifact `digest-leads-<job>-<run>`. market-couples-intake later downloads those
 * artifacts → scripts/digest/leads-merge.js → .github/state/digest-leads/couples.json →
 * tools/ci/cross-ref-all-sources.js (processDigestLeads) → the EXISTING tiering/apply pipeline.
 *
 * Doctrine:
 *  - A couple (manufacturerName + productId) is emitted only when it is unambiguous:
 *    from a Homey interview block, or when exactly ONE mfr and ONE pid appear in the item.
 *    Never a cartesian product, never an invented pid.
 *  - Anything derived from OCR, a fetched link, git history, or a guessed DP/cluster meaning is
 *    `heuristic: true`. leads-merge verifies heuristic leads against external datasets
 *    (Z2M herdsman cache, Blakadder, Z2M/ZHA crawls) before they may count as a market source.
 *  - Functional leads (DP, cluster, raw frame, MCU behaviour, needs-handler) are report data,
 *    never written into drivers automatically.
 *
 * Forum images are OCR'd only when served by the Discourse CDN (never extra hits on the forum host).
 * Extra inputs (bounded, free): OCR of image attachments with tesseract if installed on the
 * runner (DIGEST_OCR_MAX, default 5 per run), linked Z2M/Blakadder/ZHA pages (DIGEST_LINK_MAX,
 * default 3 per run, one GET each, 1.5–3 s apart).
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const E = require('./enrich');

const OUT = process.env.DIGEST_LEADS_OUT || '';
const OCR_MAX = Number(process.env.DIGEST_OCR_MAX ?? 5);
const LINK_MAX = Number(process.env.DIGEST_LINK_MAX ?? 3);
const UA = 'dlnraja-com.tuya.zigbee-digest/1.0 (+https://github.com/dlnraja/com.tuya.zigbee)';
const records = [];
let ocrUsed = 0; let linkUsed = 0; let tesseract = null;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// MCU / behaviour keywords worth tracking as functional leads (no meaning is inferred from them).
const BEHAVIOUR = [
  [/\b(?:mcu|tuya mcu)\b[^.\n]{0,40}\b(?:version|sync|reset|heartbeat)\b/i, 'mcu-sync'],
  [/\btime ?sync\b|\bmcuSyncTime\b|\b0x24\b.*time/i, 'time-sync'],
  [/\bmagic ?packet\b|\breadAttributes?\b.*\b(?:0x0000|basic)\b.*\b(?:4|5|7|0xfffe)\b/i, 'magic-packet'],
  [/\b(?:sleepy|end ?device|battery)\b[^.\n]{0,30}\b(?:not report|no report|stops? report|offline)\b/i, 'sleepy-no-report'],
  [/\b(?:inverted|reversed|wrong (?:value|scale|unit))\b/i, 'value-inverted-or-scale'],
  [/\bdivid(?:e|ed) by (?:10|100|1000)\b|\bscale\b[^.\n]{0,15}\b(?:10|100|1000)\b/i, 'scale-factor'],
];

function couples(ex) {
  if (ex.interview && ex.interview.manufacturerName && ex.interview.modelId) {
    const mfr = ex.interview.manufacturerName.trim(); const pid = ex.interview.modelId.trim();
    if (/^_T/.test(mfr) && /^TS[01]\d{3}[A-Z]?$/i.test(pid)) return [{ mfr, pid: pid.toUpperCase(), basis: 'interview' }];
  }
  if (ex.mfr.length === 1 && ex.pid.length === 1) return [{ mfr: ex.mfr[0], pid: ex.pid[0], basis: 'single-pair' }];
  return [];
}

function behaviours(text) {
  return BEHAVIOUR.filter(([re]) => re.test(text)).map(([, k]) => k);
}

function signals(ex, chk, text) {
  const s = {};
  if (ex.dp.length) s.dp = ex.dp.slice(0, 20);
  if (ex.cluster.length) s.cluster = ex.cluster.slice(0, 20).map(E.hex4);
  if (ex.frame.length) s.frame = ex.frame;
  if (ex.ref.length) s.ref = ex.ref;
  const b = behaviours(text || ''); if (b.length) s.behaviour = b;
  if (chk) { const u = E.unmappedLeads(chk); if (u.length) s.unmapped = u.slice(0, 20); }
  return s;
}

/**
 * record(source, ref, text, opts) — source ∈ forum | github-own | johan-issue | johan-comment | git-history
 * opts: { origin: 'text'|'ocr'|'link'|'commit', idx, branch }
 */
function record(source, ref, text, opts = {}) {
  const ex = E.extract(text);
  if (E.isEmpty(ex) && !behaviours(text).length) return null;
  const origin = opts.origin || 'text';
  const chk = opts.idx ? E.check(ex, opts.idx) : null;
  const heuristic = origin !== 'text' || source === 'git-history';
  const rec = {
    source, ref, origin, heuristic, branch: opts.branch,
    at: new Date().toISOString(),
    couples: couples(ex).map((c) => ({ ...c, heuristic: heuristic || undefined })),
    mfr: ex.mfr.slice(0, 10), pid: ex.pid.slice(0, 10),
    signals: signals(ex, chk, text),
  };
  // DP/cluster meanings are never guessed here; they stay unverified until leads-merge cross-checks Z2M.
  if (!rec.couples.length && !rec.mfr.length && !rec.pid.length && !Object.keys(rec.signals).length) return null; // nothing actionable
  if (rec.signals.dp || rec.signals.cluster) rec.signals.verified = false;
  records.push(rec);
  return rec;
}

function imageUrls(text, max = 5) {
  const urls = new Set();
  for (const m of String(text).matchAll(/https:\/\/(?:github\.com\/user-attachments\/assets\/[0-9a-f-]{36}|user-images\.githubusercontent\.com\/[^\s)"'<>]+|private-user-images\.githubusercontent\.com\/[^\s)"'<>]+|[a-z0-9-]+\.discourse-cdn\.com\/[^\s)"'<>]+\.(?:png|jpe?g|webp))/gi)) {
    urls.add(m[0].replace(/[).,]+$/, ''));
    if (urls.size >= max) break;
  }
  return [...urls];
}

function hasTesseract() {
  if (tesseract !== null) return tesseract;
  try { execFileSync('tesseract', ['--version'], { stdio: 'ignore', timeout: 10000 }); tesseract = true; } catch { tesseract = false; }
  return tesseract;
}

const OCR_LANGS = process.env.DIGEST_OCR_LANGS || 'eng+fra+deu+nld+spa+ita';
let visionUsed = 0;
function run(cmd, args, timeout = 45000) {
  return execFileSync(cmd, args, { timeout, maxBuffer: 4 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }).toString();
}
function tesseractText(file) {
  // Installed languages only (missing traineddata would make tesseract fail).
  let langs = OCR_LANGS;
  try { const have = new Set(run('tesseract', ['--list-langs']).split('\n').map((x) => x.trim())); langs = OCR_LANGS.split('+').filter((l) => have.has(l)).join('+') || 'eng'; } catch { langs = 'eng'; }
  const out = [];
  // Preprocess with ImageMagick when available: grayscale, 2× upscale, normalize, threshold.
  const pre = `${file}-pre.png`;
  try { run('convert', [file, '-colorspace', 'Gray', '-resize', '200%', '-normalize', '-threshold', '55%', pre], 30000); out.push(run('tesseract', [pre, 'stdout', '-l', langs, '--psm', '6'])); } catch { /* no imagemagick or failed */ } finally { try { fs.unlinkSync(pre); } catch { /* none */ } }
  if (out.join('').trim().length < 20) { try { out.push(run('tesseract', [file, 'stdout', '-l', langs, '--psm', '6'])); } catch { /* ignore */ } }
  return out.join('\n');
}
/** Optional Gemini vision (only when AI_ALLOW_REMOTE=true AND a key is provided; ≤2 per run). */
async function geminiVision(buf, type) {
  const key = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!key || !/^(1|true|yes)$/i.test(process.env.AI_ALLOW_REMOTE || '') || visionUsed >= 2) return '';
  visionUsed++;
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(key)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(30000),
      body: JSON.stringify({ contents: [{ parts: [{ text: 'Transcribe all text in this screenshot verbatim (identifiers, numbers, hex). No commentary.' }, { inline_data: { mime_type: type, data: buf.toString('base64') } }] }], generationConfig: { temperature: 0, maxOutputTokens: 800 } }),
    });
    if (!res.ok) return '';
    const j = await res.json();
    return String(j.candidates?.[0]?.content?.parts?.[0]?.text || '').slice(0, 20000);
  } catch { return ''; }
}

/** OCR an image URL: optional Gemini vision, else free local tesseract (+preprocessing, multi-language). */
async function ocr(url) {
  if (ocrUsed >= OCR_MAX) return '';
  const tess = hasTesseract();
  ocrUsed++;
  const tmp = path.join(os.tmpdir(), `digest-ocr-${process.pid}-${ocrUsed}`);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(20000) });
    if (!res.ok) return '';
    const type = (res.headers.get('content-type') || '').split(';')[0];
    if (!/^image\//.test(type)) return '';
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 6 * 1024 * 1024) return '';
    const v = await geminiVision(buf, type);
    if (v) return v;
    if (!tess) return '';
    fs.writeFileSync(tmp, buf);
    return tesseractText(tmp).slice(0, 20000);
  } catch { return ''; } finally { try { fs.unlinkSync(tmp); } catch { /* none */ } }
}

function linkUrls(text, max = 3) {
  const urls = new Set();
  for (const m of String(text).matchAll(/https:\/\/(?:www\.)?(?:zigbee2mqtt\.io\/devices\/[A-Za-z0-9_.%\-]{2,80}\.html|zigbee\.blakadder\.com\/[A-Za-z0-9_.%\-]{2,80}\.html)/gi)) {
    urls.add(m[0]); if (urls.size >= max) break;
  }
  return [...urls];
}

const stripHtml = (h) => String(h).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');

/** Fetch a linked Z2M / Blakadder device page (one GET, public, polite). Bounded by DIGEST_LINK_MAX. */
async function fetchLink(url) {
  if (linkUsed >= LINK_MAX) return '';
  linkUsed++;
  await sleep(1500 + Math.floor(Math.random() * 1500));
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html' }, signal: AbortSignal.timeout(20000) });
    if (!res.ok) return '';
    return stripHtml((await res.text()).slice(0, 400000)).slice(0, 60000);
  } catch { return ''; }
}

/** Convenience: record the text, then its images (OCR) and linked pages, all tagged accordingly. */
async function recordDeep(source, ref, text, opts = {}) {
  const out = [record(source, ref, text, opts)];
  for (const u of imageUrls(text, 3)) {
    const t = await ocr(u);
    if (t) out.push(record(source, `${ref} (img ${u.slice(-12)})`, t, { ...opts, origin: 'ocr' }));
  }
  for (const u of linkUrls(text, 2)) {
    const t = await fetchLink(u);
    if (t) out.push(record(source, `${ref} → ${u}`, t, { ...opts, origin: 'link' }));
  }
  return out.filter(Boolean);
}

function flush(job) {
  if (!OUT) return;
  let prev = [];
  try { prev = JSON.parse(fs.readFileSync(OUT, 'utf8')).records || []; } catch { /* new file */ }
  fs.mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ job, at: new Date().toISOString(), ocrUsed, linkUsed, tesseract, records: [...prev, ...records] }, null, 1));
  console.log(`leads: ${records.length} record(s) → ${OUT} (ocr ${ocrUsed}, links ${linkUsed})`);
}

// Flush automatically when the script exits (sync write), so every caller gets it for free.
if (OUT) process.on('exit', () => { try { flush(process.env.DIGEST_JOB || path.basename(process.argv[1] || 'digest')); } catch (e) { console.log(`leads flush failed: ${e.message}`); } });

module.exports = { couples, signals, behaviours, record, recordDeep, imageUrls, linkUrls, ocr, fetchLink, flush, stripHtml, records };
