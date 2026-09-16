'use strict';

/**
 * P2533 — ComplementaryMerge helper Contre quoi (mergeDpMap / mergeZigbeeIdentity /
 * appendSettingsById group path / mega chain uses completer append).
 * Dual-app: BOTH
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const merge = require('../../lib/enrichment/ComplementaryMerge');
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));

describe('P2533 complementary merge helpers', () => {
  it('mergeDpMap keeps existing keys unless forceOverwriteKeys', () => {
    const out = merge.mergeDpMap(
      { '1': { capability: 'onoff' }, '2': { capability: 'dim', divisor: 1000 } },
      { '2': { capability: 'dim', divisor: 100 }, '3': { capability: 'measure_power' } },
    );
    assert.equal(out['2'].divisor, 1000, 'curated divisor must win');
    assert.equal(out['3'].capability, 'measure_power');
    const forced = merge.mergeDpMap(
      { '2': { capability: 'dim', divisor: 1000 } },
      { '2': { capability: 'dim', divisor: 10 } },
      { forceOverwriteKeys: ['2'] },
    );
    assert.equal(forced['2'].divisor, 10);
  });

  it('mergeZigbeeIdentity unions mfr+pid without wiping', () => {
    const z = merge.mergeZigbeeIdentity(
      { manufacturerName: ['_TZ3000_abc'], productId: ['TS0001'] },
      { manufacturerName: ['_tz3000_abc', '_TZE200_oem'], productId: ['TS0002'] },
    );
    assert.ok(z.manufacturerName.some((m) => /abc/i.test(m)));
    assert.ok(z.manufacturerName.some((m) => /oem/i.test(m)));
    assert.ok(z.productId.includes('TS0001'));
    assert.ok(z.productId.includes('TS0002'));
  });

  it('appendSettingsById merges children into existing group by label', () => {
    const out = merge.appendSettingsById(
      [{
        type: 'group',
        label: { en: 'Power' },
        children: [{ id: 'power_on_behavior', type: 'dropdown' }],
      }],
      [{
        type: 'group',
        label: { en: 'Power' },
        children: [
          { id: 'power_on_behavior', type: 'dropdown' },
          { id: 'power_scale', type: 'dropdown' },
        ],
      }],
    );
    const group = out.find((s) => s && s.type === 'group');
    assert.ok(group);
    assert.ok(group.children.some((c) => c.id === 'power_on_behavior'));
    assert.ok(group.children.some((c) => c.id === 'power_scale'));
    assert.equal(out.filter((s) => s.type === 'group').length, 1, 'no duplicate Power group');
  });

  it('mega orchestrator chains completer + firmware sync + P2520 gates (source lock)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'tools/ci/p2531-complementary-coverage-mega.js'), 'utf8');
    assert.ok(/recent-variant-capability-completer\.js/.test(src));
    assert.ok(/p2530d-wall-dimmer-firmware-mfr-sync\.js/.test(src));
    assert.ok(/p2520-complementary-variant-enrich-gate\.js/.test(src));
    assert.ok(/check:p2530/.test(src));
    assert.ok(/never invent pid/i.test(src));
  });

  it('gbm10jnj multi-pid: TS0044 on button_wireless_4, TS0043 on button_wireless_3', () => {
    const bw4 = readJson('drivers/button_wireless_4/driver.compose.json');
    const bw3 = readJson('drivers/button_wireless_3/driver.compose.json');
    assert.ok((bw4.zigbee?.manufacturerName || []).some((m) => /gbm10jnj/i.test(String(m))));
    assert.ok((bw3.zigbee?.manufacturerName || []).some((m) => /gbm10jnj/i.test(String(m))));
    const p4 = new Set((bw4.zigbee?.productId || []).map((p) => String(p).toUpperCase()));
    const p3 = new Set((bw3.zigbee?.productId || []).map((p) => String(p).toUpperCase()));
    assert.ok(p4.has('TS0044'), '4-btn pid');
    assert.ok(p3.has('TS0043'), '3-btn pid');
    const mfs = readJson('data/mfs_db.json');
    const entry = mfs._TZ3000_gbm10jnj || mfs._tz3000_gbm10jnj;
    assert.ok(entry, 'mfs_db must list gbm10jnj');
    const models = (entry.modelIds || []).map((x) => String(x).toUpperCase());
    assert.ok(models.includes('TS0044'));
    assert.ok(models.includes('TS0043'));
  });

  it('nkjintbl OEM stays button_wireless_plug — not switch_2gang bleed', () => {
    const plug = readJson('drivers/button_wireless_plug/driver.compose.json');
    const sw2 = readJson('drivers/switch_2gang/driver.compose.json');
    assert.ok((plug.zigbee?.manufacturerName || []).some((m) => /nkjintbl/i.test(String(m))));
    assert.ok(!(sw2.zigbee?.manufacturerName || []).some((m) => /nkjintbl/i.test(String(m))),
      'complementary TZE200/284 sibling expand must not bleed nkjintbl onto switch_2gang');
  });
});
