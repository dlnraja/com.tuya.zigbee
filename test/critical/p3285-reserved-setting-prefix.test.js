'use strict';
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { reservedSettingHits, reservedPrefix } = require('../../scripts/ci/reserved-setting-prefix.cjs');
const { stagingDir, preparedDir } = require('../../scripts/ci/publish-dir.cjs');

const ROOT = path.join(__dirname, '..', '..');

describe('P3285 reserved setting prefixes and one publish directory', () => {
  it('rejects a reserved prefix and accepts the renamed energy label', () => {
    assert.strictEqual(reservedPrefix('energy_source'), 'energy_');
    assert.strictEqual(reservedPrefix('tuya_energy_source'), '');
    const bad = reservedSettingHits({ settings: [{ id: 'energy_source', type: 'label' }] });
    assert.strictEqual(bad.length, 1);
    assert.strictEqual(reservedSettingHits({ settings: [{ id: 'tuya_energy_source', type: 'label' }] }).length, 0);
  });

  it('no driver compose, settings compose, or app.json uses a reserved setting prefix', () => {
    const hits = [];
    const files = ['app.json'];
    for (const id of fs.readdirSync(path.join(ROOT, 'drivers'))) {
      for (const name of ['driver.compose.json', 'driver.settings.compose.json']) {
        const file = path.join(ROOT, 'drivers', id, name);
        if (fs.existsSync(file)) files.push(file);
      }
    }
    for (const file of files) {
      let json;
      try { json = JSON.parse(fs.readFileSync(path.isAbsolute(file) ? file : path.join(ROOT, file), 'utf8')); }
      catch { continue; }
      for (const hit of reservedSettingHits(json)) hits.push(`${file} ${hit.id}`);
    }
    assert.deepStrictEqual(hits, []);
  });

  it('diagnostic staging and the size-gate directory are the same path', () => {
    const env = { PUBLISH_DIAGNOSTIC_CATALOGUE: '1', PUBLISH_DIAGNOSTIC_DIR: '/tmp/homey-diag-catalogue' };
    assert.strictEqual(stagingDir(env), '/tmp/homey-diag-catalogue');
    assert.notStrictEqual(stagingDir(env), stagingDir({}));
    const exported = { HOMEY_PUBLISH_DIR: stagingDir(env) };
    assert.strictEqual(preparedDir(exported), stagingDir(env));
  });
});
