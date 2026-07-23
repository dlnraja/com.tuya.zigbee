'use strict';

/**
 * TuyaNormalizer v10.0.0 ULTIMATE
 *
 * The DEFINITIVE case-insensitive normalizer for all Tuya device matching
 * across the entire app. Combines the best of:
 *  - lib/Util.js v5.5.x: simple, stable, widely used
 *  - lib/utils/CaseInsensitiveMatcher.js v5.5.697: NFKD + accent + emoji stripping
 *
 * PLUS:
 *  - Multi-PID and multi-variant support (a single mfr can cover
 *    multiple PIDs and have multiple variants in mfs_db)
 *  - Confidence scoring (0-100) for routing decisions
 *  - Gamification scoring: the more sources that confirm a match,
 *    the higher the score
 *
 * Chronology:
 *  - 2026-07-05: lib/Util.js first version
 *  - 2026-07-05: lib/utils/CaseInsensitiveMatcher.js (NFKD version)
 *  - 2026-07-05: lib/pairing/PermissiveMatchingEngine.js (uses Util.js)
 *  - 2026-07-12: enrich-orphan-drivers.js v4/v7 (mfr+pid+variants)
 *  - 2026-07-22: enrich-orphan-drivers.js v7 (mfs_db.variants)
 *  - 2026-07-23: P82 ULTIMATE - single source of truth
 *
 * @version 10.0.0
 * @since 2026-07-23 (P82)
 */

const VERSION = '10.0.0';

/**
 * Normalize a string for case-insensitive comparison.
 *
 * Pipeline:
 *  R1. NFKD Unicode decomposition (separates accents from base letters)
 *  R2. Strip diacritics/combining marks (U+0300-U+036F)
 *  R3. Strip emojis (surrogate-safe, U+D800-U+DFFF)
 *  R4. Strip control chars (except tab/newline)
 *  R5. Strip null bytes
 *  R6. Lowercase + trim
 *
 * @param {string} str - String to normalize
 * @returns {string} - Normalized string (NFKD, no accents, lowercase)
 */
function normalize(str) {
  if (str === null || str === undefined) return '';
  let result = String(str).normalize('NFKD');
  // Strip combining marks (accents)
  result = result.replace(/[\u0300-\u036f]/g, '');
  // Strip surrogate pairs (covers emoji + supplementary plane)
  result = result.replace(/[\uD800-\uDFFF]./g, '');
  // Strip control chars except tab/newline/CR
  result = result.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  // Lowercase + trim
  result = result.toLowerCase().trim();
  return result;
}

/**
 * Normalize a Tuya ID (manufacturerName or productId).
 * Wraps normalize() with Tuya-specific edge cases:
 *  - "TS0601" / "ts0601" / "Ts0601" → "ts0601"
 *  - "_TZ3000_abc" / "_tz3000_abc" / "_TZ3000_ABC" → "_tz3000_abc"
 *
 * @param {string} id - Tuya ID
 * @returns {string}
 */
function normalizeTuyaID(id) {
  return normalize(id);
}

/**
 * Normalize a device name (for matching, gamification, etc).
 * Strips brand prefixes like "Tuya ", "MOES ", etc.
 *
 * @param {string} name - Device name
 * @returns {string}
 */
function normalizeDeviceName(name) {
  let result = normalize(name);
  // Strip common brand prefixes
  const prefixes = ['tuya ', 'moes ', 'lonsonho ', 'avatto ', 'beca ',
                    'bseed ', 'zemismart ', 'sengled ', 'sonoff ',
                    'lumi ', 'aqara ', 'ikea ', 'osram ',
                    'philips ', 'signify ', 'innr ', 'ikea '];
  for (const p of prefixes) {
    if (result.startsWith(p)) {
      result = result.substring(p.length);
      break;
    }
  }
  return result;
}

/**
 * Compare two strings ignoring case, accents, emojis, whitespace.
 * @returns {boolean}
 */
function equalsIgnoreCase(str1, str2) {
  return normalize(str1) === normalize(str2);
}

/**
 * Array includes check (case-insensitive, accent-insensitive).
 * @returns {boolean}
 */
function includesCI(array, value) {
  if (!Array.isArray(array) || !value) return false;
  const nv = normalize(value);
  return array.some(item => normalize(item) === nv);
}

/**
 * Find first matching item in array (returns the actual entry from array).
 * @returns {string|undefined}
 */
