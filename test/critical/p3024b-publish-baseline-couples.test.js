'use strict';

/**
 * P3024b (ported by P3024c) — no couple of the last Athom Test package (or of the current candidate) may vanish.
 *
 * WHY: the 14000 combo cap (our own heuristic, not an Athom limit) silently dropped 259 couples
 * (192 mfrs) that 9.0.1574 (build #3655) shipped, e.g. 52 on device_radiator_valve. Cause: a pin
 * protected its whole case key, so case variants added to the source later were uncuttable and the
 * budget was taken from real couples. Fix: pin every baseline couple exactly, trim only unpinned
 * case variants first, re-pin orphaned couples on their shipped driver, and gate prepare-publish.
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { describe, it } = require('../_support/dual-runner');
const {
  compactZigbeeIdentifiers,
  resolveBaselinePins,
  baselineCouples,
  loadPublishBaseline,
} = require('../../scripts/maintenance/compact-zigbee-identifiers.cjs');
const { checkBaseline, payloadCouples } = require('../../scripts/maintenance/publish-baseline-gate.cjs');
const { mergeDrivers, countCouples } = require('../../scripts/maintenance/build-publish-baseline.cjs');

const ROOT = path.join(__dirname, '..', '..');
const FIXTURE = path.join(ROOT, 'test', 'fixtures', 'athom-last-test-package-couples.json');
const NO_DB = { byMfr: new Map(), byDriver: new Map() };

const drv = (id, m, p) => ({ id, zigbee: { manufacturerName: m, productId: p } });
const base = (drivers, exemptions = []) => ({ version: 't', drivers, exemptions });

describe('P3024b publish baseline couples', () => {
  it('fixture is THIS branch\'s last Athom Test package (1.0.209, build #217), additive', () => {
    const f = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
    const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
    // P3024c: each branch pins its OWN app's Test package, never master's.
    assert.strictEqual(f.appId, 'com.dlnraja.tuya.zigbee.bastien');
    assert.strictEqual(f.appId, app.id);
    assert.ok(Array.isArray(f.sources) && f.sources[0].version === '1.0.209');
    assert.ok(Number(f.build) >= 217);
    assert.ok(Object.keys(f.drivers).length >= 27, `drivers ${Object.keys(f.drivers).length}`);
    assert.ok(f.couples >= 3764, `couples ${f.couples}`);
    assert.strictEqual(countCouples(f.drivers), f.couples);
  });

  it('pins in place, moves to the cheapest single owner, re-pins orphans, honours exemptions', () => {
    const manifest = {
      drivers: [
        drv('a', ['_TZ_A'], ['TS1']),
        drv('wide', ['_M1', '_M2', '_M3', '_TZ_B'], ['TS9', 'TS2']),
        drv('narrow', ['_TZ_B'], ['TS2']),
        drv('c', ['_X'], ['TS3']),
      ],
    };
    const b = base({
      a: { m: ['_TZ_A'], p: ['TS1'] }, // in place
      old: { m: ['_TZ_B'], p: ['TS2'] }, // driver gone, couple owned by wide + narrow
      c: { m: ['_ORPHAN'], p: ['TS3'] }, // nobody owns _ORPHAN+TS3 -> re-pin on c
      gone: { m: ['_G', '_E'], p: ['TS4'] }, // driver gone, no owner
    }, [{ mfr: '_E', pid: 'TS4', reason: 'test exemption' }]);
    const r = resolveBaselinePins(manifest, b);
    const key = (p) => `${p.mfr}+${p.pid}@${p.driverId}`;
    const pins = r.pins.map(key);
    assert.ok(pins.includes('_TZ_A+TS1@a'));
    assert.ok(pins.includes('_ORPHAN+TS3@c'));
    // one couple, one driver — and never on the 4-mfr driver when a 1-mfr owner exists
    assert.deepStrictEqual(pins.filter((k) => k.startsWith('_TZ_B+TS2@')).length, 1);
    assert.strictEqual(r.moved, 1);
    assert.strictEqual(r.restored, 1);
    assert.deepStrictEqual(r.unresolved, ['_G+TS4 @ gone']);
  });

  it('budget pass trims unpinned case variants before any real couple', () => {
    const manifest = {
      drivers: [
        drv('contact', ['_TZ3000_aaaaaaaa', '_TZ3000_bbbbbbbb'], ['TS0203', 'ts0203', 'Ts0203']),
        drv('other', ['_TZ3000_cccccccc', '_TZ3000_dddddddd'], ['TS0601']),
      ],
    };
    const b = base({ contact: { m: ['_TZ3000_aaaaaaaa', '_TZ3000_bbbbbbbb'], p: ['TS0203'] } });
    const r = compactZigbeeIdentifiers(manifest, {
      mfsDb: NO_DB, sacredKeep: [], baseline: b, maxTotalCombos: 4, maxDriverCombos: 1500, maxCaseForms: 2,
    });
    assert.ok(!r.overTotalLimit, `after ${r.afterTotal}`);
    const contact = manifest.drivers.find((d) => d.id === 'contact');
    assert.deepStrictEqual(contact.zigbee.productId, ['TS0203']);
    const other = manifest.drivers.find((d) => d.id === 'other');
    assert.strictEqual(other.zigbee.manufacturerName.length, 2, 'unpinned real couples kept');
    assert.deepStrictEqual(checkBaseline(manifest, b).missing, []);
  });

  it('gate fails when a baseline couple disappears, accepts a move and an exemption', () => {
    const b = base({ x: { m: ['_TZ_A', '_tz_a'], p: ['TS1'] } }, [{ mfr: '_tz_a', pid: 'TS1', reason: 'r' }]);
    const ok = { drivers: [drv('y', ['_TZ_A'], ['TS1'])] }; // moved driver: allowed
    assert.deepStrictEqual(checkBaseline(ok, b).missing, []);
    const bad = { drivers: [drv('y', ['_tz_A'], ['TS1'])] }; // case changed: exact couple lost
    assert.deepStrictEqual(checkBaseline(bad, b).missing, ['_TZ_A+TS1 (was x)']);
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'p3024b-'));
    const appFile = path.join(tmp, 'app.json');
    const baseFile = path.join(tmp, 'b.json');
    fs.writeFileSync(appFile, JSON.stringify(bad));
    fs.writeFileSync(baseFile, JSON.stringify(b));
    const gate = path.join(ROOT, 'scripts', 'maintenance', 'publish-baseline-gate.cjs');
    assert.throws(() => execFileSync(process.execPath, [gate, appFile, baseFile], { stdio: 'pipe' }));
    fs.writeFileSync(appFile, JSON.stringify(ok));
    execFileSync(process.execPath, [gate, appFile, baseFile], { stdio: 'pipe' });
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('P3024c: restored[] couples of an older Test package count exactly (no cross couple invented)', () => {
    const b = { version: 't', drivers: { a: { m: ['_A'], p: ['TS1'] } },
      restored: [{ mfr: '_B', pid: 'TS2', driverId: 'a', from: 'old' }], exemptions: [] };
    const keys = baselineCouples(b).map((c) => `${c.mfr}+${c.pid}@${c.driverId}`).sort();
    assert.deepStrictEqual(keys, ['_A+TS1@a', '_B+TS2@a']);
    const gone = checkBaseline({ drivers: [drv('a', ['_A'], ['TS1'])] }, b).missing;
    assert.deepStrictEqual(gone, ['_B+TS2 (was a)']);
    const r = resolveBaselinePins({ drivers: [drv('a', ['_A'], ['TS1'])] }, b);
    assert.deepStrictEqual(r.unresolved, []);
    assert.strictEqual(r.restored, 1);
    const f = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
    for (const x of f.restored || []) {
      assert.ok(x.mfr && x.pid && x.driverId && x.from, JSON.stringify(x));
      const e = f.drivers[x.driverId];
      assert.ok(!(e && e.m.includes(x.mfr) && e.p.includes(x.pid)), `restored dup ${x.mfr}+${x.pid}`);
    }
    for (const e of f.exemptions || []) assert.ok(e.mfr && e.pid && e.driverId && e.reason);
  });

  it('baseline builder merge never removes a couple', () => {
    const merged = mergeDrivers({ a: { m: ['_A'], p: ['TS1'] } }, { a: { m: ['_B'], p: ['TS2'] }, b: { m: ['_C'], p: ['TS3'] } });
    assert.deepStrictEqual(merged.a, { m: ['_A', '_B'], p: ['TS1', 'TS2'] });
    assert.deepStrictEqual(merged.b, { m: ['_C'], p: ['TS3'] });
  });

  it('prepare-publish wires the pins and the gate (5a + 5a2b)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'scripts', 'prepare-publish.js'), 'utf8');
    assert.match(src, /baselineUnresolved/);
    assert.match(src, /publish-baseline-gate\.cjs/);
    assert.match(src, /checkBaseline\(/);
  });

  it('every workflow publishing to Athom uses a cap that fits the pinned baseline (<= 20000)', () => {
    for (const wf of ['auto-publish-on-push.yml', 'publish-stable.yml', 'bastien-publish.yml']) {
      const file = path.join(ROOT, '.github', 'workflows', wf);
      if (!fs.existsSync(file)) continue;
      const y = fs.readFileSync(file, 'utf8');
      const cap = Number((y.match(/HOMEY_ZIGBEE_MAX_TOTAL_COMBOS:\s*["']?(\d+)/) || [])[1]);
      assert.ok(cap >= 15500 && cap <= 20000, `${wf} cap ${cap}`);
    }
  });

  it('every baseline couple (last Test package of this app) survives compaction of the real manifest exactly', function () {
    if (this && this.timeout) this.timeout(120000);
    const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
    const y = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'bastien-publish.yml'), 'utf8');
    const cap = Number(y.match(/HOMEY_ZIGBEE_MAX_TOTAL_COMBOS:\s*["']?(\d+)/)[1]);
    const baseline = loadPublishBaseline(ROOT);
    const r = compactZigbeeIdentifiers(manifest, {
      repoRoot: ROOT, maxTotalCombos: cap, maxDriverCombos: 1500, maxCaseForms: 2,
    });
    assert.deepStrictEqual(r.baselineUnresolved, []);
    assert.ok(!r.overTotalLimit, `combos ${r.afterTotal} > ${cap}`);
    assert.deepStrictEqual(r.sacredMissing, []);
    const missing = checkBaseline(manifest, baseline).missing;
    assert.deepStrictEqual(missing.slice(0, 10), [], `${missing.length} baseline couples lost`);
    // Exact pairing: each couple is present byte-exact in at least one shipped driver.
    const have = payloadCouples(manifest);
    const exempt = new Set((baseline.exemptions || []).map((e) => `${e.mfr}\u0000${e.pid}`));
    for (const c of baselineCouples(baseline)) {
      const k = `${c.mfr}\u0000${c.pid}`;
      if (!exempt.has(k)) assert.ok(have.has(k), `${c.mfr}+${c.pid} (was ${c.driverId})`);
    }
  });

  it('runtime fingerprint lookup is caseless (fallback for already-paired devices)', () => {
    const db = require('../../lib/tuya/DeviceFingerprintDB.js');
    const mfr = db.getAllManufacturerNames().find((m) => /^_tz/i.test(m) && m !== m.toLowerCase());
    const want = db.getFingerprint(mfr).driverId;
    assert.ok(want);
    for (const form of [mfr, mfr.toLowerCase(), mfr.toUpperCase()]) {
      assert.strictEqual(db.getFingerprint(form).driverId, want, form);
    }
  });
});
