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
    assert.ok(decisions.moves.length >= 24);
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
});
