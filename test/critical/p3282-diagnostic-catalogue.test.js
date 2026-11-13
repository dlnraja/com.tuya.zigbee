'use strict';
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  effectiveHoldIds, resolveReleaseValue, assertDiagnosticCatalogue,
} = require('../../scripts/publish-hold-release');
const { keepStagedEntry } = require('../../scripts/ci/publish-stage-filter.cjs');

const ROOT = path.join(__dirname, '..', '..');

describe('P3282 diagnostic catalogue above 350 drivers', () => {
  const hold = { drivers: [{ id: 'held_a' }, { id: 'held_b' }] };

  it('ordinary release keeps the hold list unless an id is named', () => {
    const copy = JSON.stringify(hold);
    const r = effectiveHoldIds(hold, resolveReleaseValue(hold, {}));
    assert.deepStrictEqual(r.released, []);
    assert.strictEqual(r.ids.size, 2);
    assert.strictEqual(JSON.stringify(hold), copy);
  });

  it('diagnostic mode releases every held id and does not edit the hold file', () => {
    const copy = JSON.stringify(hold);
    const value = resolveReleaseValue(hold, { PUBLISH_DIAGNOSTIC_CATALOGUE: '1', PUBLISH_HOLD_RELEASE: 'held_a' });
    const r = effectiveHoldIds(hold, value);
    assert.deepStrictEqual(r.released, ['held_a', 'held_b']);
    assert.strictEqual(r.ids.size, 0);
    assert.strictEqual(JSON.stringify(hold), copy);
  });

  it('refuses a held-size payload and accepts a catalogue above 350', () => {
    assert.strictEqual(assertDiagnosticCatalogue({ enabled: true, driverCount: 346, minDrivers: 351 }).ok, false);
    assert.strictEqual(assertDiagnosticCatalogue({ enabled: true, driverCount: 348, minDrivers: 351 }).ok, false);
    assert.strictEqual(assertDiagnosticCatalogue({ enabled: true, driverCount: 351, minDrivers: 351 }).ok, true);
    assert.strictEqual(assertDiagnosticCatalogue({ enabled: false, driverCount: 346 }).ok, true);
  });

  it('the master publish path keeps the diagnostic draft off Test and Live', () => {
    const wf = fs.readFileSync(path.join(ROOT, '.github/workflows/auto-publish-on-push.yml'), 'utf8');
    const prep = fs.readFileSync(path.join(ROOT, 'scripts/prepare-publish.js'), 'utf8');
    const action = fs.readFileSync(path.join(ROOT, '.github/actions/homey-app-publish/action.yml'), 'utf8');
    assert.ok(wf.includes('diagnostic_catalogue'));
    assert.ok(wf.includes('PUBLISH_DIAGNOSTIC_CATALOGUE'));
    assert.ok(wf.includes("inputs.diagnostic_catalogue != true"));
    assert.ok(prep.includes('homey-diag-catalogue'));
    assert.ok(prep.includes('keepStagedEntry'));
    assert.ok(prep.includes('const name = path.basename(src)'));
    assert.ok(action.includes('HOMEY_PUBLISH_DIR'));
  });

  it('the copy root named .homeybuild is kept and a nested compose dir is not', () => {
    const root = path.join('/tmp', 'homey-diag-src', '.homeybuild');
    const broken = (src) => {
      const name = path.basename(src);
      return !(name === '.homeycompose' || name === '.homeybuild');
    };
    assert.strictEqual(broken(root), false);
    assert.strictEqual(keepStagedEntry(root, root), true);
    assert.strictEqual(keepStagedEntry(path.join(root, '.homeycompose'), root), false);
    assert.strictEqual(keepStagedEntry(path.join(root, '.homeybuild'), root), false);
    assert.strictEqual(keepStagedEntry(path.join(root, 'app.json'), root), true);
  });
});
