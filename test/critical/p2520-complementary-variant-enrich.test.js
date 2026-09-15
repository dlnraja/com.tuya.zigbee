'use strict';

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const merge = require('../../lib/enrichment/ComplementaryMerge');

describe('P2520 complementary variant enrich', () => {
  it('SSOT + docs + always-on cursor rule exist', () => {
    for (const rel of [
      'config/architecture/complementary-variant-enrich-ssot.json',
      'docs/rules/COMPLEMENTARY_VARIANT_ENRICH.md',
      'docs/architecture/COMPLEMENTARY_ENRICHMENT.md',
      '.cursor/rules/complementary-variant-enrich-always.mdc',
      'lib/enrichment/ComplementaryMerge.js',
    ]) {
      assert.ok(fs.existsSync(path.join(ROOT, rel)), rel);
    }
    const ssot = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'config/architecture/complementary-variant-enrich-ssot.json'), 'utf8')
    );
    assert.strictEqual(ssot._meta.id, 'P2520');
    assert.ok(ssot.mandate.always);
    assert.ok(ssot.vision.enrichmentsAre.includes('variants'));
    assert.ok(ssot.vision.enrichmentsAreNot.includes('wipes'));
  });

  it('unionStrings treats enrich as variants (no drop)', () => {
    const u = merge.unionStrings(
      ['_TZ3000_l9brjwau', '_TZ3000_mq4wujmp'],
      ['_tz3000_l9brjwau', '_TZE200_newvariant']
    );
    assert.ok(u.length >= 3);
    assert.ok(u.some((m) => /l9brjwau/i.test(m)));
    assert.ok(u.some((m) => /mq4wujmp/i.test(m)));
    assert.ok(u.some((m) => /newvariant/i.test(m)));
  });

  it('appendSettingsById never wipes curated settings', () => {
    const out = merge.appendSettingsById(
      [{ id: 'backlight_mode', type: 'dropdown', value: 'normal' }],
      [{ id: 'power_scale', type: 'dropdown', value: '1' }]
    );
    assert.ok(out.some((s) => s.id === 'backlight_mode'));
    assert.ok(out.some((s) => s.id === 'power_scale'));
  });

  it('wouldDegradeCompose catches capability/mfr shrink and settings wipe', () => {
    assert.ok(
      merge.wouldDegradeCompose(
        {
          zigbee: { manufacturerName: ['A', 'B'], productId: ['TS0001'] },
          capabilities: ['onoff', 'measure_power'],
          settings: [{ id: 'x' }],
        },
        {
          zigbee: { manufacturerName: ['A'], productId: ['TS0001'] },
          capabilities: ['onoff'],
          settings: [],
        }
      )
    );
    assert.ok(
      !merge.wouldDegradeCompose(
        {
          zigbee: { manufacturerName: ['A'], productId: ['TS0001'] },
          capabilities: ['onoff'],
          settings: [],
        },
        {
          zigbee: { manufacturerName: ['A', 'B'], productId: ['TS0001', 'TS0002'] },
          capabilities: ['onoff', 'dim'],
          settings: [{ id: 'power_scale' }],
        }
      )
    );
  });

  it('COMPLEMENTARY_ENRICHMENT.md references P2520 variant doctrine', () => {
    const md = fs.readFileSync(path.join(ROOT, 'docs/architecture/COMPLEMENTARY_ENRICHMENT.md'), 'utf8');
    assert.ok(/P2520/.test(md));
    assert.ok(/variant/i.test(md));
  });
});
