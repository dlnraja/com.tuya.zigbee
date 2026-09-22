'use strict';

/**
 * build-fingerprint-shards.js (P2678)
 *
 * Splits lib/tuya/fingerprints.json into lib/tuya/fp-shards/*.json
 * so Homey runtime can load one small shard on demand.
 *
 * Usage:
 *   node tools/ci/build-fingerprint-shards.js
 *   node tools/ci/build-fingerprint-shards.js --check
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const SRC = path.join(ROOT, 'lib', 'tuya', 'fingerprints.json');
const OUT_DIR = path.join(ROOT, 'lib', 'tuya', 'fp-shards');
const { fingerprintShardId } = require('../../lib/tuya/fingerprintShardId');

const CHECK = process.argv.includes('--check');
const MAX_SHARD_BYTES = 180 * 1024; // Contre quoi: no shard > ~180KB

function main() {
  if (!fs.existsSync(SRC)) {
    console.error('[fp-shards] missing', SRC);
    process.exit(1);
  }
  const buf = fs.readFileSync(SRC);
  const db = JSON.parse(buf);
  if (!db || typeof db !== 'object' || Array.isArray(db)) {
    console.error('[fp-shards] unexpected schema');
    process.exit(1);
  }

  const shards = new Map();
  for (const [key, val] of Object.entries(db)) {
    if (key === '_meta') continue;
    const id = fingerprintShardId(key);
    if (!shards.has(id)) shards.set(id, {});
    shards.get(id)[key] = val;
  }

  const manifest = {
    version: 1,
    patch: 'P2678',
    generatedAt: new Date().toISOString(),
    source: 'lib/tuya/fingerprints.json',
    sourceBytes: buf.length,
    keyCount: Object.keys(db).filter((k) => k !== '_meta').length,
    shardCount: shards.size,
    shards: {},
  };

  if (!CHECK) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    // Remove stale shard json (keep README if any)
    for (const f of fs.readdirSync(OUT_DIR)) {
      if (f.endsWith('.json') && f !== 'manifest.json') {
        fs.unlinkSync(path.join(OUT_DIR, f));
      }
    }
  }

  let maxBytes = 0;
  const oversize = [];
  for (const [id, obj] of [...shards.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const body = `${JSON.stringify(obj)}\n`;
    const bytes = Buffer.byteLength(body);
    maxBytes = Math.max(maxBytes, bytes);
    manifest.shards[id] = { keys: Object.keys(obj).length, bytes };
    if (bytes > MAX_SHARD_BYTES) oversize.push({ id, bytes });
    if (!CHECK) {
      fs.writeFileSync(path.join(OUT_DIR, `${id}.json`), body);
    }
  }

  if (!CHECK) {
    fs.writeFileSync(
      path.join(OUT_DIR, 'manifest.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
    );
  }

  console.log(
    `[fp-shards] ${CHECK ? 'check' : 'wrote'} shards=${shards.size} keys=${manifest.keyCount} maxShard=${maxBytes}B`,
  );
  if (oversize.length) {
    console.error('[fp-shards] FAIL oversize shards:', oversize);
    process.exit(1);
  }

  if (CHECK) {
    const manPath = path.join(OUT_DIR, 'manifest.json');
    if (!fs.existsSync(manPath)) {
      console.error('[fp-shards] missing manifest — run without --check');
      process.exit(1);
    }
    const disk = JSON.parse(fs.readFileSync(manPath));
    if (Number(disk.keyCount) !== manifest.keyCount) {
      console.error('[fp-shards] stale shards: rebuild required', disk.keyCount, 'vs', manifest.keyCount);
      process.exit(1);
    }
    for (const id of Object.keys(manifest.shards)) {
      const fp = path.join(OUT_DIR, `${id}.json`);
      if (!fs.existsSync(fp)) {
        console.error('[fp-shards] missing shard', id);
        process.exit(1);
      }
    }
    console.log('[fp-shards] OK');
  }
}

main();
