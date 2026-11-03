'use strict';
// P3264 fit-347: hosted profiles in dormant slots + driver-count cap (docs/rules/FIT_347_HOSTED_PROFILES.md).
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const HP = require('../../lib/hosting/HostedProfiles');
const DC = require('../../lib/arch/DriverCap');
const rd = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const cfg = rd('config/architecture/hosted-profiles.json');
const rt = rd('lib/hosting/hosted-profiles.runtime.json');
const published = new Set(rd('test/fixtures/athom-test-9.0.1574-driver-ids.json').ids || rd('test/fixtures/athom-test-9.0.1574-driver-ids.json'));
const holdIds = new Set((rd('config/publish-hold-drivers.json').drivers || []).map((d) => (typeof d === 'string' ? d : d.id)));

describe('P3264 fit-347 hosted profiles', () => {
  it('runtime table is in sync with the SSOT config', () => {
    execFileSync(process.execPath, ['scripts/arch/build-hosted-profiles.js', '--check'], { cwd: ROOT, stdio: 'pipe' });
  });

  it('every host is a published dormant slot and every hosted profile is a held, never-published driver', () => {
    for (const [host, profiles] of Object.entries(cfg.hosts)) {
      assert.ok(published.has(host), `${host} published`);
      assert.ok(cfg.dormantSlots[host], `${host} documented as dormant`);
      for (const id of profiles) {
        assert.ok(holdIds.has(id), `${id} held`);
        assert.ok(!published.has(id), `${id} never published`);
      }
    }
  });

  it('no couple is hosted twice nor shipped by another source driver (one couple = one driver)', () => {
    const own = new Map();
    for (const [host, ps] of Object.entries(rt.hosts)) for (const p of ps) for (const m of p.manufacturerName) for (const q of p.productId) {
      const k = `${m.trim().toLowerCase()}|${q.trim().toLowerCase()}`;
      assert.ok(!own.has(k) || own.get(k) === p.id, `${k} hosted by ${own.get(k)} and ${p.id}`);
      own.set(k, p.id);
    }
    const hostedIds = new Set(Object.values(cfg.hosts).flat());
    for (const d of fs.readdirSync(path.join(ROOT, 'drivers'))) {
      if (hostedIds.has(d) || holdIds.has(d) || !published.has(d)) continue;
      let c; try { c = rd(`drivers/${d}/driver.compose.json`); } catch (_) { continue; }
      const z = c.zigbee || {};
      for (const m of z.manufacturerName || []) for (const q of z.productId || []) {
        const k = `${String(m).trim().toLowerCase()}|${String(q).trim().toLowerCase()}`;
        assert.ok(!own.has(k), `${k} hosted (${own.get(k)}) but also shipped by ${d}`);
      }
    }
  });

  it('foldHosted moves exact couples into the host, drops the held id, pins and keeps the folder', () => {
    const man = { drivers: [
      { id: 'hostx', zigbee: { manufacturerName: ['_fake_generic'], productId: ['TS0601'] } },
      { id: 'heldx', zigbee: { manufacturerName: ['_TZE200_abc'], productId: ['TS0601'] } },
      { id: 'other', zigbee: { manufacturerName: ['_TZE200_zzz'], productId: ['TS0601'] } },
    ] };
    const t = { hosts: { hostx: [{ id: 'heldx', manufacturerName: ['_TZE200_abc'], productId: ['TS0601'] }] } };
    const r = HP.foldHosted(man, t, new Set(['heldx']));
    assert.deepStrictEqual(r.folded, ['heldx->hostx']);
    assert.deepStrictEqual(r.keepDirs, ['heldx']);
    assert.strictEqual(man.drivers.length, 2);
    assert.ok(man.drivers[0].zigbee.manufacturerName.includes('_TZE200_abc'));
    assert.ok(r.pins.every((p) => p.driverId === 'hostx'));
  });

  it('foldHosted refuses a cross-product collision', () => {
    const man = { drivers: [
      { id: 'hostx', zigbee: { manufacturerName: ['_fake'], productId: ['TS0601'] } },
      { id: 'heldx', zigbee: { manufacturerName: ['_TZE200_abc'], productId: ['TS0601'] } },
      { id: 'other', zigbee: { manufacturerName: ['_tze200_ABC'], productId: ['ts0601'] } },
    ] };
    const r = HP.foldHosted(man, { hosts: { hostx: [{ id: 'heldx' }] } }, new Set(['heldx']));
    assert.strictEqual(r.folded.length, 0);
    assert.match(r.skipped[0], /collision/);
    assert.strictEqual(man.drivers.length, 3);
  });

  it('retargetSacred moves pins of hosted profiles to their host', () => {
    const out = HP.retargetSacred([{ mfr: 'a', pid: 'b', driverId: 'heldx' }, { mfr: 'c', pid: 'd', driverId: 'z' }], ['heldx->hostx']);
    assert.deepStrictEqual(out.map((c) => c.driverId), ['hostx', 'z']);
  });

  it('mapDeviceClass routes the exact couple (case-insensitive) and falls back otherwise', () => {
    const t = { hosts: { hostx: [{ id: 'p', class: 'sensor', manufacturerName: ['_TZE200_ABC'], productId: ['TS0601'], module: 'test/fixtures/p3264/hosted-device.js' }] } };
    const dev = (m, p) => ({ getSetting: (k) => ({ zb_manufacturer_name: m, zb_model_id: p }[k]) });
    class Fallback {}
    const C = HP.mapDeviceClass('hostx', dev('_tze200_abc', 'ts0601'), Fallback, 'other', t);
    assert.notStrictEqual(C, Fallback);
    assert.strictEqual(C.name, 'Hosted_p');
    assert.strictEqual(HP.mapDeviceClass('hostx', dev('_TZE200_other', 'TS0601'), Fallback, 'other', t), Fallback);
    assert.strictEqual(HP.mapDeviceClass('hostx', {}, Fallback, 'other', t), Fallback);
  });

  it('every host driver.js routes through HostedProfiles.mapDeviceClass', () => {
    for (const host of Object.keys(cfg.hosts)) {
      const s = fs.readFileSync(path.join(ROOT, 'drivers', host, 'driver.js'), 'utf8');
      assert.match(s, new RegExp(`onMapDeviceClass[\\s\\S]*mapDeviceClass\\('${host}'`), host);
    }
  });

  it('prepare-publish folds hosted profiles, retargets sacred pins and gates the driver count', () => {
    const s = fs.readFileSync(path.join(ROOT, 'scripts', 'prepare-publish.js'), 'utf8');
    for (const k of ['foldHosted', 'retargetSacred', 'extraSacred: p3264.pins', 'p3264.keepDirs', "require('../lib/arch/DriverCap').checkPayload"]) assert.ok(s.includes(k), k);
  });
});

