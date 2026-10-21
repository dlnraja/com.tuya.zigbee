'use strict';
// P2961: lazy/bounded file loads + KPI flush on uninit.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

function tmpDrivers(nDrivers, nMfr, nPid) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p2961-'));
  for (let d = 0; d < nDrivers; d++) {
    fs.mkdirSync(path.join(dir, `drv${d}`));
    fs.writeFileSync(path.join(dir, `drv${d}`, 'driver.compose.json'), JSON.stringify({
      zigbee: { manufacturerName: Array.from({ length: nMfr }, (_, i) => `_TZ3000_m${d}_${i}`), productId: Array.from({ length: nPid }, (_, i) => `TS${i}`) },
    }));
  }
  return dir;
}

describe('P2961 FingerprintCache lazy + capped', () => {
  const FingerprintCache = require('../lib/cache/FingerprintCache');
  const opts = (dir, extra = {}) => ({ composeDir: dir, fingerprintsPath: path.join(dir, 'none.json'), cacheDir: path.join(dir, '.c'), ...extra });

  it('constructor does not read any compose file', () => {
    const dir = tmpDrivers(3, 2, 2);
    const orig = fs.readFileSync; let reads = 0;
    fs.readFileSync = function (...a) { if (String(a[0]).includes('driver.compose.json')) {reads++;} return orig.apply(this, a); };
    try {
      const c = new FingerprintCache(opts(dir));
      assert.strictEqual(reads, 0);
      assert.ok(c.lookup('_TZ3000_m1_0', 'TS1'), 'first lookup builds');
      assert.ok(reads > 0);
      c.destroy && c.destroy();
    } finally { fs.readFileSync = orig; }
  });

  it('cartesian index is capped (soak 40 drivers x 50 mfr x 20 pid = 40k)', () => {
    const dir = tmpDrivers(40, 50, 20);
    const c = new FingerprintCache(opts(dir, { maxIndexEntries: 5000 }));
    c.lookup('x', 'y');
    assert.ok(c.stats().indexSize <= 5000);
    c.destroy && c.destroy();
  });

  it('manual addEntry survives the lazy first build', () => {
    const dir = tmpDrivers(1, 1, 1);
    const c = new FingerprintCache(opts(dir));
    c.addEntry({ driver: 'manual', manufacturerName: '_TZE200_manual', productId: 'TS0601' });
    assert.ok(c.lookup('_TZE200_manual', 'TS0601'));
    c.destroy && c.destroy();
  });

  it('default cap constant exported', () => { assert.ok(FingerprintCache.MAX_INDEX_ENTRIES > 0); });
});

describe('P2961 ExternalDeviceAdapter bounded reads', () => {
  const ext = require('../lib/adapters/ExternalDeviceAdapter');
  it('skips files above the limit and returns content below it', () => {
    const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'p2961x-')), 'a.txt');
    fs.writeFileSync(f, 'x'.repeat(2048));
    assert.strictEqual(ext.readBounded(f, 'utf8', 1024), null);
    assert.strictEqual(ext.readBounded(f, 'utf8', 4096).length, 2048);
    assert.strictEqual(ext.readBounded(f + '.missing', 'utf8'), null);
  });
  it('is not loaded by app.js at require time', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
    assert.ok(!/require\(['"]\.\/lib\/adapters(\/index|\/ExternalDeviceAdapter)?['"]\)/.test(src));
    assert.ok(!/require\(['"]\.\/lib\/cache(\/index|\/FingerprintCache)?['"]\)/.test(src));
  });
});

describe('P2961 zigbee-tuya-evolution stays lazy', () => {
  it('SSOT parsed once and cached; compose scan only in assertHomeyImplications', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'lib', 'utils', 'zigbee-tuya-evolution.js'), 'utf8');
    assert.ok(/if \(_cache\) \{return _cache;\}/.test(src));
    const evo = require('../lib/utils/zigbee-tuya-evolution');
    const orig = fs.readFileSync; let reads = 0;
    fs.readFileSync = function (...a) { reads++; return orig.apply(this, a); };
    try { evo.loadEvolutionSsot && evo.loadEvolutionSsot(); evo.loadEvolutionSsot && evo.loadEvolutionSsot(); } finally { fs.readFileSync = orig; }
    assert.ok(reads <= 1);
  });
});

describe('P2961 energy KPI flushed on uninit', () => {
  function fakeHomey() {
    const store = {};
    return {
      store, sets: 0,
      settings: { get: async (k) => store[k] || null, set: async function (k, v) { store[k] = JSON.parse(JSON.stringify(v)); } },
      setTimeout: () => ({}), clearTimeout() {}, setInterval: () => ({}), clearInterval() {},
    };
  }
  it('stopDeviceCollection persists pending samples', async () => {
    delete require.cache[require.resolve('../lib/utils/energy-kpi')];
    delete require.cache[require.resolve('../lib/utils/data-collector')];
    const kpi = require('../lib/utils/energy-kpi');
    const dc = require('../lib/utils/data-collector');
    const homey = fakeHomey();
    await kpi.pushEnergySample(homey, 'dev1', { power: 42 });
    assert.ok(!homey.store.device_energy_kpi_v1, 'still pending');
    await dc.stopDeviceCollection({ homey });
    assert.strictEqual(homey.store.device_energy_kpi_v1.dev1[0].power, 42);
  });
  it('app onUninit flushes the KPI window', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
    const i = src.indexOf('async onUninit()');
    assert.ok(i > 0 && src.slice(i, i + 400).includes("energy-kpi').flushKpi(this.homey)"));
  });
});
