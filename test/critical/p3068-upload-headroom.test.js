'use strict';
// P3068: upload app.json headroom — publish-copy shared-text compaction + ratchet (floor raise-only, target 300 KB).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const { compactSharedText, CANON } = require('../../scripts/maintenance/compact-shared-text.cjs');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const FLOOR_MIN_KB = 240; // raise together with .github/upload-headroom.json floorKB, never lower

test('locale dedupe is lossless: only non-en strings identical to en are dropped, app name untouched', () => {
  const m = {
    name: { en: 'Tuya', fr: 'Tuya' },
    drivers: [{ id: 'd', name: { en: 'Plug', fr: 'Plug', nl: 'Stekker' }, settings: [{ type: 'group', label: { en: 'G', de: 'G' }, children: [{ id: 'x', label: { en: 'AAA', fr: 'AAA', de: 'AAA' } }] }] }],
    flow: { triggers: [{ id: 't', title: { en: 'On', fr: 'Marche', de: 'On' } }] },
  };
  const r = compactSharedText(m);
  assert.deepStrictEqual(m.name, { en: 'Tuya', fr: 'Tuya' });
  assert.deepStrictEqual(m.drivers[0].name, { en: 'Plug', nl: 'Stekker' });
  assert.deepStrictEqual(m.drivers[0].settings[0].label, { en: 'G' });
  assert.deepStrictEqual(m.drivers[0].settings[0].children[0].label, { en: 'AAA' });
  assert.deepStrictEqual(m.flow.triggers[0].title, { en: 'On', fr: 'Marche' });
  assert.strictEqual(r.localeDropped, 5);
  assert.ok(r.bytes > 0);
});

test('shared hints/titles canonicalised only on exact en match (variants and ids untouched), mojibake repaired', () => {
  const zcl = CANON.settingHints.zcl_cluster_layer;
  const m = { drivers: [{
    settings: [
      { id: 'zcl_cluster_layer', type: 'checkbox', hint: { en: zcl.from, fr: 'long' } },
      { id: 'battery_type', hint: { en: CANON.settingHints.battery_type.from, fr: 'S├®lectionnez le type' } },
      { id: 'zcl_cluster_layer', hint: { en: 'device specific text' } },
    ],
    maintenanceActions: [{ id: 'generate_issue_report', title: { en: CANON.maintenanceTitles.generate_issue_report.from } }, { id: 'other', title: { en: 'X' } }],
  }] };
  compactSharedText(m);
  const [a, b, c] = m.drivers[0].settings;
  assert.deepStrictEqual(a.hint, zcl.to);
  assert.strictEqual(a.id, 'zcl_cluster_layer');
  assert.ok(!/├/.test(JSON.stringify(b.hint)));
  assert.deepStrictEqual(c.hint, { en: 'device specific text' });
  assert.deepStrictEqual(m.drivers[0].maintenanceActions[0].title, CANON.maintenanceTitles.generate_issue_report.to);
  assert.deepStrictEqual(m.drivers[0].maintenanceActions[1].title, { en: 'X' });
});

test('canonical texts are shorter than the source text, keep en+fr, no mojibake', () => {
  for (const group of [CANON.settingHints, CANON.maintenanceTitles]) {
    for (const [id, c] of Object.entries(group)) {
      assert.ok(c.to.en && c.to.fr, `${id} en+fr`);
      assert.ok(c.to.en.length <= c.from.length, `${id} en not shorter`);
      assert.ok(!/[├¤]/.test(JSON.stringify(c.to)), `${id} mojibake`);
    }
  }
});

test('pipeline wiring: prepare-publish, size-gate projection and p2842 projection all compact shared text', () => {
  assert.match(read('scripts/prepare-publish.js'), /compact-shared-text\.cjs'\)\.compactFile\(destAppJson\)/);
  const gate = read('scripts/ci/publish-size-gate.cjs');
  assert.match(gate, /compact-shared-text\.cjs'\)\.compactFile\(tmp\)/);
  assert.match(gate, /checkUploadHeadroom\(projected\)/);
  const p2842 = path.join(ROOT, 'tools/ci/p2842-flow-publish-self-heal.js');
  if (fs.existsSync(p2842)) { assert.match(fs.readFileSync(p2842, 'utf8'), /compact-shared-text\.cjs/); }
});

test('headroom ratchet policy: target 300 KB, floor raise-only', () => {
  const pol = JSON.parse(read('.github/upload-headroom.json'));
  assert.strictEqual(pol.targetKB, 300);
  assert.ok(pol.floorKB >= FLOOR_MIN_KB, `floorKB ${pol.floorKB} lowered below ${FLOOR_MIN_KB}`);
  assert.ok(pol.floorKB <= pol.targetKB);
});
