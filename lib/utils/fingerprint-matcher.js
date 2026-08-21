'use strict';

/**
 * fingerprint-matcher v1.0.0 (P92 heuristic matching)
 *
 * Heuristic, case-insensitive matcher for Tuya manufacturerName / productId
 * fingerprints. Complements lib/utils/TuyaNormalizer.js (P82, exact
 * case-insensitive equality) with TOLERANT matching:
 *
 *  - exact                       -> 1.00
 *  - normalized (case/parasites) -> 0.95
 *  - interchangeable prefix      -> 0.90  (_TZE200_/_TZE204_/_TZE284_/_TYST11_)
 *  - mfr exact + pid unknown     -> 0.70
 *  - edit distance <= 2 (suffix) -> 0.60  (obscure variants / 1-char typos)
 *
 * Plus fallbacks:
 *  - mfr unknown + pid known     -> most frequent driverHint for that pid
 *  - nothing                     -> top-k best candidates
 *
 * Verbose logging (raw input, normalized form, candidates, retained score)
 * is enabled via opts.verbose, opts.log, or env TUYA_FP_VERBOSE=1.
 *
 * @version 1.0.0
 * @since 2026-07-28
 */

const TU = require('./TuyaNormalizer');

const VERSION = '1.0.0';

// Score constants (configurable via opts.scores override)
const SCORES = {
  exact: 1.0,
  normalized: 0.95,
  prefixVariant: 0.9,
  mfrOnly: 0.7,
  fuzzySuffix: 0.6,
};

const DEFAULT_THRESHOLD = 0.6;
const MAX_EDIT_DISTANCE = 2;

/**
 * Known Tuya manufacturerName prefixes. Interchangeable groups share the
 * same suffix namespace: a device reported as _TZE204_abc is the same
 * hardware as _TZE200_abc / _TZE284_abc (and usually _TYST11_abc).
 */
const PREFIX_GROUPS = [
  ['_tze200', '_tze204', '_tze284', '_tze608', '_tyst11'],
  ['_tz3000', '_tz3002'],
  ['_tz3210', '_tz3212'],
  ['_tyzb01', '_tyzb02'],
];

const KNOWN_PREFIXES = new Set([
  '_tze200', '_tze204', '_tze284', '_tze608', '_tyst11',
  '_tz3000', '_tz3002', '_tz3210', '_tz3212', '_tz3290',
  '_tyzb01', '_tyzb02', '_tzb210',
]);

// ---------------------------------------------------------------------------
// VERBOSE LOGGING
// ---------------------------------------------------------------------------

function _envVerbose() {
  try {
    return process.env.TUYA_FP_VERBOSE === '1' || process.env.TUYA_FP_VERBOSE === 'true';
  } catch (_err) {
    return false;
  }
}

function _makeLogger(opts = {}) {
  const verbose = opts.verbose !== undefined ? Boolean(opts.verbose) : _envVerbose();
  const sink = typeof opts.log === 'function' ? opts.log
    : (typeof console !== 'undefined' && console.log ? console.log.bind(console) : null);
  return (msg, data) => {
    if (!verbose || !sink) {return;}
    if (data !== undefined) {
      sink(`[fingerprint-matcher] ${msg}`, data);
    } else {
      sink(`[fingerprint-matcher] ${msg}`);
    }
  };
}

// ---------------------------------------------------------------------------
// NORMALIZATION
// ---------------------------------------------------------------------------

// Character class regexes (built from escapes to keep the source pure ASCII).
// TU.normalize already handles NFKD, combining marks, supplementary plane
// and C0/C1 control chars; these cover what it does not.
const UNICODE_SPACES_RE = new RegExp('[\\u00A0\\u1680\\u2000-\\u200A\\u202F\\u205F\\u3000]', 'g');
const ZERO_WIDTH_RE = new RegExp('[\\u200B-\\u200F\\u2060\\uFEFF]', 'g');
const DASH_DOTS_RE = new RegExp('[.\\-\\u2013\\u2014]+', 'g');

/**
 * Deep-clean a raw identifier: TuyaNormalizer base pipeline (NFKD,
 * diacritics, emojis, control chars, lowercase, trim) PLUS non-breaking
 * spaces, zero-width chars, BOM; unify separators (whitespace removed,
 * dots/dashes become underscores, repeated underscores merge).
 * @param {string} raw
 * @returns {string}
 */
