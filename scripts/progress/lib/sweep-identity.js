'use strict';
/**
 * Shared, AI-free identity helpers for the history sweep (Johan issues + forum threads).
 * Extracts Tuya-style manufacturerName / productId tokens from free text and checks them
 * against our driver composes case-insensitively (R20). Stores identities only, never text.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../../..');
const MFR_RE = /(?:^|[^A-Za-z0-9])(_T[A-Z0-9]{2,5}_[A-Za-z0-9]{8}|_TYZB0[12]_[A-Za-z0-9]{8}|TUYATEC-[A-Za-z0-9]{8})(?![A-Za-z0-9])/g;
const PID_RE = /(?:^|[^A-Za-z0-9])(TS[0-9]{3,4}[A-Z]?|TS[0-9]{3}[0-9A-F][A-Z]?)(?![A-Za-z0-9])/g;
const REQUEST_RE = /\b(not (?:yet )?supported|unknown (?:zigbee )?device|generic zigbee|doesn'?t work|does not work|not working|won'?t pair|cannot pair|can'?t pair|pairing (?:fails?|problem)|interview|add (?:support|device)|please add|fingerprint|niet ondersteund|nicht unterst|ne fonctionne pas|non reconnu|ajouter|appairage)\b/i;
const DIAG_RE = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i;

function stripHtml(s) {
  return String(s || '')
    .replace(/<aside class="quote[\s\S]*?<\/aside>/g, ' ') // quoted posts belong to their own author
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;|&#\d+;/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF\u00AD]/g, ''); // invisible chars (R20)
}

function uniqCi(arr) {
  const seen = new Map();
  for (const a of arr) { const k = a.toLowerCase(); if (!seen.has(k)) seen.set(k, a); }
  return [...seen.values()];
}

function extract(text) {
  const t = String(text || '');
  const mfrs = []; const pids = [];
  let m;
  MFR_RE.lastIndex = 0; while ((m = MFR_RE.exec(t))) mfrs.push(m[1]);
  PID_RE.lastIndex = 0; while ((m = PID_RE.exec(t))) pids.push(m[1].toUpperCase());
  return {
    mfrs: uniqCi(mfrs).slice(0, 12),
    pids: uniqCi(pids).slice(0, 8),
    request: REQUEST_RE.test(t),
    diag: DIAG_RE.test(t),
  };
}

let _index = null;
/** Map "mfr|pid" (lower) -> [driverIds]; plus mfr (lower) -> Set(driverIds). Built once, read-only. */
function driverIndex() {
  if (_index) return _index;
  const couples = new Map(); const mfrs = new Map();
  const dir = path.join(ROOT, 'drivers');
  for (const d of fs.readdirSync(dir)) {
    const f = path.join(dir, d, 'driver.compose.json');
    if (!fs.existsSync(f)) continue;
    let z;
    try { z = JSON.parse(fs.readFileSync(f, 'utf8')).zigbee || {}; } catch { continue; }
    const ms = (z.manufacturerName || []).map((s) => String(s).toLowerCase());
    const ps = (z.productId || []).map((s) => String(s).toLowerCase());
    for (const mf of ms) {
      if (!mfrs.has(mf)) mfrs.set(mf, new Set());
      mfrs.get(mf).add(d);
      for (const pd of ps) {
        const k = `${mf}|${pd}`;
        if (!couples.has(k)) couples.set(k, []);
        const arr = couples.get(k); if (!arr.includes(d)) arr.push(d);
      }
    }
  }
  _index = { couples, mfrs };
  return _index;
}

/**
 * Check identities against drivers. A couple is only formed when exactly one pid is cited
 * (or the mfr is known with one of the cited pids); otherwise we report mfr presence only.
 */
function coverage(ids) {
  const idx = driverIndex();
  const present = []; const missing = []; const mfrOnly = [];
  for (const mf of ids.mfrs) {
    const lm = mf.toLowerCase();
    const hit = ids.pids.map((p) => [p, idx.couples.get(`${lm}|${p.toLowerCase()}`)]).filter((x) => x[1]);
    if (hit.length) { for (const [p, ds] of hit) present.push({ mfr: mf, pid: p, drivers: ds }); continue; }
    if (ids.pids.length === 1) missing.push({ mfr: mf, pid: ids.pids[0], mfrOn: idx.mfrs.has(lm) ? [...idx.mfrs.get(lm)].slice(0, 4) : [] });
    else if (idx.mfrs.has(lm)) mfrOnly.push({ mfr: mf, drivers: [...idx.mfrs.get(lm)].slice(0, 4) });
    else missing.push({ mfr: mf, pid: ids.pids.length ? ids.pids.join('/') : null, mfrOn: [] });
  }
  return { present, missing, mfrOnly };
}

/** Status for one sweep item from extracted identities. */
function classify(ids, { closedPr = false } = {}) {
  const cov = coverage(ids);
  if (closedPr) return { status: 'already-fixed', cov, why: 'closed-pr' };
  if (ids.mfrs.length) {
    if (!cov.missing.length) return { status: 'already-fixed', cov, why: cov.mfrOnly.length ? 'mfr-known' : 'couples-present' };
    return { status: 'pending', cov, why: 'couple-missing' };
  }
  if (ids.pids.length) return { status: ids.request ? 'needs-info' : 'no-action', cov, why: 'pid-only' };
  if (ids.request || ids.diag) return { status: 'needs-info', cov, why: ids.diag ? 'diag-only' : 'request-no-identity' };
  return { status: 'no-action', cov, why: 'no-identity' };
}

module.exports = { extract, stripHtml, driverIndex, coverage, classify };
