'use strict';

/**
 * P3027 — case variants that real devices never send.
 *
 * WHY: Homey pairing compares manufacturerName/productId byte-exact (Athom SDK
 * Zigbee guide, homey-lib, forum 151483, our incidents P2348/GH#570), and Athom
 * counts every exact string in the mfr x pid cartesian. Scripts used to mint
 * three spellings per Tuya id (TuyaNormalizer.pairingCaseVariants: lower, UPPER,
 * canonical) on the unsourced idea that "the case depends on firmware".
 * Exact sources say otherwise (P3027 census, docs/knowledge/KB/CASE_VARIANTS.md):
 * Z2M 2399 Tuya ids (matched with ===), ZHA 530, deCONZ 407, Johan 595 and
 * 96 ids read from Homey interviews/diags all use the wire shape
 * "_TZ3000_" (upper prefix) + suffix as the chip sends it (lowercase in 99.8 %,
 * a few genuine mixed-case ids). Not one all-lowercase "_tz3000_xxx" or
 * all-upper "_TZ3000_XXXX" form was ever seen (outliers are in
 * data/case-variant-wire-evidence.json). Tuya modelIds are always upper "TS0601".
 *
 * So, in the PUBLISH manifest only, a Tuya-shaped string that is not in wire
 * shape is dropped when the same case group already carries a wire-shaped
 * sibling (the real device string stays). Never dropped: exact pins (SSOT and
 * last Test package), evidence outliers, padded strings, brands (HOBEIAN,
 * eWeLink...), groups without a wire-shaped sibling. Sources are untouched and
 * runtime lookup stays case-insensitive (TuyaNormalizer.normalize).
 */

const fs = require('fs');
const path = require('path');

// Tuya manufacturerName: _T<prefix>_<suffix>, no spaces (padded forms never match).
const TUYA_MFR_RE = /^(_[Tt][A-Za-z0-9]{1,12}_)([A-Za-z0-9]{4,})$/;
// Tuya modelId: TS0601, TS004F, TS0502B, TS130F, TS0215A...
const TUYA_PID_RE = /^TS[0-9A-Za-z]{3,5}$/i;

function isTuyaMfr(value) {
  return typeof value === 'string' && TUYA_MFR_RE.test(value);
}

function isTuyaPid(value) {
  return typeof value === 'string' && TUYA_PID_RE.test(value);
}

/**
 * Wire shape of a Tuya manufacturerName: prefix all upper and the suffix not
 * forced to all-upper (a suffix without letters is fine).
 */
function isWireShapedMfr(value) {
  const m = TUYA_MFR_RE.exec(String(value));
  if (!m) return false;
  const [, prefix, suffix] = m;
  if (prefix !== prefix.toUpperCase()) return false;
  const hasLetter = /[A-Za-z]/.test(suffix);
  if (hasLetter && suffix === suffix.toUpperCase()) return false;
  return true;
}

function isWireShapedPid(value) {
  return isTuyaPid(value) && value === value.toUpperCase();
}

function defaultEvidencePath(repoRoot) {
  return path.join(repoRoot || path.join(__dirname, '..', '..'), 'data', 'case-variant-wire-evidence.json');
}

/** Exact strings seen in reliable sources despite an unusual case shape. */
function loadWireEvidence(repoRoot, file) {
  const target = file || defaultEvidencePath(repoRoot);
  const out = new Set();
  try {
    const raw = JSON.parse(fs.readFileSync(target, 'utf8'));
    for (const key of ['manufacturerName', 'productId']) {
      for (const item of raw[key] || []) {
        const v = item && typeof item === 'object' ? item.value : item;
        if (typeof v === 'string' && v) out.add(v);
      }
    }
  } catch {
    // Missing file: no outliers known, the structural rule still applies.
  }
  return out;
}

/**
 * Drop never-emitted case forms from one list.
 * @param {string[]} values exact strings (already unique)
 * @param {'mfr'|'pid'} kind
 * @param {Set<string>} keepExact strings that must never be dropped
 * @returns {{ kept: string[], dropped: string[] }}
 */
function dropNeverEmittedCaseForms(values, kind, keepExact = new Set()) {
  const isTuya = kind === 'pid' ? isTuyaPid : isTuyaMfr;
  const isWire = kind === 'pid' ? isWireShapedPid : isWireShapedMfr;
  const list = Array.isArray(values) ? values : [];
  const wireKeys = new Set();
  for (const v of list) {
    if (typeof v === 'string' && isWire(v)) wireKeys.add(v.toLowerCase());
  }
  const kept = [];
  const dropped = [];
  for (const v of list) {
    if (typeof v === 'string'
        && isTuya(v)
        && !isWire(v)
        && !keepExact.has(v)
        && wireKeys.has(v.toLowerCase())) {
      dropped.push(v);
    } else {
      kept.push(v);
    }
  }
  return { kept, dropped };
}

module.exports = {
  TUYA_MFR_RE,
  TUYA_PID_RE,
  isTuyaMfr,
  isTuyaPid,
  isWireShapedMfr,
  isWireShapedPid,
  loadWireEvidence,
  dropNeverEmittedCaseForms,
};