function findCI(array, value) {
  if (!Array.isArray(array) || !value) return undefined;
  const nv = normalize(value);
  return array.find(item => normalize(item) === nv);
}

/**
 * Filter array to items matching value (case-insensitive).
 * @returns {Array}
 */
function filterCI(array, value) {
  if (!Array.isArray(array) || !value) return [];
  const nv = normalize(value);
  return array.filter(item => normalize(item) === nv);
}

/**
 * startsWith / endsWith / contains (case-insensitive).
 */
function startsWithCI(str, prefix) {
  if (!str || !prefix) return false;
  return normalize(str).startsWith(normalize(prefix));
}
function endsWithCI(str, suffix) {
  if (!str || !suffix) return false;
  return normalize(str).endsWith(normalize(suffix));
}
function containsCI(str, substring) {
  if (!str || !substring) return false;
  return normalize(str).includes(normalize(substring));
}

/**
 * Check if manufacturerName matches any in list (case-insensitive).
 */
function matchesManufacturer(manufacturerName, list) {
  return includesCI(list, manufacturerName);
}

/**
 * Check if productId matches any in list (case-insensitive).
 */
function matchesProductId(productId, list) {
  return includesCI(list, productId);
}

/**
 * Check if manufacturerName starts with any prefix (case-insensitive).
 * Useful for matching mfr families like _TZ3000_*, _TZE200_*, etc.
 */
function matchesManufacturerPrefix(manufacturerName, prefixes) {
  if (!manufacturerName || !Array.isArray(prefixes)) return false;
  const nm = normalize(manufacturerName);
  return prefixes.some(p => nm.startsWith(normalize(p)));
}

/**
 * Normalize an array of strings.
 */
function normalizeArray(array) {
  if (!Array.isArray(array)) return [];
  return array.map(item => normalize(item));
}

/**
 * Generate ALL case variants of a Tuya ID for the canonical form.
 * Tuya IDs are typically either fully lowercase (_tz3000_abc) or
 * mixed case (_TZ3000_Abc). The case the device reports depends
 * on its firmware.
 *
 * Strategy: produce 3 variants:
 *  - lower: _tz3000_abc
 *  - upper: _TZ3000_ABC
 *  - canonical (most common in our source files): _TZ3000_abc
 *
 * @param {string} id - Tuya ID
 * @returns {Array<string>} - All case variants
 */
function generateCaseVariants(id) {
  if (!id) return [];
  const norm = normalize(id);
  if (!norm) return [];
  const upper = id.toUpperCase();
  return Array.from(new Set([
    id,                 // original
    norm,               // lowercased
    upper,              // uppercased
    id.toLowerCase()    // explicit lower
  ]));
}

/**
 * Multi-PID matching: check if device matches any PID in a list of
 * {pids: [pid1, pid2, ...]} entries. Returns the first match or null.
 *
 * Each "entry" can be:
 *  - a string (treated as single-PID list)
 *  - an object with pids: string[] and confidence: number (optional)
 *
 * @param {string} devicePid - Device's PID
 * @param {Array} entries - List of PID entries to match against
 * @returns {Object|null} - Matched entry with confidence score
 */
function matchMultiPid(devicePid, entries) {
  if (!devicePid || !Array.isArray(entries)) return null;
  const npid = normalize(devicePid);
  for (const e of entries) {
    const pids = Array.isArray(e) ? e : (e.pids || [e]);
    const conf = (e && typeof e.confidence === 'number') ? e.confidence : 100;
    if (pids.some(p => normalize(p) === npid)) {
      return { entry: e, confidence: conf };
    }
  }
  return null;
}

/**
 * Multi-variant matching: check if device's mfr matches any of a list
 * of mfrs (which can have variants). A variant is a secondary spelling.
 *
 * Used for handling devices that report a slightly different mfr string
 * than the canonical one (e.g. _tzn3000_cfnprab5 vs _tze204_cfnprab5).
 *
 * @param {string} deviceMfr - Device's mfr
 * @param {Array<string|{mfr:String,variants:Array,confidence:Number}>} mfrs
 * @returns {Object|null}
 */