function _deepClean(raw) {
  if (raw === null || raw === undefined) {return '';}
  let result = TU.normalize(raw);
  result = result.replace(UNICODE_SPACES_RE, ' ');
  result = result.replace(ZERO_WIDTH_RE, '');
  // Unify separators: whitespace and dots/dashes -> underscore
  result = result.replace(/\s+/g, '_');
  result = result.replace(DASH_DOTS_RE, '_');
  result = result.replace(/_+/g, '_');
  result = result.replace(/^_+|_+$/g, '');
  return result;
}

/**
 * Split a cleaned manufacturerName into { prefix, suffix }.
 * prefix keeps the leading underscore convention (`_tze200`), suffix is the
 * device-specific part (`vvmbj46n`). Shapes without separator return
 * prefix null.
 * @param {string} cleaned - output of _deepClean (no leading underscore)
 * @returns {{prefix: string|null, suffix: string}}
 */
function _splitMfr(cleaned) {
  if (!cleaned) {return { prefix: null, suffix: '' };}
  const withUnderscore = `_${cleaned}`;
  const idx = withUnderscore.indexOf('_', 1);
  if (idx === -1) {return { prefix: null, suffix: cleaned };}
  const prefix = withUnderscore.substring(0, idx);
  const suffix = withUnderscore.substring(idx + 1);
  // KNOWN_PREFIXES membership is not required: exotic families still get a
  // prefix/suffix split so suffix comparison keeps working.
  return { prefix, suffix };
}

/**
 * Normalize a manufacturerName for heuristic matching.
 * @param {string} raw
 * @returns {{key: string, prefix: string|null, suffix: string}}
 */
function normalizeMfr(raw) {
  const cleaned = _deepClean(raw);
  const { prefix, suffix } = _splitMfr(cleaned);
  const key = prefix ? `${prefix}_${suffix}` : cleaned;
  return { key, prefix, suffix };
}

/**
 * Normalize a productId / modelId for heuristic matching (uppercase form,
 * same parasite tolerance as normalizeMfr).
 * @param {string} raw
 * @returns {string}
 */
function normalizePid(raw) {
  return _deepClean(raw).toUpperCase();
}

/**
 * True when two prefixes belong to the same interchangeable group.
 */
function arePrefixesInterchangeable(prefixA, prefixB) {
  if (!prefixA || !prefixB) {return false;}
  if (prefixA === prefixB) {return true;}
  return PREFIX_GROUPS.some(group => group.includes(prefixA) && group.includes(prefixB));
}

// ---------------------------------------------------------------------------
// EDIT DISTANCE (bounded Levenshtein, early exit past maxDist)
// ---------------------------------------------------------------------------

function editDistance(a, b, maxDist = MAX_EDIT_DISTANCE) {
  if (a === b) {return 0;}
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > maxDist) {return maxDist + 1;}
  if (la === 0 || lb === 0) {return Math.max(la, lb);}

  let prev = new Array(lb + 1);
  let curr = new Array(lb + 1);
  for (let j = 0; j <= lb; j++) {prev[j] = j;}
  for (let i = 1; i <= la; i++) {
    curr[0] = i;
    let rowMin = curr[0];
    for (let j = 1; j <= lb; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      if (curr[j] < rowMin) {rowMin = curr[j];}
    }
    if (rowMin > maxDist) {return maxDist + 1;}
    const tmp = prev; prev = curr; curr = tmp;
  }
  return prev[lb];
}

/**
 * Char-count multiset of a string (Map char -> count). Used by the fuzzy
 * pre-filter.
 */
function _charCounts(str) {
  const counts = new Map();
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    counts.set(ch, (counts.get(ch) || 0) + 1);
  }
  return counts;
}

/**
 * Fixed-size char signature over [a-z0-9] + one catch-all bucket. Two
 * strings within edit distance d have a signature L1 distance <= 2d; the
 * check is a flat 37-iteration loop with zero allocation.
 */
function _charSignature(str) {
  const sig = new Int16Array(37);
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code >= 97 && code <= 122) {sig[code - 97] += 1;}        // a-z
    else if (code >= 48 && code <= 57) {sig[code - 48 + 26] += 1;} // 0-9
    else {sig[36] += 1;}
  }
  return sig;
}

