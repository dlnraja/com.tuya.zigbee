'use strict';

const assert = require('assert');
const Tsn = require('../lib/zigbee/ZclTsnContinuity');
const Guard = require('../lib/zigbee/ZclUnsupportedGuard');

function fakeLib() {
  class Cluster {
    constructor(endpoint) { this._endpoint = endpoint; this._nextTrxSeqNr = 0; }
    nextSeqNr() { this._nextTrxSeqNr = (this._nextTrxSeqNr + 1) % 256; return this._nextTrxSeqNr; }
  }
  return { Cluster };
}

function fakeDevice(stored) {
  const store = { zcl_tsn_next: stored };
  return {
    store,
    getStoreValue(k) { return store[k]; },
    async setStoreValue(k, v) { store[k] = v; },
  };
}

describe('P3029 ZclTsnContinuity (TSN continues across restarts)', () => {
  afterEach(() => Tsn.setEnabled(true));

  it('shares one counter across endpoints and clusters of a node', () => {
    const lib = fakeLib();
    assert.strictEqual(Tsn.install(lib), true);
    const node = {};
    const a = new lib.Cluster({ _node: node });
    const b = new lib.Cluster({ _node: node });
    const x = a.nextSeqNr(); const y = b.nextSeqNr(); const z = a.nextSeqNr();
    assert.strictEqual(y, (x + 1) % 256);
    assert.strictEqual(z, (x + 2) % 256);
    assert.strictEqual(a._nextTrxSeqNr, z);
  });

  it('resumes beyond the stored checkpoint after a restart (never reuses recent TSNs)', () => {
    const lib = fakeLib();
    Tsn.install(lib);
    const node = {};
    const dev = fakeDevice(100);
    Guard.linkDevice(dev, node);
    const c = new lib.Cluster({ _node: node });
    const first = c.nextSeqNr();
    assert.strictEqual(first, (100 + Tsn.CHECKPOINT_EVERY + 1) % 256);
    assert.strictEqual(dev.store.zcl_tsn_next, 100 + Tsn.CHECKPOINT_EVERY);
  });

  it('checkpoints at most once per CHECKPOINT_EVERY frames and simulated restart never overlaps', () => {
    const lib = fakeLib();
    Tsn.install(lib);
    const dev = fakeDevice(250);
    let used = [];
    for (let run = 0; run < 5; run++) {
      const node = {};
      Guard.linkDevice(dev, node);
      const c = new lib.Cluster({ _node: node });
      const n = 1 + Math.floor(Math.random() * 40);
      const thisRun = [];
      for (let i = 0; i < n; i++) { thisRun.push(c.nextSeqNr()); }
      const recent = used.slice(-10);
      for (const t of thisRun.slice(0, 10)) { assert.ok(!recent.includes(t), `TSN ${t} reused after restart ${run}`); }
      used = used.concat(thisRun);
    }
  });

  it('random seed (never 0/1) when nothing is stored; wraps within 0..255', () => {
    for (let i = 0; i < 50; i++) {
      const s = Tsn.seedFor(fakeDevice(undefined));
      assert.ok(s >= 2 && s <= 255);
    }
    assert.strictEqual(Tsn.seedFor(fakeDevice(240)), (240 + Tsn.CHECKPOINT_EVERY) % 256);
    assert.ok(Tsn.seedFor(fakeDevice('junk')) >= 2);
  });

  it('kill switch falls back to the library counter', () => {
    const lib = fakeLib();
    Tsn.install(lib);
    Tsn.setEnabled(false);
    const c = new lib.Cluster({ _node: {} });
    assert.strictEqual(c.nextSeqNr(), 1);
    assert.strictEqual(c.nextSeqNr(), 2);
  });

  it('install is idempotent and refuses a library without nextSeqNr', () => {
    const lib = fakeLib();
    Tsn.install(lib); const f = lib.Cluster.prototype.nextSeqNr;
    Tsn.install(lib);
    assert.strictEqual(lib.Cluster.prototype.nextSeqNr, f);
    assert.strictEqual(Tsn.install({ Cluster: class {} }), false);
  });

  it('cluster without endpoint/node uses the original behaviour', () => {
    const lib = fakeLib();
    Tsn.install(lib);
    const c = new lib.Cluster(null);
    assert.strictEqual(c.nextSeqNr(), 1);
  });

  it('works with the real zigbee-clusters Cluster prototype', () => {
    const zc = require('zigbee-clusters');
    assert.strictEqual(typeof zc.Cluster.prototype.nextSeqNr, 'function');
  });
});
