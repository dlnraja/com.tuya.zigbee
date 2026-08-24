'use strict';

/**
 * sacred-couple-pair.js (P2231 / P2232)
 * Shared validation for manufacturerName + productId (never mfr-only, never invent pid).
 * Supports exotic OEM forms: HOBEIAN, ZG-*, SNZB-*, _TZ3218_, _TZE608_, etc.
 */

const TS_PID_RX = /^TS\d{4}[A-Z0-9]?$/i;
/** Exotic but real Zigbee modelIds seen in interviews / Blakadder / Z2M */
const EXOTIC_PID_RX = /^(ZG-[\w-]+|SNZB-[\w-]+|RH\d{3,4}[A-Z]?|CS-[\w-]+|SM\w{2,}|FUT\d{3}Z?|HG\d+|SMA\d+\w*)$/i;

const TUYA_MFR_RX = /^(_TZ[A-Z0-9]{1,5}_[a-zA-Z0-9]+|_TYST1[12]_[a-zA-Z0-9]+|_TYZB[0-9]+_[a-zA-Z0-9]+|TUYATEC[a-zA-Z0-9_-]*)$/i;
/** Brand-as-mfr exotics (HOBEIAN soil/radar, etc.) */
const EXOTIC_MFR_RX = /^(HOBEIAN|eWeLink|LUMI|Xiaomi|IKEA|Philips|Third\s*Reality)$/i;

function isValidPid(pid) {
  const p = String(pid || '').trim();
  if (!p || p.length > 48) return false;
  return TS_PID_RX.test(p) || EXOTIC_PID_RX.test(p);
}

function isValidMfr(mfr) {
  const m = String(mfr || '').trim();
  if (!m) return false;
  return TUYA_MFR_RX.test(m) || EXOTIC_MFR_RX.test(m);
}

/**
 * Classic OEM casing: `_TZ3000_abcdef` (prefix upper-ish, suffix lower).
 */
function toClassicOem(mfr) {
  if (!mfr) return null;
  const s = String(mfr).trim();
  if (/^HOBEIAN$/i.test(s)) return 'HOBEIAN';
  if (EXOTIC_MFR_RX.test(s)) return s;
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
  if (!isValidPid(pidStr)) return null;
  const classic = toClassicOem(mfr) || String(mfr).trim();
  if (!isValidMfr(classic)) return null;
  const pidNorm = TS_PID_RX.test(pidStr) ? pidStr.toUpperCase() : pidStr;
  return { mfr: classic, pid: pidNorm, key: `${classic.toUpperCase()}|${pidNorm.toUpperCase()}` };
}

function isValidSacredCouple(mfr, pid) {
  return normalizeSacredCouple(mfr, pid) != null;
}

function oemCaseVariants(mfr) {
  const classic = toClassicOem(mfr) || String(mfr);
  if (EXOTIC_MFR_RX.test(classic)) return [classic];
  return [...new Set([classic, classic.toLowerCase(), classic.toUpperCase()])];
}

/** Extract couples from free text (diag mail, issue body, interview notes). */
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

  const blockRx = /manufacturerName:\s*(_[^\s,]+|[A-Za-z][A-Za-z0-9_-]*)[\s\S]{0,120}?modelId:\s*([A-Za-z0-9][\w.-]*)/gi;
  let m;
  while ((m = blockRx.exec(text)) !== null) push(m[1], m[2]);

  const freeRx = /manufacturer(?:Name)?\s*[:=]\s*(_[^\s,]+|[A-Za-z][A-Za-z0-9_-]*)[\s\S]{0,80}?model(?:Id)?\s*[:=]\s*([A-Za-z0-9][\w.-]*)/gi;
  while ((m = freeRx.exec(text)) !== null) push(m[1], m[2]);

  const plusRx = /(_TZE?\d+[A-Z0-9]*_[a-zA-Z0-9]+|HOBEIAN)\s*\+\s*(TS\d{4}[A-Z0-9]?|ZG-[\w-]+)/gi;
  while ((m = plusRx.exec(text)) !== null) push(m[1], m[2]);

  for (const line of String(text).split(/\r?\n/)) {
    const mfrs = line.match(/_TZE\d+_[a-zA-Z0-9]+|_TZ\d+[A-Z0-9]*_[a-zA-Z0-9]+|_TYZB\d+_[a-zA-Z0-9]+|_TYST\d+_[a-zA-Z0-9]+|HOBEIAN/gi) || [];
    const pids = line.match(/\bTS\d{4}[A-Z0-9]?\b|\bZG-[\w-]+\b|\bSNZB-[\w-]+\b/g) || [];
    if (mfrs.length === 1 && pids.length === 1) push(mfrs[0], pids[0]);
  }
  return out;
}

module.exports = {
  TS_PID_RX,
  EXOTIC_PID_RX,
  TUYA_MFR_RX,
  EXOTIC_MFR_RX,
  isValidPid,
  isValidMfr,
  toClassicOem,
  oemCaseVariants,
  normalizeSacredCouple,
  isValidSacredCouple,
  extractCouplesFromText,
};