/**
 * Allocation-free necessary condition for editDistance(a, b) <= maxDist.
 */
function _signatureWithin(sigA, sigB, maxDist) {
  let diff = 0;
  for (let i = 0; i < 37; i++) {
    diff += sigA[i] > sigB[i] ? sigA[i] - sigB[i] : sigB[i] - sigA[i];
    if (diff > 2 * maxDist) {return false;}
  }
  return true;
}

// ---------------------------------------------------------------------------
// KEY INDEX (lazy, per database object)
// ---------------------------------------------------------------------------

const _indexCache = new WeakMap();

/**
 * v10.12.0 (P92.77): live overlay provider — set by the app to a function
 * returning the LiveDataUpdater overlay ({mfr: {driverId, modelIds}}).
 * The overlay is consulted as an EXTRA tier AFTER local db tiers, only when
 * no local tier produced a winner above threshold. Local curated data
 * always wins by construction (overlay consulted last, lower score).
 */
let _overlayProvider = null;
function setOverlayProvider(fn) {
  _overlayProvider = typeof fn === 'function' ? fn : null;
}

/**
 * Build (once per db object) the normalized candidate index:
 *  - list:     [{ rawKey, norm: {key,prefix,suffix}, entry }]
 *  - rawMap:   raw key -> record (O(1) exact tier)
 *  - keyMap:   normalized key -> record (O(1) normalized tier, first wins)
 *  - suffixMap: suffix -> records[] (O(1) prefix-variant tier, fuzzy scan base)
 * db may be a plain object map (key -> entry) or an array of keys.
 */
function _buildIndex(db) {
  if (_indexCache.has(db)) {return _indexCache.get(db);}
  const entries = [];
  const rawMap = new Map();
  const keyMap = new Map();
  const suffixMap = new Map();
  const suffixByLength = new Map(); // len -> suffix[] (fuzzy scan buckets)
  const suffixCounts = new Map();   // suffix -> {char:count} (no-alloc pre-filter)
  if (db && typeof db === 'object') {
    const push = (record) => {
      entries.push(record);
      if (!rawMap.has(record.rawKey)) {rawMap.set(record.rawKey, record);}
      if (record.norm.key && !keyMap.has(record.norm.key)) {keyMap.set(record.norm.key, record);}
      const suffix = record.norm.suffix;
      if (suffix) {
        let bucket = suffixMap.get(suffix);
        if (!bucket) {
          bucket = [];
          suffixMap.set(suffix, bucket);
          if (!suffixCounts.has(suffix)) {suffixCounts.set(suffix, _charSignature(suffix));}
          const lenBucket = suffixByLength.get(suffix.length);
          if (lenBucket) {lenBucket.push(suffix);} else {suffixByLength.set(suffix.length, [suffix]);}
        }
        bucket.push(record);
      }
    };
    if (Array.isArray(db)) {
      for (const rawKey of db) {
        if (typeof rawKey !== 'string' || !rawKey) {continue;}
        push({ rawKey, norm: normalizeMfr(rawKey), entry: undefined });
      }
    } else {
      for (const rawKey of Object.keys(db)) {
        push({ rawKey, norm: normalizeMfr(rawKey), entry: db[rawKey] });
      }
    }
  }
  const index = { list: entries, rawMap, keyMap, suffixMap, suffixByLength, suffixCounts };
  _indexCache.set(db, index);
  return index;
}

/** Drop the cached index for a db (call after mutating the db). */
function invalidateIndex(db) {
  if (db && (typeof db === 'object')) {
    _indexCache.delete(db);
    _resultCache.delete(db);
    _pidCache.delete(db);
  }
}

// ---------------------------------------------------------------------------
// RESULT MEMOIZATION (per db object, bounded)
// The matcher runs on hot paths (ProbabilisticDeviceDetector votes once per
// source per device); identical (mfr, pid) queries repeat constantly, so each
// db gets its own bounded result map. null results are cached too.
// ---------------------------------------------------------------------------

const _resultCache = new WeakMap(); // db -> Map<'mfr|pid', result|null>
const _pidCache = new WeakMap();    // db -> Map<pid, suggestion|null>
const MAX_CACHE_ENTRIES = 2000;

function _memoGet(cache, db, key) {
  const bucket = cache.get(db);
  if (!bucket) {return { hit: false };}
  if (!bucket.has(key)) {return { hit: false };}
  return { hit: true, value: bucket.get(key) };
}

