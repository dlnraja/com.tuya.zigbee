'use strict';
/* eslint-env mocha */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Module = require('module');
const T = require('../lib/tuya-local/CloudDpTable');
const { parseImport } = require('../lib/tuya-local/TinyTuyaImport');

describe('P2956 cloud DP table + pairing hint', () => {
  const origLoad = Module._load;
  before(() => {
    Module._load = function (r, ...a) {
      if (r === 'homey') { class B {} return { Device: B, Driver: B, App: B, SimpleClass: B, __: (k) => k }; }
      return origLoad.call(this, r, ...a);
    };
  });
  after(() => { Module._load = origLoad; });

  const tinyCover = { id: 'abc', key: '0123456789abcdef', mapping: { 1: { code: 'control', type: 'Enum', values: { range: ['open', 'stop', 'close', 'continue'] } }, 2: { code: 'percent_control', type: 'Integer', values: {} } } };

  it('reads tinytuya mapping and OpenAPI spec arrays', () => {
    assert.deepStrictEqual(T.enumRange(tinyCover, 1), ['open', 'stop', 'close', 'continue']);
    const api = { functions: [{ dp_id: 1, code: 'control', type: 'Enum', values: '{"range":["ZZ","FZ","STOP"]}' }] };
    assert.deepStrictEqual(T.enumRange(api, 1), ['ZZ', 'FZ', 'STOP']);
    assert.strictEqual(T.enumRange({}, 1), null);
    assert.strictEqual(T.enumRange(null), null);
    assert.strictEqual(T.enumRange({ functions: [{ dp_id: 1, type: 'Enum', values: 'not json' }] }), null);
  });

  it('builds sample dps and schema', () => {
    const strip = { mapping: { 1: { type: 'Boolean' }, 2: { type: 'Boolean' }, 3: { type: 'Boolean' } } };
    assert.deepStrictEqual(T.sampleDps(strip), { 1: false, 2: false, 3: false });
    assert.deepStrictEqual(T.sampleDps(tinyCover), { 1: 'stop', 2: 0 });
    assert.deepStrictEqual(Object.keys(T.toSchema(tinyCover)), ['1']);
    assert.deepStrictEqual(T.sampleDps({ dps: { 1: true } }), { 1: true });
  });

  it('tinytuya import keeps the mapping (additive)', () => {
    const r = parseImport(JSON.stringify([tinyCover, { id: 'x', key: 'fedcba9876543210' }]));
    assert.ok(r.devices[0].mapping);
    assert.strictEqual(r.devices[1].mapping, null);
  });

  it('pair device store gets cloud_dp_range_1 only when a table is present', () => {
    const Driver = require('../lib/tuya-local/TuyaLocalDriver');
    const proto = Driver.prototype;
    const withTable = proto._toLocalFirstPairDevice.call({ log() {} }, { ...tinyCover, local_key: tinyCover.key }, 'ad_hoc');
    assert.deepStrictEqual(withTable.store.cloud_dp_range_1, ['open', 'stop', 'close', 'continue']);
    const without = proto._toLocalFirstPairDevice.call({ log() {} }, { id: 'y', local_key: 'fedcba9876543210' }, 'ad_hoc');
    assert.strictEqual(without.store.cloud_dp_range_1, undefined);
  });

  it('pair HTML calls suggest_driver optionally and all wifi copies are in sync', () => {
    const root = path.join(__dirname, '..', 'drivers');
    const ssot = fs.readFileSync(path.join(root, 'wifi_generic/pair/configure.html'), 'utf8');
    assert.ok(ssot.includes("emit('suggest_driver'"));
    assert.ok(ssot.includes('_goListNow'));
    for (const d of fs.readdirSync(root).filter((x) => x.startsWith('wifi_'))) {
      const f = path.join(root, d, 'pair/configure.html');
      if (fs.existsSync(f)) {assert.strictEqual(fs.readFileSync(f, 'utf8'), ssot, d);}
    }
  });
});
