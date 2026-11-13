'use strict';
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const {
  reviewCouples, replayCompaction, assertionsWeakened, targetedTests,
  identityProblems, botApprovalVerdict,
} = require('../../scripts/ci/autonomous-review.cjs');
const { compactZigbeeIdentifiers } = require('../../scripts/maintenance/compact-zigbee-identifiers.cjs');

function drv(id, mfrs, pids, className) {
  return { id, class: className || 'thermostat', zigbee: { manufacturerName: mfrs, productId: pids } };
}

describe('P3284 autonomous review', () => {
  const source = {
    '_tze204_ltwbm23f|ts0601': {
      url: 'https://github.com/Koenkk/zigbee-herdsman-converters/issues/1',
      drivers: ['device_radiator_valve'],
      deviceClass: 'thermostat',
    },
  };

  it('fails a duplicate exact couple, then passes when it lives on one driver', () => {
    const shared = drv('device_radiator_valve', ['_TZE204_ltwbm23f'], ['TS0601']);
    const parasite = drv('switch_1gang', ['_TZE204_ltwbm23f'], ['TS0601'], 'socket');
    const bad = reviewCouples({ before: [shared], after: [shared, parasite], sources: source });
    assert.strictEqual(bad.ok, false);
    assert.ok(bad.problems.some((p) => p.includes('2 drivers')));
    const good = reviewCouples({ before: [shared], after: [shared], sources: source });
    assert.strictEqual(good.ok, true);
  });

  it('fails a removed couple and passes when that couple moved', () => {
    const from = drv('radiator_valve', ['_TZE200_move'], ['TS0601']);
    const gone = reviewCouples({ before: [from], after: [], sources: {} });
    assert.strictEqual(gone.ok, false);
    assert.ok(gone.problems.some((p) => p.startsWith('removed ')));
    const to = drv('device_radiator_valve', ['_TZE200_move'], ['TS0601']);
    const moved = reviewCouples({ before: [from], after: [to], sources: {} });
    assert.strictEqual(moved.ok, true);
    assert.ok(moved.moved.some((p) => p.includes('radiator_valve -> device_radiator_valve')));
  });

  it('fails an invented couple, then passes with a couple-sources URL and the matching class', () => {
    const valve = drv('device_radiator_valve', ['_TZE204_ltwbm23f'], ['TS0601']);
    const invented = reviewCouples({ before: [], after: [valve], sources: {} });
    assert.strictEqual(invented.ok, false);
    assert.ok(invented.problems.some((p) => p.startsWith('invented ')));
    const placed = reviewCouples({ before: [], after: [valve], sources: source });
    assert.strictEqual(placed.ok, true);
    const wrongClass = drv('switch_1gang', ['_TZE204_ltwbm23f'], ['TS0601'], 'socket');
    const mismatch = reviewCouples({
      before: [],
      after: [wrongClass],
      sources: source,
    });
    assert.strictEqual(mismatch.ok, false);
  });

  it('does not treat a many-by-many matrix as exact couples', () => {
    const broad = drv('climate_sensor', ['_A', '_B'], ['TS0201', 'TS0601'], 'sensor');
    const other = drv('switch_1gang', ['_A'], ['TS0601'], 'socket');
    const verdict = reviewCouples({ before: [other], after: [broad, other], sources: {} });
    assert.strictEqual(verdict.ok, true);
  });

  it('fails when compaction drops a sacred couple and passes when the pin survives', () => {
    const manifest = {
      id: 'fixture',
      drivers: [drv('device_radiator_valve', ['_TZE200_sacred1'], ['TS0601'])],
    };
    const sacred = [{ mfr: '_TZE200_sacred1', pid: 'TS0601', driverId: 'device_radiator_valve' }];
    const dropped = replayCompaction(manifest, sacred, (copy) => {
      copy.drivers[0].zigbee.manufacturerName = [];
    });
    assert.strictEqual(dropped.ok, false);
    const kept = replayCompaction(JSON.parse(JSON.stringify(manifest)), sacred, (copy) => {
      compactZigbeeIdentifiers(copy, {
        repoRoot: '/tmp/autonomous-review-no-db',
        baseline: null,
        holdIds: new Set(),
        sacredKeep: sacred,
        maxDriverCombos: 1,
        maxTotalCombos: 1,
      });
    });
    assert.strictEqual(kept.ok, true, kept.missing && kept.missing.join('; '));
  });

  it('fails a weakened test and passes an added assertion', () => {
    const before = 'assert.strictEqual(a, 1);\nassert.equal(b, 2);\n';
    const skipped = assertionsWeakened(before, 'it.skip("x", () => { assert.strictEqual(a, 1); });\n');
    assert.strictEqual(skipped.ok, false);
    const fewer = assertionsWeakened(before, 'assert.ok(a);\n');
    assert.strictEqual(fewer.ok, false);
    const more = assertionsWeakened(before, before + 'assert.strictEqual(c, 3);\n');
    assert.strictEqual(more.ok, true);
  });

  it('selects critical tests that mention a touched driver', () => {
    const dir = require('os').tmpdir();
    const fs = require('fs');
    const path = require('path');
    const hit = path.join(dir, 'p-trv.test.js');
    const miss = path.join(dir, 'p-other.test.js');
    fs.writeFileSync(hit, 'device_radiator_valve keeps TRV602Z');
    fs.writeFileSync(miss, 'unrelated switch');
    const selected = targetedTests(['drivers/device_radiator_valve/driver.compose.json'], dir, () => [hit, miss]);
    assert.deepStrictEqual(selected.files, [hit]);
    fs.unlinkSync(hit); fs.unlinkSync(miss);
  });

  it('fails the wrong app identity and a generic changelog, then passes the master identity', () => {
    const bad = identityProblems(
      { id: 'com.example.other', name: { en: 'Other' }, version: '1.2.3' },
      'master',
      {},
      '',
    );
    assert.strictEqual(bad.ok, false);
    const generic = identityProblems(
      { id: 'com.dlnraja.tuya.zigbee', name: { en: 'Universal Tuya' }, version: '9.0.2' },
      'master',
      { '9.0.2': { en: 'Reliability: 3 small fixes in the app core.' } },
      '9.0.1',
    );
    assert.strictEqual(generic.ok, false);
    const good = identityProblems(
      { id: 'com.dlnraja.tuya.zigbee', name: { en: 'Universal Tuya' }, version: '9.0.2' },
      'master',
      { '9.0.2': { en: 'Fixed TRV602Z pairing on device_radiator_valve.' } },
      '9.0.1',
    );
    assert.strictEqual(good.ok, true);
  });

  it('does not treat a bot approval as review when Bugbot was skipped', () => {
    const blocked = botApprovalVerdict({
      approvals: [{ state: 'APPROVED', user: { login: 'cursor[bot]' } }],
      checks: [{ name: 'Cursor Bugbot', conclusion: 'skipped' }],
      semanticOk: false,
    });
    assert.strictEqual(blocked.ok, false);
    assert.strictEqual(blocked.botApprovalCounted, false);
    assert.strictEqual(blocked.needsSemantic, true);
    const passed = botApprovalVerdict({
      approvals: [{ state: 'APPROVED', user: { login: 'cursor[bot]' } }],
      checks: [{ name: 'Cursor Bugbot', conclusion: 'skipped' }],
      semanticOk: true,
    });
    assert.strictEqual(passed.ok, true);
    assert.strictEqual(passed.botApprovalCounted, false);
    assert.match(passed.reason, /not a review/);
  });
});