function _memoSet(cache, db, key, value) {
  let bucket = cache.get(db);
  if (!bucket) {
    bucket = new Map();
    cache.set(db, bucket);
  }
  if (bucket.size >= MAX_CACHE_ENTRIES) {bucket.clear();} // simple bounded reset
  bucket.set(key, value);
}

// ---------------------------------------------------------------------------
// MAIN MATCHER
// ---------------------------------------------------------------------------

/**
 * Score a (mfr, pid) pair against a fingerprint database.
 *
 * @param {string} mfr - raw manufacturerName as reported by the device
 * @param {string} pid - raw productId / modelId (may be null/empty)
 * @param {Object|Array<string>} db - fingerprint map (key -> entry) or key list.
 *        Entries may expose `modelIds: string[]` for the mfr-only scoring rule.
 * @param {Object} [opts]
 * @param {number} [opts.threshold=0.6] - minimum score to return a match
 * @param {number} [opts.topK=5] - number of fallback candidates to return
 * @param {boolean} [opts.verbose] - force verbose logging on/off
 * @param {function} [opts.log] - log sink
 * @returns {{key: string, entry: *, score: number, matchType: string,
 *            candidates: Array}|null}
 */
function matchFingerprint(mfr, pid, db, opts = {}) {
  const log = _makeLogger(opts);
  const scores = { ...SCORES, ...(opts.scores || {}) };
  const threshold = typeof opts.threshold === 'number' ? opts.threshold : DEFAULT_THRESHOLD;
  const topK = typeof opts.topK === 'number' ? opts.topK : 5;

  const rawMfr = mfr === null || mfr === undefined ? '' : String(mfr);
  const norm = normalizeMfr(rawMfr);
  const npid = pid ? normalizePid(pid) : '';

  log('match attempt', { rawMfr, rawPid: pid || null, normalized: norm.key, prefix: norm.prefix, suffix: norm.suffix, pid: npid || null });

  if (!norm.key) {
    log('empty manufacturerName after normalization - no match');
    return null;
  }

  // P146: community misattribution registry — force sacred couple → canonical driver
  // (master dynamic). Local curated compose must still list the couple statically.
  try {
    const Misattr = require('../pairing/UserMisattributionRegistry');
    const forced = Misattr.lookup(rawMfr, pid);
    if (forced && forced.canonicalDriver) {
      const entry = Misattr.toMatcherEntry(forced);
      const result = {
        key: forced.mfr[0] || rawMfr,
        entry,
        score: 1.0,
        matchType: 'user_misattribution_registry',
        candidates: [{ key: forced.mfr[0] || rawMfr, entry, score: 1.0, matchType: 'user_misattribution_registry' }],
      };
      log('misattribution registry force', { caseId: forced.id, driverId: forced.canonicalDriver, pid: npid || null });
      return result;
    }
  } catch (_err) {
    /* registry optional */
  }

  // Memoized fast path (only for default scoring options so that custom
  // thresholds/scores always get a fresh computation).
  const cacheable = db && typeof db === 'object' && !opts.scores &&
    threshold === DEFAULT_THRESHOLD && topK === 5;
  const cacheKey = cacheable ? `${rawMfr}|${npid}` : null;
  if (cacheable) {
    const memo = _memoGet(_resultCache, db, cacheKey);
    if (memo.hit) {
      log('match cache hit', { input: rawMfr, key: memo.value ? memo.value.key : null });
      return memo.value;
    }
  }

  const index = _buildIndex(db);
  const candidates = [];
  let best = null;

  const consider = (rawKey, entry, score, matchType, extra = {}) => {
    const candidate = { key: rawKey, entry, score, matchType, ...extra };
    candidates.push(candidate);
    if (!best || score > best.score) {best = candidate;}
  };

  // Pid coherence check shared by the exact and normalized paths:
  // an exact mfr whose entry declares modelIds that do NOT include the
  // device pid is downgraded to the mfr_only tier (0.7).
  const pidCoherence = (entry) => {
    if (!npid || !entry || !Array.isArray(entry.modelIds) || entry.modelIds.length === 0) {return 'unknown';}
    return entry.modelIds.some(m => normalizePid(m) === npid) ? 'known' : 'mismatch';
  };

  // Tiered matching. Tiers 1-3 are O(1) map lookups; the fuzzy tier-4 scan
  // only runs when no cheaper tier produced an acceptable match (unless the
  // caller explicitly lowered the threshold, e.g. bestCandidates()).

  // 1. Exact raw key
  const rawHit = index.rawMap.get(rawMfr);
  if (rawHit) {
    const coherence = pidCoherence(rawHit.entry);
    consider(rawHit.rawKey, rawHit.entry, coherence === 'mismatch' ? scores.mfrOnly : scores.exact,
      coherence === 'mismatch' ? 'mfr_exact_pid_unknown' : 'exact');
  }

  // 2. Exact normalized key (case / parasite tolerant)
  const normHit = index.keyMap.get(norm.key);
  if (normHit && normHit !== rawHit) {
    const coherence = pidCoherence(normHit.entry);
    consider(normHit.rawKey, normHit.entry, coherence === 'mismatch' ? scores.mfrOnly : scores.normalized,
      coherence === 'mismatch' ? 'mfr_exact_pid_unknown' : 'normalized');
  }

  // 3. Interchangeable prefix, same suffix (_TZE200_/_TZE204_/_TZE284_/_TYST11_)
  if (norm.suffix) {
    for (const record of index.suffixMap.get(norm.suffix) || []) {
      if (record === rawHit || record === normHit) {continue;}
      if (arePrefixesInterchangeable(norm.prefix, record.norm.prefix)) {
        consider(record.rawKey, record.entry, scores.prefixVariant, 'prefix_variant');
      }
    }
  }

  // 4. Fuzzy suffix (obscure variants / 1-char typos) — last resort scan.
  // Skipped when a better tier already passed the acceptance threshold:
  // fuzzy scores (<= 0.6) can never beat such a winner.
  const fuzzyUseful = threshold <= scores.fuzzySuffix || !best || best.score < threshold;
  if (fuzzyUseful && norm.suffix.length >= 4) {
    const fuzzyEligible = _charSignature(norm.suffix);
    for (let len = Math.max(4, norm.suffix.length - MAX_EDIT_DISTANCE);
      len <= norm.suffix.length + MAX_EDIT_DISTANCE; len++) {
      for (const suffix of index.suffixByLength.get(len) || []) {
        if (!_signatureWithin(fuzzyEligible, index.suffixCounts.get(suffix), MAX_EDIT_DISTANCE)) {continue;}
        const dist = editDistance(norm.suffix, suffix, MAX_EDIT_DISTANCE);
        if (dist > MAX_EDIT_DISTANCE || dist === 0) {continue;}
        for (const record of index.suffixMap.get(suffix)) {
          if (record === rawHit || record === normHit) {continue;}
          if (record.norm.prefix !== norm.prefix &&
              !arePrefixesInterchangeable(norm.prefix, record.norm.prefix)) {continue;}
          // Exact same prefix scores slightly higher than cross-prefix fuzzy
          const score = record.norm.prefix === norm.prefix
            ? scores.fuzzySuffix
            : Math.max(0.55, scores.fuzzySuffix - 0.05);
          consider(record.rawKey, record.entry, score, 'fuzzy_suffix', { editDistance: dist });
        }
      }
    }
  }

  // 5. v10.12.0 (P92.77): live overlay tier — NEW fingerprints fetched from
  // our GitHub Pages feed. Consulted ONLY when local db produced no winner
  // above threshold; slightly below the normalized tier so local curated
  // data always wins on conflict. Overlay lookups are case-normalized and
  // cheap (the map is small, refreshed daily).
  if (_overlayProvider && (!best || best.score < threshold)) {
    try {
      const overlay = _overlayProvider();
      if (overlay && typeof overlay === 'object') {
        for (const [oKey, oEntry] of Object.entries(overlay)) {
          if (normalizeMfr(oKey).key !== norm.key) {continue;}
          // WHY: overlay must be couple (mfr+pid). Never lock overlay on mfr alone.
          if (npid) {
            const models = Array.isArray(oEntry?.modelIds) ? oEntry.modelIds.map((m) => normalizePid(m)) : [];
            if (!models.length || !models.includes(npid)) {continue;}
          }
          const coherence = pidCoherence(oEntry);
          consider(oKey, oEntry,
            coherence === 'mismatch' ? Math.max(0.65, scores.mfrOnly - 0.05) : Math.max(0.85, scores.prefixVariant - 0.05),
            coherence === 'mismatch' ? 'live_overlay_pid_unknown' : 'live_overlay');
          break; // one overlay entry per normalized mfr is enough
        }
      }
    } catch { /* overlay failure must never break matching */ }
  }

  candidates.sort((a, b) => b.score - a.score);
  const top = candidates.slice(0, topK);

  if (best && best.score >= threshold) {
    const result = { ...best, candidates: top };
    log('match retained', { input: rawMfr, key: best.key, matchType: best.matchType, score: best.score, candidatesConsidered: candidates.length, top: top.map(c => ({ key: c.key, score: c.score, matchType: c.matchType })) });
    if (cacheable) {_memoSet(_resultCache, db, cacheKey, result);}
    return result;
  }

  log('no candidate above threshold', { input: rawMfr, threshold, best: best ? { key: best.key, score: best.score } : null, top: top.map(c => ({ key: c.key, score: c.score, matchType: c.matchType })) });
  if (cacheable) {_memoSet(_resultCache, db, cacheKey, null);}
  return null;
}

