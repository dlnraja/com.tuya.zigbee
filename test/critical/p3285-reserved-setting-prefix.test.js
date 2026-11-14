'use strict';
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  RESERVED_SETTING_PREFIXES,
  reservedPrefix,
  reservedSettingHits,
  scanRoot,
} = require('../../scripts/ci/reserved-setting-prefix.cjs');
const { migrateSettingKey } = require('../../lib/settings/migrateSettingKey');

const ROOT = path.join(__dirname, '..', '..');
const HARD = [
  '.github/workflows/unified-ci.yml',
  '.github/workflows/validate.yml',
  '.github/workflows/syntax-check.yml',
  '.github/workflows/pr-gate.yml',
  '.github/workflows/code-quality.yml',
  '.github/workflows/auto-publish-on-push.yml',
];

describe('P3285 reserved setting prefixes', () => {
  it('fails before the rename and passes after it', () => {
    assert.strictEqual(reservedPrefix('energy_source'), 'energy_');
    assert.strictEqual(reservedPrefix('tuya_energy_source'), '');
    assert.ok(reservedSettingHits({ settings: [{ id: 'energy_source', type: 'label' }] }).length > 0);
    assert.strictEqual(reservedSettingHits({ settings: [{ id: 'tuya_energy_source', type: 'label' }] }).length, 0);
    for (const prefix of RESERVED_SETTING_PREFIXES) {
      const id = prefix.endsWith(':') ? `${prefix}custom` : `${prefix}example`;
      assert.strictEqual(reservedPrefix(id), prefix, id);
      assert.ok(reservedSettingHits({ settings: [{ id, type: 'text' }] }).length > 0, id);
    }
    assert.strictEqual(reservedSettingHits({
      settings: [{ id: 'energy_group', type: 'group', children: [{ id: 'power_source_mode', type: 'label' }] }],
    }).length, 0);
  });

  it('a fixture tree with energy_source fails the scan and this repo passes', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p3285-'));
    fs.mkdirSync(path.join(dir, 'drivers', 'sample'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'drivers', 'sample', 'driver.compose.json'), JSON.stringify({
      settings: [{ id: 'energy_source', type: 'label' }],
    }));
    const bad = scanRoot(dir);
    assert.strictEqual(bad.length, 1);
    assert.strictEqual(bad[0].id, 'energy_source');
    assert.deepStrictEqual(scanRoot(ROOT), []);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('migrates the old settings key without dropping its stored value', async () => {
    const device = {
      settings: { energy_source: 'learned' },
      getSetting(key) { return this.settings[key]; },
      async setSettings(patch) { Object.assign(this.settings, patch); },
    };
    const result = await migrateSettingKey(device, 'energy_source', 'tuya_energy_source', 'measured');
    assert.strictEqual(result.wrote, true);
    assert.strictEqual(device.settings.energy_source, 'learned');
    assert.strictEqual(device.settings.tuya_energy_source, 'measured');
    const again = await migrateSettingKey(device, 'energy_source', 'tuya_energy_source', 'measured');
    assert.strictEqual(again.wrote, false);
  });

  it('hard CI and the pinned validator block a reserved setting id', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.match(pkg.scripts['check:p3285'], /reserved-setting-prefix-gate/);
    for (const rel of HARD) {
      const text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      assert.ok(text.includes('check:p3285'), `${rel} must run check:p3285`);
    }
    const safe = fs.readFileSync(path.join(ROOT, 'scripts/ci/homey-validate-safe.sh'), 'utf8');
    assert.match(safe, /node_modules\/\.bin\/homey/);
    assert.match(safe, /cannot start with reserved prefix/);
    assert.doesNotMatch(safe, /npx homey/);
  });
});
