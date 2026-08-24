'use strict';

/**
 * sacred-couple-pair.js (P2231)
 * Shared validation for manufacturerName + productId (never mfr-only, never invented pid).
 */

const TS_PID_RX = /^TS\d{4}[A-Z0-9]?$/;
const TUYA_MFR_RX = /^(_TZ[A-Z0-9]{1,5}_[a-zA-Z0-9]+|_TYST1[12]_[a-zA-Z0-9]+|_TYZB[0-9]+_[a-zA-Z0-9]+|TUYATEC[a-zA-Z0-9_-]*)$/i;

/**
 * Classic OEM casing: `_TZ3000_abcdef` (prefix upper-ish, suffix lower).
 * @returns {string|null}
 */
function toClassicOem(mfr) {
  if (!mfr) return null;
  const s = String(mfr).trim();
  const m = s.match(/^(_TZ[A-Z0-9]{1,5}|_TYST1[12]|_TYZB[0-9]+)_(.+)$/i);
  if (!m) return null;
  return `${m[1].toUpperCase()}_${m[2].toLowerCase()}`;
}

/**
 * @returns {{ mfr: string, pid: string, key: string } | null}
 */
function normalizeSacredCouple(mfr, pid) {
  if (!mfr || !pid) return null;
  const pidStr = String(pid).trim().replace(/\\u0000/g, '').replace(/\0/g, '');
  if (!pidStr || pidStr.length > 32) return null;
  const pidUpper = pidStr.toUpperCase();
  if (!TS_PID_RX.test(pidUpper)) return null;
  const classic = toClassicOem(mfr) || String(mfr).trim();
  if (!TUYA_MFR_RX.test(classic)) return null;
  const mfrNorm = classic;
  return { mfr: mfrNorm, pid: pidUpper, key: `${mfrNorm.toUpperCase()}|${pidUpper}` };
}

function isValidSacredCouple(mfr, pid) {
  return normalizeSacredCouple(mfr, pid) != null;
}

/** Case variants for compose enrichment */
function oemCaseVariants(mfr) {
  const classic = toClassicOem(mfr) || String(mfr);
  return [...new Set([classic, classic.toLowerCase(), classic.toUpperCase()])];
}

/** Extract couples from free text (diag mail, issue body) — same-line only. */
function extractCouplesFromText(text) {
  const out = [];
  if (!text) return out;
  const seen = new Set();
  const push = (mfr, pid) => {
    const n = normalizeSacredCouple(mfr, pid);
    if (!n || seen.has(n.key)) return;
    seen.add(n.key);
    out.push(n);
  };

  // Explicit Homey interview blocks
  const blockRx = /manufacturerName:\s*(_[^\s,]+)[\s\S]{0,120}?modelId:\s*(TS\d{4}[A-Z0-9]?)/gi;
  let m;
  while ((m = blockRx.exec(text)) !== null) {
    push(m[1], m[2]);
  }

  // User free-form: Manufacturer: _TZE… Model: TS0601
  const freeRx = /manufacturer(?:Name)?\s*[:=]\s*(_[^\s,]+)[\s\S]{0,80}?model(?:Id)?\s*[:=]\s*(TS\d{4}[A-Z0-9]?)/gi;
  while ((m = freeRx.exec(text)) !== null) {
    push(m[1], m[2]);
  }

  // Inline couple: `_TZE284_xxx+TS0601` or `_TZE284_xxx + TS0601`
  const plusRx = /(_TZE?\d+[A-Z0-9]*_[a-zA-Z0-9]+)\s*\+\s*(TS\d{4}[A-Z0-9]?)/gi;
  while ((m = plusRx.exec(text)) !== null) {
    push(m[1], m[2]);
  }

  for (const line of String(text).split(/\r?\n/)) {
    const mfrs = line.match(/_TZE\d+_[a-zA-Z0-9]+|_TZ\d+_[a-zA-Z0-9]+|_TYZB\d+_[a-zA-Z0-9]+|_TYST\d+_[a-zA-Z0-9]+/gi) || [];
    const pids = line.match(/\bTS\d{4}[A-Z0-9]?\b/g) || [];
    if (mfrs.length === 1 && pids.length === 1) {
      push(mfrs[0], pids[0]);
    }
  }
  return out;
}

module.exports = {
  TS_PID_RX,
  TUYA_MFR_RX,
  toClassicOem,
  oemCaseVariants,
  normalizeSacredCouple,
  isValidSacredCouple,
  extractCouplesFromText,
};
