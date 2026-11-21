'use strict';
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const { compactZigbeeIdentifiers } = require('../../scripts/maintenance/compact-zigbee-identifiers.cjs');

// P3351 (16/11/2026 Paris): P3345 pinned _TZE284_lqhqj73n+TS0601 on the held continuation
// curtain_motor_2, a driver held out of the payload (P3095 hold, not a registered continuation),
// so the compaction audit and the P3201 sourced pass reported the pin missing and exited:
// scheduled Platform Budget red, any master prepare-publish blocked. A pin on a held driver
// that is absent from the manifest is deferred; any other missing pin still fails.
const manifest = () => ({
  id: 'com.example.p3351',
  drivers: [{ id: 'curtain_motor', class: 'windowcoverings', zigbee: { manufacturerName: ['_TZE200_aaaaaaaa'], productId: ['TS0601'] } }],
});
const pin = { mfr: '_TZE284_lqhqj73n', pid: 'TS0601', driverId: 'curtain_motor_2' };

describe('P3351 sacred pins on held drivers are deferred, not fatal', () => {
  it('held continuation pin absent from the manifest is not reported missing', () => {
    const r = compactZigbeeIdentifiers(manifest(), { sacredKeep: [pin], baseline: null, holdIds: new Set(['curtain_motor_2']) });
    assert.deepStrictEqual(r.sacredMissing, []);
  });
  it('the same pin still fails when the driver is not held', () => {
    const r = compactZigbeeIdentifiers(manifest(), { sacredKeep: [pin], baseline: null, holdIds: new Set() });
    assert.strictEqual(r.sacredMissing.length, 1);
    assert.ok(/driver missing in publish/.test(r.sacredMissing[0]));
  });
});

describe('P3351 sourced pass (P3201) defers sacred pins on held drivers', () => {
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const sp = require('../../scripts/maintenance/publish-sourced-restore.cjs');
  const setup = () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'p3351-'));
    fs.mkdirSync(path.join(root, 'config', 'architecture'), { recursive: true });
    fs.writeFileSync(path.join(root, 'config', 'architecture', 'publish-sacred-keep-couples.json'), JSON.stringify({ couples: [pin] }));
    const file = path.join(root, 'app.json');
    fs.writeFileSync(file, JSON.stringify(manifest()));
    return { root, file };
  };
  it('held driver absent from the payload: deferred, not missing', () => {
    const { root, file } = setup();
    const r = sp.sourcedPassFile(manifest(), file, { repoRoot: root, maxTotal: 100, maxDriver: 100, holdIds: new Set(['curtain_motor_2']), ratchet: new Set() });
    assert.deepStrictEqual(r.sacredMissing, []);
    assert.deepStrictEqual(r.sacredDeferred, ['curtain_motor_2#_TZE284_lqhqj73n#TS0601']);
  });
  it('driver not held: still reported missing', () => {
    const { root, file } = setup();
    const r = sp.sourcedPassFile(manifest(), file, { repoRoot: root, maxTotal: 100, maxDriver: 100, holdIds: new Set(), ratchet: new Set() });
    assert.strictEqual(r.sacredMissing.length, 1);
  });
});

describe('P3360 sacred pins on pending-split released continuations are deferred, not fatal', () => {
  it('released continuation folded only for compaction is not reported missing', () => {
    const r = compactZigbeeIdentifiers(manifest(), { sacredKeep: [pin], baseline: null, holdIds: new Set(), pendingSplitIds: new Set(['curtain_motor_2']) });
    assert.deepStrictEqual(r.sacredMissing, []);
  });
  it('the same pin still fails without hold or pending split', () => {
    const r = compactZigbeeIdentifiers(manifest(), { sacredKeep: [pin], baseline: null, holdIds: new Set(), pendingSplitIds: new Set() });
    assert.strictEqual(r.sacredMissing.length, 1);
    assert.ok(/driver missing in publish/.test(r.sacredMissing[0]));
  });
});

describe('P3360 sourced pass defers sacred pins on pending-split continuations', () => {
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const sp = require('../../scripts/maintenance/publish-sourced-restore.cjs');
  const setup = () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'p3360-split-'));
    fs.mkdirSync(path.join(root, 'config', 'architecture'), { recursive: true });
    fs.writeFileSync(path.join(root, 'config', 'architecture', 'publish-sacred-keep-couples.json'), JSON.stringify({ couples: [pin] }));
    const file = path.join(root, 'app.json');
    fs.writeFileSync(file, JSON.stringify(manifest()));
    return { root, file };
  };
  it('pending-split driver absent from the payload: deferred, not missing', () => {
    const { root, file } = setup();
    const r = sp.sourcedPassFile(manifest(), file, { repoRoot: root, maxTotal: 100, maxDriver: 100, holdIds: new Set(), pendingSplitIds: new Set(['curtain_motor_2']), ratchet: new Set() });
    assert.deepStrictEqual(r.sacredMissing, []);
    assert.deepStrictEqual(r.sacredDeferred, ['curtain_motor_2#_TZE284_lqhqj73n#TS0601']);
  });
});
