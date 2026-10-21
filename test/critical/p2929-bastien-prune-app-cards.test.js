'use strict';
/**
 * P2929 — Bastien publish prune must keep the app-level flow cards the code uses
 * (diag 17-18/10 v1.0.161: "Invalid Flow Card ID" + Flows/buttons not firing).
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const prune = require('../../scripts/maintenance/bastien-publish-fleet-prune.js');

function run(manifest, referenced) {
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'p2926-')), 'app.json');
  fs.writeFileSync(f, JSON.stringify(manifest));
  const r = prune.pruneBastienPublishFleet(f, { referencedCardIds: new Set(referenced) });
  return { r, out: JSON.parse(fs.readFileSync(f, 'utf8')) };
}

describe('P2929 app-level cards survive the Bastien prune', () => {
  const ssot = require('../../config/architecture/bastien-publish-fleet-ssot.json');
  const kept = ssot.keepDriverIds.slice(0, 8).map((id) => ({ id }));
  const manifest = {
    id: prune.APP_ID,
    drivers: [...kept, { id: 'zz_pruned_driver' }],
    flow: {
      triggers: [
        { id: 'button_pressed', args: [{ name: 'device', type: 'device', filter: 'capabilities=onoff' }] },
        { id: 'unused_app_card' },
        { id: 'zz_pruned_driver_fired' },
        { id: 'orphan_card', args: [{ name: 'device', type: 'device', filter: 'driver_id=zz_pruned_driver' }] },
        { id: 'mixed_card', args: [{ name: 'device', type: 'device', filter: `driver_id=zz_pruned_driver|${kept[0].id}` }] },
        { id: 'home_mode_changed' },
      ],
      conditions: [], actions: [{ id: 'tuya_dp_send' }],
    },
  };
  const { out } = run(manifest, ['button_pressed', 'orphan_card', 'mixed_card', 'tuya_dp_send', 'zz_pruned_driver_fired']);
  const ids = out.flow.triggers.map((c) => c.id);
  it('keeps referenced app-level cards', () => {
    assert.ok(ids.includes('button_pressed'));
    assert.ok(ids.includes('home_mode_changed'));
    assert.deepEqual(out.flow.actions.map((c) => c.id), ['tuya_dp_send']);
  });
  it('drops unused, pruned-driver and orphan cards', () => {
    assert.ok(!ids.includes('unused_app_card'));
    assert.ok(!ids.includes('zz_pruned_driver_fired'));
    assert.ok(!ids.includes('orphan_card'));
  });
  it('trims a driver_id filter to kept drivers', () => {
    const m = out.flow.triggers.find((c) => c.id === 'mixed_card');
    assert.equal(m.args[0].filter, `driver_id=${kept[0].id}`);
  });
  it('scans the real code base for referenced ids', () => {
    const ref = prune.collectReferencedCardIds(path.join(__dirname, '..', '..'));
    assert.ok(ref.has('button_pressed'));
    assert.ok(ref.size > 100);
  });
});

describe('P2928 longest-prefix card ownership', () => {
  it('a kept driver does not claim cards of a pruned driver sharing its prefix', () => {
    const ssot = require('../../config/architecture/bastien-publish-fleet-ssot.json');
    const kept = ssot.keepDriverIds.slice(0, 8).map((id) => ({ id }));
    const k = kept[0].id;
    const { out } = run({ id: prune.APP_ID, drivers: [...kept, { id: `${k}_zzpruned` }],
      flow: { triggers: [{ id: `${k}_fired` }, { id: `${k}_zzpruned_fired` }], conditions: [], actions: [] } }, []);
    assert.deepEqual(out.flow.triggers.map((c) => c.id), [`${k}_fired`]);
  });
});
