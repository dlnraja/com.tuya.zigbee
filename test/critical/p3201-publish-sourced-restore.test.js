'use strict';
// P3201: payload-only dedupe of case/invisible duplicates + parasite rows, restore of source-backed couples.
const assert = require('assert');
const { describe, it } = require('../_support/dual-runner');
const sp = require('../../scripts/maintenance/publish-sourced-restore.cjs');

const entry = (m, p, strong = true) => [sp.keyOf(m, p), { mfrForms: new Set([m]), pidForms: new Set([p]), src: new Set([strong ? 'kb' : 'mfs_db']), strong }];
const drv = (id, M, P) => ({ id, zigbee: { manufacturerName: M, productId: P } });

describe('P3201 publish sourced restore', () => {
  it('canonical forms: prefix upper, suffix lower; pid upper', () => {
    assert.strictEqual(sp.canonicalMfr('_tz3000_PCQJMCUD'), '_TZ3000_pcqjmcud');
    assert.strictEqual(sp.canonicalPid('ts004f'), 'TS004F');
  });

  it('drops case duplicates but keeps the canonical form', () => {
    const man = { drivers: [drv('knob', ['_TZ3000_pcqjmcud', '_tz3000_pcqjmcud', '_TZ3000_PCQJMCUD'], ['TS004F', 'ts004f'])] };
    const freed = sp.dedupeForms(man, new Map([entry('_TZ3000_pcqjmcud', 'TS004F')]), new Set());
    assert.strictEqual(freed, 5);
    assert.deepStrictEqual(man.drivers[0].zigbee.manufacturerName, ['_TZ3000_pcqjmcud']);
    assert.deepStrictEqual(man.drivers[0].zigbee.productId, ['TS004F']);
  });

  it('never cuts a byte-exact baseline (P3024b) form, even with a trailing space', () => {
    const man = { drivers: [drv('soil', ['AOYAN ', 'aoyan'], ['TS0601'])] };
    const r = sp.sourcedPass({ drivers: [] }, man, { sourced: new Map(), sacred: new Set(), baselineSet: new Set(['AOYAN \u0000TS0601']), maxTotal: 10 });
    assert.ok(man.drivers[0].zigbee.manufacturerName.includes('AOYAN '));
    assert.ok(r.after <= 10);
  });

  it('restores a dropped source-backed couple by freeing a parasite row, same driver set, under the ceiling', () => {
    const source = { drivers: [drv('plug', ['_TZ3000_cehuw1lw', '_TZ3000_aaaaaaaa'], ['TS011F', 'TS0121']), drv('other', ['_TZ3000_zzzzzzzz', '_TZ3000_yyyyyyyy'], ['TS0001', 'TS9999'])] };
    const man = { drivers: [drv('plug', ['_TZ3000_aaaaaaaa'], ['TS011F']), drv('other', ['_TZ3000_zzzzzzzz', '_TZ3000_yyyyyyyy'], ['TS0001', 'TS9999'])] };
    const sourced = new Map([entry('_TZ3000_cehuw1lw', 'TS011F'), entry('_TZ3000_aaaaaaaa', 'TS011F'), entry('_TZ3000_zzzzzzzz', 'TS0001')]);
    const r = sp.sourcedPass(source, man, { sourced, sacred: new Set(), baselineSet: new Set(), maxTotal: 5, maxDriver: 10 });
    const keys = sp.presentKeys(man);
    assert.ok(keys.has(sp.keyOf('_TZ3000_cehuw1lw', 'TS011F')));
    assert.ok(keys.has(sp.keyOf('_TZ3000_zzzzzzzz', 'TS0001')));
    assert.ok(r.after <= 5);
    assert.strictEqual(man.drivers.length, 2);
  });

  it('snapshot ratchet flags a dropped couple and ignores one removed from the source', () => {
    const fs = require('fs'); const os = require('os'); const path = require('path');
    const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'p3201-')), 's.json');
    fs.writeFileSync(f, JSON.stringify({ couples: [sp.keyOf('_TZ3000_a', 'TS0001'), sp.keyOf('_TZ3000_gone', 'TS0001')] }));
    const sourced = new Map([entry('_TZ3000_a', 'TS0001'), entry('_TZ3000_gone', 'TS0001')]);
    const r = sp.checkSnapshot({ drivers: [drv('x', ['_TZ3000_a'], ['TS0001'])] }, { drivers: [drv('x', ['_TZ3000_b'], ['TS0001'])] }, sourced, f);
    assert.strictEqual(r.checked, 1);
    assert.strictEqual(r.missing.length, 1);
  });
});