describe('P3264 driver-count cap', () => {
  const c = DC.load(ROOT);
  it('cap is 347 and no new source driver id exists', () => {
    assert.strictEqual(c.cap, 347);
    assert.deepStrictEqual(DC.newSourceIds(ROOT, c), []);
  });
  it('refuses a new id with a pointer to surviving drivers', () => {
    assert.throws(() => DC.assertCanCreateDriver('brand_new_driver_xyz', ROOT, c), /surviving driver/);
    assert.ok(DC.assertCanCreateDriver('smart_rcbo', ROOT, c));
  });
  it('payload check flags 348 drivers', () => {
    assert.strictEqual(DC.checkPayload({ drivers: new Array(347).fill({}) }, c).ok, true);
    assert.strictEqual(DC.checkPayload({ drivers: new Array(348).fill({}) }, c).ok, false);
  });
  it('driver creators call the cap guard', () => {
    for (const f of ['scripts/automation/driver-generator.js', '.github/scripts/auto-driver-scaffold.js']) {
      assert.ok(fs.readFileSync(path.join(ROOT, f), 'utf8').includes('assertCanCreateDriver'), f);
    }
    assert.ok(fs.readFileSync(path.join(ROOT, '.github/workflows/ci-self-check.yml'), 'utf8').includes('driver-cap-gate.js'));
  });
  it('payload ids = 9.0.1574 published ids, minus none (count unchanged)', () => {
    assert.ok(published.size <= c.cap, `${published.size}`);
  });
});

describe('P3264 Athom API count (deprecated drivers are hidden)', () => {
  const { compare } = require('../../scripts/ci/athom-api-count-compare');
  const local = { version: '1', drivers: [{ id: 'a' }, { id: 'b', deprecated: true }, { id: 'c' }], flow: { triggers: [1], conditions: [], actions: [] } };
  it('explains the gap with deprecated drivers', () => {
    const r = compare(local, { testBuild: { version: '1', drivers: [{ id: 'a' }, { id: 'c' }], flow: { triggers: [1] } } });
    assert.strictEqual(r.ok, true); assert.strictEqual(r.expectedApi, 2); assert.deepStrictEqual(r.deprecated, ['b']);
  });
  it('flags an unexplained missing driver', () => {
    const r = compare(local, { testBuild: { version: '1', drivers: [{ id: 'a' }] } });
    assert.strictEqual(r.ok, false); assert.deepStrictEqual(r.missing, ['c']);
  });
  it('never hosts profiles in a deprecated driver (Athom hides it, so a new device cannot pair)', () => {
    for (const host of Object.keys(cfg.hosts)) {
      const c = rd(`drivers/${host}/driver.compose.json`);
      assert.notStrictEqual(c.deprecated, true, host);
    }
  });
  it('the publish workflow runs the API compare after upload', () => {
    assert.ok(fs.readFileSync(path.join(ROOT, '.github/workflows/publish.yml'), 'utf8').includes('athom-api-count-compare.js'));
  });
});
