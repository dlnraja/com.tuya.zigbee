#!/usr/bin/env node
'use strict';

/**
 * P3023: build lib/zigbee/data/dp-shards/ from lib/zigbee/data/unknown-dp-catalog.json.
 *
 * 32 hash buckets (FNV-1a of "mfr_lower|PID_UPPER" % 32), each { n: [strings], p: [[dp, nameRef, convRef, …]],
 * m: { couple: profileIndex | { p, caps } } } resolved from the v2 catalogue (names/profiles/convs indirections flattened), plus
 * index.json { v, buckets, sha1, bytes, couples }. CatalogStore only trusts shards whose sha1 and
 * size match the shipped catalogue, so a stale shard set silently falls back to the full file.
 * Run after scripts/data/build-unknown-dp-catalog.js:  node scripts/data/build-dp-shards.js [--check]
 */

const fs = require('fs');
const path = require('path');
const CS = require('../../lib/memory/CatalogStore');

function build() {
  const cat = JSON.parse(fs.readFileSync(CS.CATALOG_FILE, 'utf8'));
  const fp = CS.catalogFingerprint();
  // Per-bucket string tables keep the shard set close to the catalogue's own size.
  const buckets = Array.from({ length: CS.BUCKETS }, () => ({ n: [], p: [], m: {} }));
  const tables = buckets.map(() => new Map());
  const profs = buckets.map(() => new Map());
  const keys = new Set([...Object.keys(cat.idx || {}), ...Object.keys(cat.caps || {})]);
  for (const key of [...keys].sort()) {
    const row = CS.resolveFromCatalog(cat, key);
    if (!row) { continue; }
    const bi = CS.bucketOf(key);
    const b = buckets[bi];
    const t = tables[bi];
    const ref = (str) => {
      if (str === null || str === undefined) { return -1; }
      if (!t.has(str)) { t.set(str, b.n.length); b.n.push(str); }
      return t.get(str);
    };
    const flat = [];
    for (const [dp, name, conv] of row.r) { flat.push(dp, ref(name), ref(conv)); }
    const sig = flat.join(',');
    if (!profs[bi].has(sig)) { profs[bi].set(sig, b.p.length); b.p.push(flat); }
    const pi = profs[bi].get(sig);
    b.m[key] = row.caps ? { p: pi, caps: row.caps } : pi;
  }
  return { buckets, index: { v: 1, buckets: CS.BUCKETS, sha1: fp.sha1, bytes: fp.bytes, couples: keys.size } };
}

function main() {
  const check = process.argv.includes('--check');
  const { buckets, index } = build();
  const files = { 'index.json': `${JSON.stringify(index)}\n` };
  buckets.forEach((b, i) => { files[`${String(i).padStart(2, '0')}.json`] = `${JSON.stringify(b)}\n`; });
  if (check) {
    const stale = Object.entries(files).filter(([f, body]) => {
      try { return fs.readFileSync(path.join(CS.SHARD_DIR, f), 'utf8') !== body; } catch (_e) { return true; }
    }).map(([f]) => f);
    if (stale.length) { console.error(`dp-shards stale: ${stale.join(', ')} — run node scripts/data/build-dp-shards.js`); process.exit(1); }
    console.log(`dp-shards up to date (${index.couples} couples, ${CS.BUCKETS} buckets)`);
    return;
  }
  fs.mkdirSync(CS.SHARD_DIR, { recursive: true });
  for (const [f, body] of Object.entries(files)) { fs.writeFileSync(path.join(CS.SHARD_DIR, f), body); }
  console.log(`dp-shards written: ${index.couples} couples in ${CS.BUCKETS} buckets → ${path.relative(process.cwd(), CS.SHARD_DIR)}`);
}

if (require.main === module) { main(); }
module.exports = { build };
