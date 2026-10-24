'use strict';
const { describe, it } = require('../_support/dual-runner'); // P3020: same file under node --test and mocha
const assert = require('assert');
const { effectiveHoldIds, parseRelease } = require('../../scripts/publish-hold-release');

describe('P2830c publish-hold one-shot release', () => {
  const hold = { drivers: [{ id: 'led_controller_spi_tuya' }, { id: 'switch_module_whd02' }, { id: 'valve_controller_5zone' }] };
  it('no release keeps every held driver held', () => {
    const r = effectiveHoldIds(hold, '');
    assert.deepStrictEqual([...r.ids].sort(), ['led_controller_spi_tuya', 'switch_module_whd02', 'valve_controller_5zone']);
    assert.deepStrictEqual(r.released, []);
  });
  it('releases exactly the requested id (comma / space separated), ignores unknown ids', () => {
    const r = effectiveHoldIds(hold, ' switch_module_whd02, not_a_driver ');
    assert.deepStrictEqual(r.released, ['switch_module_whd02']);
    assert.ok(!r.ids.has('switch_module_whd02') && r.ids.has('led_controller_spi_tuya'));
    assert.deepStrictEqual([...parseRelease('a b,c;d')], ['a', 'b', 'c', 'd']);
  });
  it('never mutates the committed config and tolerates garbage', () => {
    const copy = JSON.stringify(hold);
    effectiveHoldIds(hold, 'switch_module_whd02');
    assert.strictEqual(JSON.stringify(hold), copy);
    assert.strictEqual(effectiveHoldIds(null, undefined).ids.size, 0);
  });
  it('prepare-publish and the dispatch workflow are wired to it', () => {
    const fs = require('fs'); const path = require('path');
    const root = path.join(__dirname, '..', '..');
    assert.ok(fs.readFileSync(path.join(root, 'scripts/prepare-publish.js'), 'utf8').includes('PUBLISH_HOLD_RELEASE'));
    const wf = fs.readFileSync(path.join(root, '.github/workflows/auto-publish-on-push.yml'), 'utf8');
    assert.ok(wf.includes('release_held') && wf.includes('PUBLISH_HOLD_RELEASE'));
  });
});