/**
 * Return the top-k candidates without applying the acceptance threshold.
 * Useful as ultimate fallback ("nothing matched, here is what came closest").
 */
function bestCandidates(mfr, db, k = 5, opts = {}) {
  const result = matchFingerprint(mfr, null, db, { ...opts, threshold: -1, topK: k });
  return result ? result.candidates.slice(0, k) : [];
}

/**
 * Pid-only fallback: when the manufacturerName is unknown/absent, suggest the
 * most frequent driverHint among mfs_db devices whose modelIds include pid.
 *
 * @param {string} pid - raw productId / modelId
 * @param {Object} mfsDbDevices - the `devices` section of data/mfs_db.json
 * @returns {{driverHint: string, count: number, modelId: string}|null}
 */
function suggestDriverFromPid(pid, mfsDbDevices, opts = {}) {
  const log = _makeLogger(opts);
  const npid = normalizePid(pid);
  if (!npid || !mfsDbDevices || typeof mfsDbDevices !== 'object') {return null;}

  const memo = _memoGet(_pidCache, mfsDbDevices, npid);
  if (memo.hit) {return memo.value;}

  const tally = new Map();
  for (const [mfrKey, entry] of Object.entries(mfsDbDevices)) {
    if (!entry || typeof entry !== 'object') {continue;}
    const modelIds = Array.isArray(entry.modelIds) ? entry.modelIds : [];
    if (!modelIds.some(m => normalizePid(m) === npid)) {continue;}
    const hint = entry.driverHint || entry.driverId || entry.driver;
    if (!hint) {continue;}
    const weight = typeof entry.confidence === 'number' ? entry.confidence : 1;
    const agg = tally.get(hint) || { driverHint: hint, count: 0, weight: 0, mfrs: [] };
    agg.count += 1;
    agg.weight += weight;
    if (agg.mfrs.length < 5) {agg.mfrs.push(mfrKey);}
    tally.set(hint, agg);
  }

  if (tally.size === 0) {
    log('pid fallback: no mfs_db entry carries this pid', { pid: npid });
    _memoSet(_pidCache, mfsDbDevices, npid, null);
    return null;
  }

  const ranked = [...tally.values()].sort((a, b) => (b.count - a.count) || (b.weight - a.weight));
  const top = ranked[0];
  log('pid fallback suggestion', { pid: npid, driverHint: top.driverHint, supportingEntries: top.count, runnersUp: ranked.slice(1, 4).map(r => ({ driverHint: r.driverHint, count: r.count })) });
  const result = { driverHint: top.driverHint, count: top.count, modelId: npid, sampleManufacturers: top.mfrs };
  _memoSet(_pidCache, mfsDbDevices, npid, result);
  return result;
}

module.exports = {
  VERSION,
  SCORES,
  DEFAULT_THRESHOLD,
  PREFIX_GROUPS,
  KNOWN_PREFIXES,
  normalizeMfr,
  normalizePid,
  arePrefixesInterchangeable,
  editDistance,
  matchFingerprint,
  bestCandidates,
  suggestDriverFromPid,
  invalidateIndex,
  setOverlayProvider,
};
