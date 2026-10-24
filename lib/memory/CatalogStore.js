'use strict';

/**
 * P3023: CatalogStore — one lazy, sharded, releasable view of the DP catalogue.
 *
 * unknown-dp-catalog.json (≈160 KB on disk, ≈410 KB of heap once parsed) is only ever read
 * per exact couple (mfr|pid). Instead of parsing the whole file the first time ANY device
 * meets an unknown DP and keeping it forever, consumers ask for one couple:
 *   1. LRU of resolved couples (≤ COUPLE_LRU);
 *   2. shard bucket file lib/zigbee/data/dp-shards/NN.json (≈1/32 of the catalogue), read with
 *      fs (not require → no permanent require.cache entry), ≤ SHARD_LRU buckets kept;
 *   3. fallback: the full catalogue (require, as before) when shards are missing or STALE
 *      (index.json carries the catalogue's sha1 + byte size; any mismatch → full catalogue).
 * release() (memory budget / memwarn) drops every cache and the full catalogue's require.cache
 * entry; the next lookup rebuilds what it needs. Results are identical on every path
 * (test p3023-catalog-store checks every couple). One instance per app (module singleton).
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { BoundedMap, fnv1a } = require('./BoundedMap');

const DATA_DIR = path.join(__dirname, '..', 'zigbee', 'data');
const CATALOG_FILE = path.join(DATA_DIR, 'unknown-dp-catalog.json');
const SHARD_DIR = path.join(DATA_DIR, 'dp-shards');
const BUCKETS = 32;
const COUPLE_LRU = 256;
const SHARD_LRU = 4;

const _couples = new BoundedMap({ max: COUPLE_LRU });
const _shards = new BoundedMap({ max: SHARD_LRU });
let _full = null; // parsed full catalogue (fallback path only)
let _index; // undefined = not checked, null = unusable, object = valid
const stats = { hits: 0, shardLoads: 0, fullLoads: 0, releases: 0, misses: 0 };

function coupleKey(mfr, pid) { return `${String(mfr || '').toLowerCase()}|${String(pid || '').toUpperCase()}`; }
function bucketOf(key) { return fnv1a(key) % BUCKETS; }

/** sha1 + size of the catalogue file (what the shards were built from). */
function catalogFingerprint(file = CATALOG_FILE) {
  const buf = fs.readFileSync(file);
  return { sha1: crypto.createHash('sha1').update(buf).digest('hex'), bytes: buf.length };
}

function _validIndex() {
  if (_index !== undefined) { return _index; }
  _index = null;
  try {
    const idx = JSON.parse(fs.readFileSync(path.join(SHARD_DIR, 'index.json'), 'utf8'));
    if (!idx || idx.v !== 1 || idx.buckets !== BUCKETS) { return _index; }
    const st = fs.statSync(CATALOG_FILE);
    if (st.size !== idx.bytes) { return _index; }
    if (catalogFingerprint().sha1 !== idx.sha1) { return _index; }
    _index = { sha1: idx.sha1, couples: idx.couples };
  } catch (_e) { _index = null; }
  return _index;
}

function _loadFull() {
  if (_full === null) {
    try { _full = require(CATALOG_FILE); stats.fullLoads++; } catch (_e) { _full = false; }
  }
  return _full || null;
}

/** Resolve one couple from the parsed full catalogue (same shape as a shard row). */
function resolveFromCatalog(c, key) {
  if (!c) { return null; }
  const own = c.caps && c.caps[key] ? c.caps[key] : null;
  const pi = c.idx ? c.idx[key] : undefined;
  if (!Number.isInteger(pi) && !own) { return null; }
  const rows = [];
  if (Number.isInteger(pi)) {
    const prof = c.profiles[pi] || [];
    const cv = (c.cv && c.cv[pi]) || [];
    for (let i = 0, j = 0; i < prof.length; i += 2, j++) {
      const ci = cv[j];
      rows.push([prof[i], c.names[prof[i + 1]] || null, Number.isInteger(ci) && ci >= 0 && c.convs ? c.convs[ci] : null]);
    }
  }
  return own ? { r: rows, caps: own } : { r: rows };
}

function _shard(b) {
  let s = _shards.get(b);
  if (s === undefined) {
    try {
      s = JSON.parse(fs.readFileSync(path.join(SHARD_DIR, `${String(b).padStart(2, '0')}.json`), 'utf8'));
      stats.shardLoads++;
    } catch (_e) { s = null; }
    _shards.set(b, s);
  }
  return s;
}

function _fromShard(s, key) {
  const m = s.m ? s.m[key] : undefined;
  if (m === undefined || m === null) { return null; }
  const pi = typeof m === 'number' ? m : m.p;
  const flat = s.p[pi] || [];
  const str = (i) => Number.isInteger(i) && i >= 0 ? s.n[i] : null;
  const out = { r: [] };
  for (let i = 0; i < flat.length; i += 3) { out.r.push([flat[i], str(flat[i + 1]), str(flat[i + 2])]); }
  if (typeof m === 'object' && m.caps) { out.caps = m.caps; }
  return out;
}

/**
 * Catalogue data of one exact couple, or null.
 * @returns {{rows: Array<{dp:number,name:string|null,conv:string|null}>, caps: object|null}|null}
 */
function couple(mfr, pid) {
  const key = coupleKey(mfr, pid);
  const cached = _couples.get(key);
  if (cached !== undefined) { stats.hits++; return cached; }
  let raw = null;
  if (_validIndex()) {
    const s = _shard(bucketOf(key));
    raw = s ? _fromShard(s, key) : resolveFromCatalog(_loadFull(), key);
  } else {
    raw = resolveFromCatalog(_loadFull(), key);
  }
  const out = raw ? { rows: raw.r.map(([dp, name, conv]) => ({ dp, name, conv })), caps: raw.caps || null } : null;
  if (!out) { stats.misses++; }
  _couples.set(key, out);
  return out;
}

/** Memory budget / memwarn: drop every cache and the full catalogue. */
function release() {
  _couples.clear();
  _shards.clear();
  if (_full) {
    try { delete require.cache[require.resolve(CATALOG_FILE)]; } catch (_e) { /* soft */ }
  }
  _full = null;
  stats.releases++;
}

function snapshot() {
  return { couples: _couples.size, shards: _shards.size, full: !!_full, sharded: !!_validIndex(), stats: Object.assign({}, stats) };
}

/** Tests only. */
function _reset() { release(); _index = undefined; for (const k of Object.keys(stats)) { stats[k] = 0; } }

module.exports = { couple, release, snapshot, coupleKey, bucketOf, resolveFromCatalog, catalogFingerprint, BUCKETS, SHARD_DIR, CATALOG_FILE, _reset };
