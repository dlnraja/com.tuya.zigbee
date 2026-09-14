'use strict';

/**
 * sacred-couple-pair.js (P2231 / P2232 / P2496)
 * Shared validation for manufacturerName + productId (never mfr-only, never invent pid).
 * Supports exotic OEM forms: HOBEIAN, ZG-*, SNZB-*, _TZ3218_, _TZE608_, etc.
 *
 * P2496 identity map (Homey SDK3):
 *   productId (compose) === modelId (Zigbee interview) === pid (internal shorthand)
 *   productName(s) = catalog alias — NEVER a pairing key
 */

/** Tuya modelIds: TS0601, TS0041, TS004F, TS011F, TS0505B, TS130F, … */
const TS_PID_RX = /^TS\d{3,4}[A-Z0-9]?$/i;
/** Exotic but real Zigbee modelIds seen in interviews / Blakadder / Z2M */
const EXOTIC_PID_RX = /^(ZG-[\w-]+|SNZB-[\w-]+|RH\d{3,4}[A-Z]?|CS-[\w-]+|SM\w{2,}|FUT\d{3}Z?|HG\d+|SMA\d+\w*|3315-S)$/i;

const TUYA_MFR_RX = /^(_TZ[A-Z0-9]{1,5}_[a-zA-Z0-9]+|_TYST1[12]_[a-zA-Z0-9]+|_TYZB[0-9]+_[a-zA-Z0-9]+|TUYATEC[a-zA-Z0-9_-]*)$/i;
/** Brand-as-mfr exotics (HOBEIAN soil/radar, etc.) */
const EXOTIC_MFR_RX = /^(HOBEIAN|eWeLink|LUMI|Xiaomi|IKEA|Philips|Third\s*Reality)$/i;

/** Keys that must NEVER be treated as Zigbee productId / pid */
const CATALOG_ALIAS_KEYS = new Set([
  'productname',
  'productnames',
  'product_name',
  'devicenames',
  'whitelabels',
  'z2mmodels',
  'z2mmodel',
  'sku',
  'retail',
]);

function isCatalogAliasKey(key) {
  const k = String(key || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return CATALOG_ALIAS_KEYS.has(k);
}

/**
 * Pick Homey productId (= Zigbee modelId = internal pid) from heterogeneous objects.
 * Never returns productName / catalog aliases.
 */
function pickProductId(obj) {
  if (obj == null) return null;
  if (typeof obj === 'string' || typeof obj === 'number') {
    const s = String(obj).trim();
    return s || null;
  }
  const candidates = [
    obj.productId,
    obj.pid,
    obj.modelId,
    obj.modelID,
    obj.zb_model_id,
    typeof obj.getSetting === 'function' ? obj.getSetting('zb_model_id') : null,
    obj.zclNode && obj.zclNode.modelId,
    obj.node && obj.node.modelId,
  ];
  try {
    const data = typeof obj.getData === 'function' ? obj.getData() : obj.data;
    if (data) {
      candidates.push(data.productId, data.modelId, data.pid);
    }
  } catch (_e) { /* soft */ }
  for (const c of candidates) {
    if (c == null || c === '') continue;
    if (Array.isArray(c)) {
      const first = c.map(String).map((s) => s.trim()).find(Boolean);
      if (first) return first;
      continue;
    }
    const s = String(c).trim();
    if (s) return s;
  }
  return null;
}

/**
 * Pick Homey manufacturerName from heterogeneous objects.
 */
function pickManufacturerName(obj) {
  if (obj == null) return null;
  if (typeof obj === 'string') {
    const s = obj.trim();
    return s || null;
  }
  const candidates = [
    obj.manufacturerName,
    obj.mfr,
    obj.manufacturer,
    obj.zb_manufacturer_name,
    typeof obj.getSetting === 'function' ? obj.getSetting('zb_manufacturer_name') : null,
    obj.zclNode && obj.zclNode.manufacturerName,
    obj.node && obj.node.manufacturerName,
  ];
  try {
    const data = typeof obj.getData === 'function' ? obj.getData() : obj.data;
    if (data) {
      candidates.push(data.manufacturerName, data.mfr);
    }
  } catch (_e) { /* soft */ }
  for (const c of candidates) {
    if (c == null || c === '') continue;
    if (Array.isArray(c)) {
      const first = c.map(String).map((s) => s.trim()).find(Boolean);
      if (first) return first;
      continue;
    }
    const s = String(c).trim();
    if (s) return s;
  }
  return null;
}

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
 * @returns {{ mfr: string, pid: string, key: string, productId: string } | null}
 */
function normalizeSacredCouple(mfr, pid) {
  // Allow passing a device-like object as first arg
  if (mfr && typeof mfr === 'object' && pid == null) {
    const o = mfr;
    mfr = pickManufacturerName(o);
    pid = pickProductId(o);
  }
  if (!mfr || !pid) return null;
  const pidStr = String(pid).trim().replace(/\\u0000/g, '').replace(/\0/g, '');
  if (!isValidPid(pidStr)) return null;
  const classic = toClassicOem(mfr) || String(mfr).trim();
  if (!isValidMfr(classic)) return null;
  const pidNorm = TS_PID_RX.test(pidStr) ? pidStr.toUpperCase() : pidStr;
  return {
    mfr: classic,
    pid: pidNorm,
    productId: pidNorm,
    key: `${classic.toUpperCase()}|${pidNorm.toUpperCase()}`,
  };
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
  CATALOG_ALIAS_KEYS,
  isCatalogAliasKey,
  pickProductId,
  pickManufacturerName,
  isValidPid,
  isValidMfr,
  toClassicOem,
  oemCaseVariants,
  normalizeSacredCouple,
  isValidSacredCouple,
  extractCouplesFromText,
};
