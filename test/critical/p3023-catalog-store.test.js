'use strict';
/** P3023: sharded CatalogStore gives exactly the full catalogue's answers, with less heap. */
const { describe, it, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const CS = require('../../lib/memory/CatalogStore');
const { build } = require('../../scripts/data/build-dp-shards');

const cat = JSON.parse(fs.readFileSync(CS.CATALOG_FILE, 'utf8'));
const keys = [...new Set([...Object.keys(cat.idx || {}), ...Object.keys(cat.caps || {})])];

describe('P3023 CatalogStore', () => {
  afterEach(() => CS._reset());

  it('shipped shards are in sync with the shipped catalogue (run scripts/data/build-dp-shards.js)', () => {
    const { buckets, index } = build();
    const idx = JSON.parse(fs.readFileSync(path.join(CS.SHARD_DIR, 'index.json'), 'utf8'));
    assert.deepStrictEqual(idx, index);
    buckets.forEach((b, i) => {
      const f = path.join(CS.SHARD_DIR, `${String(i).padStart(2, '0')}.json`);
      assert.deepStrictEqual(JSON.parse(fs.readFileSync(f, 'utf8')), b, f);
    });
  });

  it('every couple resolves identically through shards and through the full catalogue', () => {
    for (const k of keys) {
      const [m, p] = k.split('|');
      const got = CS.couple(m.toUpperCase(), p.toLowerCase()); // key normalisation
      const ref = CS.resolveFromCatalog(cat, k);
      assert.deepStrictEqual(got, { rows: ref.r.map(([dp, name, conv]) => ({ dp, name, conv })), caps: ref.caps || null }, k);
    }
    const s = CS.snapshot();
    assert.strictEqual(s.sharded, true);
    assert.strictEqual(s.full, false, 'full catalogue must not be parsed when shards are valid');
    assert.ok(s.couples <= 256 && s.shards <= 4);
  });

  it('unknown couple → null; consumers keep their answers', () => {
    assert.strictEqual(CS.couple('_TZ_nope', 'TS9999'), null);
    const D = require('../../lib/zigbee/DpCatalogDecoder');
    const I = require('../../lib/zigbee/UnknownCommandInterpreter');
    const k = keys.find((x) => cat.idx[x] !== undefined);
    const [m, p] = k.split('|');
    const prof = cat.profiles[cat.idx[k]];
    assert.strictEqual(I.catalogName(m, p, prof[0]), cat.names[prof[1]]);
    assert.strictEqual(D.entry(m, p, prof[0]).name, cat.names[prof[1]]);
    assert.strictEqual(D.coupleDps(m, p).length, prof.length / 2);
    assert.deepStrictEqual(D.coupleDps('_TZ_nope', 'TS9999'), []);
  });

  it('release() drops every cache and the next lookup rebuilds', () => {
    const [m, p] = keys[0].split('|');
    const a = CS.couple(m, p);
    CS.release();
    assert.strictEqual(CS.snapshot().couples, 0);
    assert.deepStrictEqual(CS.couple(m, p), a);
  });
});