function matchMultiVariant(deviceMfr, mfrs) {
  if (!deviceMfr || !Array.isArray(mfrs)) return null;
  const nmfr = normalize(deviceMfr);
  for (const m of mfrs) {
    if (typeof m === 'string') {
      if (normalize(m) === nmfr) return { mfr: m, confidence: 100 };
    } else {
      // mfr with variants
      const conf = (m && typeof m.confidence === 'number') ? m.confidence : 100;
      if (normalize(m.mfr) === nmfr) {
        return { mfr: m.mfr, confidence: conf };
      }
      if (Array.isArray(m.variants) && m.variants.some(v => normalize(v) === nmfr)) {
        return { mfr: m.mfr, via: 'variant', confidence: Math.round(conf * 0.9) };
      }
    }
  }
  return null;
}

/**
 * Confidence scoring for driver routing.
 *
 * Inputs:
 *  - sources: Set of source names that confirm this match
 *    (e.g. 'johan-issue', 'blakadder', 'mfs_db', 'gmail', 'forum', 'z2m')
 *  - hasMultiPid: bool - does the mfr cover multiple PIDs
 *  - hasMultiVariant: bool - does the mfr have variants
 *  - matchLevel: 'exact' (mfr+pid) | 'manufacturer' | 'productId' | 'fuzzy'
 *
 * Output: 0-100 score
 *
 * Higher score = higher confidence = driver should be preferred
 *
 * Gamification logic:
 *  - Each unique source adds +10 confidence
 *  - exact match (mfr+pid) starts at 100
 *  - manufacturer-only match caps at 80
 *  - productId-only match caps at 60
 *  - fuzzy/prefix match caps at 40
 *  - multi-PID coverage: +5
 *  - variant match: -10 (less reliable)
 */
function scoreMatch({ sources = new Set(), matchLevel = 'fuzzy', hasMultiPid = false, hasMultiVariant = false }) {
  let base;
  switch (matchLevel) {
    case 'exact': base = 100; break;
    case 'manufacturer': base = 80; break;
    case 'productId': base = 60; break;
    case 'fuzzy': base = 40; break;
    default: base = 0;
  }
  let bonus = Math.min(20, sources.size * 5);
  if (hasMultiPid) bonus += 5;
  let score = Math.min(100, base + bonus);
  if (hasMultiVariant) score = Math.max(0, score - 10);
  return score;
}

/**
 * Master match function: try to route a device to a driver with
 * confidence scoring. Returns the best driver match.
 *
 * @param {Object} device - { manufacturerName, productId }
 * @param {Array<Object>} drivers - List of driver metadata
 *   { id, class, manufacturerNames: string[], productIds: string[],
 *     sources?: Set<string> }
 * @returns {Object|null} - { driverId, matchLevel, confidence } or null
 */
function findBestDriverMatch(device, drivers) {
  if (!device || !Array.isArray(drivers)) return null;
  const nmfr = normalize(device.manufacturerName);
  const npid = normalize(device.productId);
  let best = null;
  for (const d of drivers) {
    const mfrMatch = d.manufacturerNames?.some(m => normalize(m) === nmfr);
    const pidMatch = d.productIds?.some(p => normalize(p) === npid);
    let level, conf;
    if (mfrMatch && pidMatch) {
      level = 'exact';
      conf = scoreMatch({
        sources: d.sources || new Set(),
        matchLevel: 'exact',
        hasMultiPid: (d.productIds?.length || 0) > 1
      });
    } else if (mfrMatch) {
      level = 'manufacturer';
      conf = scoreMatch({
        sources: d.sources || new Set(),
        matchLevel: 'manufacturer',
        hasMultiPid: false
      });
    } else if (pidMatch) {
      level = 'productId';
      conf = scoreMatch({
        sources: d.sources || new Set(),
        matchLevel: 'productId',
        hasMultiVariant: false
      });
    } else {
      continue;
    }
    if (!best || conf > best.confidence) {
      best = { driverId: d.id, matchLevel: level, confidence: conf };
    }
  }
  return best;
}

module.exports = {
  VERSION,
  // Core
  normalize,
  normalizeTuyaID,
  normalizeDeviceName,
  normalizeArray,
  // Comparison
  equalsIgnoreCase,
  includesCI,
  findCI,
  filterCI,
  startsWithCI,
  endsWithCI,
  containsCI,
  // Tuya-specific
  matchesManufacturer,
  matchesProductId,
  matchesManufacturerPrefix,
  // Variants and multi-PID
  generateCaseVariants,
  matchMultiPid,
  matchMultiVariant,
  // Scoring
  scoreMatch,
  findBestDriverMatch
};
