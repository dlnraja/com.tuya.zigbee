'use strict';
// P3077 (owner t614u, 27/10/2026): one couple, one driver. Each listed mfr reached a wrong-class driver only
// through the mfr x pid cartesian product; it is dropped there and stays on the driver of its real hardware,
// which must still list the real productId. Baseline couples lost get an approved exemption.
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const zig = (d) => JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', d, 'driver.compose.json'), 'utf8')).zigbee;
const lists = (z, m) => (z.manufacturerName || []).some((x) => x.toLowerCase() === m.toLowerCase());
const decisions = require(path.join(ROOT, 'config/architecture/p3077-phantom-decisions.json'));

describe('P3077 phantom moves', () => {
  it('every move is sourced and the mfr left the wrong driver', () => {
    assert.ok(decisions.moves.length >= 30);
    for (const m of decisions.moves) {
      assert.ok(/^https:\/\//.test(m.source) && m.author, `source for ${m.mfr}`);
      assert.ok(!lists(zig(m.from), m.mfr), `${m.mfr} still on ${m.from}`);
    }
  });
  it('the real-class driver keeps the mfr with its real productId', () => {
    for (const m of decisions.moves) {
      const z = zig(m.keptOn);
      assert.ok(lists(z, m.mfr), `${m.mfr} missing on ${m.keptOn}`);
      const pids = new Set((z.productId || []).map((p) => p.toUpperCase()));
      assert.ok(m.realPid.split('/').some((p) => pids.has(p.toUpperCase())), `${m.keptOn} lacks ${m.realPid}`);
    }
  });
  it('baseline couples dropped by P3077 carry an approved exemption', () => {
    const b = require(path.join(ROOT, 'test/fixtures/athom-last-test-package-couples.json'));
    const ex = b.exemptions.filter((e) => e.approvedBy === 't614u');
    assert.ok(ex.length >= 26);
    for (const e of ex) {assert.ok(e.reason && e.date && e.driverId, `${e.mfr}+${e.pid}`);}
  });
  it('an exempted couple is not re-pinned on another driver that only owns it by cartesian', () => {
    const { resolveBaselinePins } = require(path.join(ROOT, 'scripts/maintenance/compact-zigbee-identifiers.cjs'));
    const drv = (id, m, p) => ({ id, zigbee: { manufacturerName: m, productId: p } });
    const manifest = { drivers: [drv('plug', ['_A', '_B'], ['TS011F', 'TS0002']), drv('gas', ['_A'], ['TS011F'])] };
    const baseline = {
      drivers: { gas: { m: ['_A'], p: ['TS011F', 'TS0002'] }, plug: { m: ['_B'], p: ['TS0002'] } },
      exemptions: [{ mfr: '_A', pid: 'TS0002', driverId: 'gas', reason: 'parasite' }],
    };
    const keys = resolveBaselinePins(manifest, baseline).pins.map((p) => `${p.mfr}+${p.pid}@${p.driverId}`);
    assert.ok(keys.includes('_A+TS011F@gas'));
    assert.ok(keys.includes('_B+TS0002@plug'));
    assert.ok(!keys.some((k) => k.startsWith('_A+TS0002@')), keys.join(' '));
  });
  it('batch 2: dpo1ysak left plug with approved exemptions', () => {
    const b = require(path.join(ROOT, 'test/fixtures/athom-last-test-package-couples.json'));
    const ex = b.exemptions.filter((e) => e.driverId === 'plug' && e.mfr.toLowerCase() === '_tz3000_dpo1ysak');
    assert.ok(ex.length >= 12 && ex.every((e) => e.approvedBy === 't614u'));
  });
  it('batch 3: manufacturer ids are not used as productIds on the water leak drivers', () => {
    for (const b of decisions.badPids) {
      for (const d of b.drivers) {assert.ok(!(zig(d).productId || []).some((p) => p.toLowerCase() === b.pid.toLowerCase()), `${b.pid} still a pid on ${d}`);}
    }
    assert.ok(lists(zig('water_leak_sensor'), '_TZ3000_kyb656no'));
  });
  it('batch 4: TS130F curtain switches left curtain_motor_shutter with approved exemptions', () => {
    const b = require(path.join(ROOT, 'test/fixtures/athom-last-test-package-couples.json'));
    const ex = b.exemptions.filter((e) => e.driverId === 'curtain_motor_shutter' && /P3077 batch 4/.test(e.reason));
    assert.ok(ex.length >= 72 && ex.every((e) => e.approvedBy === 't614u'));
    assert.ok(zig('curtain_motor').productId.includes('TS130F'));
  });
  it('batch 5: heobian is a read-time alias only, never a compose form', () => {
    const TU = require(path.join(ROOT, 'lib/utils/TuyaNormalizer'));
    for (const d of fs.readdirSync(path.join(ROOT, 'drivers'))) {
      const fp = path.join(ROOT, 'drivers', d, 'driver.compose.json');
      if (!fs.existsSync(fp)) {continue;}
      const z = JSON.parse(fs.readFileSync(fp, 'utf8')).zigbee || {};
      assert.ok(!(z.manufacturerName || []).some((m) => m.toLowerCase() === 'heobian'), `heobian on ${d}`);
    }
    assert.ok(lists(zig('button_wireless_1'), 'HOBEIAN'));
    assert.equal(TU.normalize('Heobian'), TU.normalize('HOBEIAN'));
    assert.ok(!TU.brandAthomForms('HOBEIAN').some((m) => m.toLowerCase() === 'heobian'));
    const b = require(path.join(ROOT, 'test/fixtures/athom-last-test-package-couples.json'));
    const ex = b.exemptions.filter((e) => /P3077 batch 5/.test(e.reason));
    assert.ok(ex.length >= 10 && ex.every((e) => e.approvedBy === 't614u'));
  });
  it('batch 6: pzui3skt is a button, not a knob; HOBEIAN ZG-101ZD pairs on the knob driver', () => {
    assert.ok(!lists(zig('smart_knob_rotary'), '_TZ3000_pzui3skt'));
    assert.ok(lists(zig('button_wireless_1'), '_TZ3000_pzui3skt') && zig('button_wireless_1').productId.includes('TS0041'));
    assert.ok(!/pzui3skt/i.test(fs.readFileSync(path.join(ROOT, 'lib/zigbee/DeviceOperatingMode.js'), 'utf8').split('\n').filter((l) => !l.trim().startsWith('//')).join('\n')));
    const ssot = require(path.join(ROOT, 'config/architecture/rotary-knob-ssot.json'));
    assert.ok(!JSON.stringify(ssot).toLowerCase().includes('pzui3skt'));
    for (const pm of decisions.pidMoves) {
      assert.ok(/^https:\/\//.test(pm.source) && pm.author);
      assert.ok(lists(zig(pm.to), pm.mfr) && zig(pm.to).productId.includes(pm.pid), `${pm.mfr}|${pm.pid} not on ${pm.to}`);
      assert.ok(!zig(pm.from).productId.some((p) => p.toLowerCase() === pm.pid.toLowerCase()), `${pm.pid} still on ${pm.from}`);
    }
    assert.equal(require(path.join(ROOT, 'lib/DeviceFingerprintDB')).lookup('HOBEIAN', 'ZG-101ZD').driver, 'smart_knob_zg101zd');
    const b = require(path.join(ROOT, 'test/fixtures/athom-last-test-package-couples.json'));
    assert.ok(b.exemptions.filter((e) => /P3077 batch 6/.test(e.reason) && e.approvedBy === 't614u').length >= 18);
  });
  it('batch 7: _TZ3000_42ha4rsc parasite is off every driver and forbid-only in mfs_db', () => {
    for (const p of decisions.parasiteDrops) {
      assert.ok(/^https:\/\//.test(p.source) && p.author);
      for (const d of fs.readdirSync(path.join(ROOT, 'drivers'))) {
        const fp = path.join(ROOT, 'drivers', d, 'driver.compose.json');
        if (fs.existsSync(fp)) {assert.ok(!lists(JSON.parse(fs.readFileSync(fp, 'utf8')).zigbee || {}, p.mfr), `${p.mfr} on ${d}`);}
      }
      const mfs = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/mfs_db.json'), 'utf8'));
      if (mfs[p.mfr]) {assert.ok(/forbid-only/.test(mfs[p.mfr].source));}
    }
    assert.ok(lists(zig('curtain_motor'), '_TZB000_42ha4rsc'));
  });
  it('batch 8: Loginovo ZG-101Z SOS ids pair on button_emergency_sos, which reads DP26/DP29', () => {
    for (const m of ['_TZE200_vrcfo4i0', '_TZE200_nojsjtj2']) {
      assert.ok(lists(zig('button_emergency_sos'), m) && zig('button_emergency_sos').productId.includes('TS0601'), m);
      for (const d of ['gas_sensor', 'climate_sensor', 'presence_sensor_radar', 'contact_sensor']) {assert.ok(!lists(zig(d), m), `${m} on ${d}`);}
    }
    const src = fs.readFileSync(path.join(ROOT, 'drivers/button_emergency_sos/device.js'), 'utf8');
    assert.ok(/dp === 26 \|\| dp === 29/.test(src));
    const fp = require(path.join(ROOT, 'lib/tuya/fingerprints.json'));
    assert.equal(fp._TZE200_vrcfo4i0.driverId, 'button_emergency_sos');
  });
  it('batch 9: Nous E8 smoke ids pair on the TS0601 smoke driver, the short dcnsggv id on the dimmer', () => {
    // WHY: Z2M tuya.ts TS0601_smoke_1 (Nous E8) and TS0601_dimmer_5 (_TZE200_dcnsggv next to dcnsggvz).
    for (const m of ['_TZE200_0zaf1cr8', '_TZE284_0zaf1cr8']) {
      assert.ok(lists(zig('smoke_sensor_ts0601_dp'), m) && !lists(zig('switch_3gang'), m), m);
    }
    assert.ok(lists(zig('wall_dimmer_tuya'), '_TZE200_dcnsggv') && zig('wall_dimmer_tuya').productId.includes('TS0601'));
    assert.ok(!lists(zig('climate_sensor'), '_TZE200_dcnsggv'));
    assert.ok(lists(zig('wall_dimmer_tuya'), '_TZE200_dcnsggvz'));
    const fp = require(path.join(ROOT, 'lib/tuya/fingerprints.json'));
    assert.equal(fp._TZE200_0zaf1cr8.driverId, 'smoke_sensor_ts0601_dp');
    assert.equal(fp._TZE200_dcnsggv.driverId, 'wall_dimmer_tuya');
    assert.strictEqual(require(path.join(ROOT, 'lib/utils/CoupleGuard')).checkCouple('smoke_sensor_ts0601_dp', '_TZE284_0zaf1cr8', 'TS0601').ok, true);
  });
  it('batch 10: only the sourced _TZE200_4mh6tyyo dimmer id is left, on dimmer_1_gang_tuya', () => {
    assert.ok(lists(zig('dimmer_1_gang_tuya'), '_TZE200_4mh6tyyo'));
    for (const d of ['dimmer_1_gang_tuya', 'dimmer_wall_1gang']) {
      for (const m of ['_TZE204_4mh6tyyo', '_TZE284_4mh6tyyo']) {assert.ok(!lists(zig(d), m), `${m} on ${d}`);}
    }
  });
});
