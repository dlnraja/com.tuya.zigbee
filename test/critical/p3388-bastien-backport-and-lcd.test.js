'use strict';

/**
 * P3388 - (1) nightly master -> bastien-home backport: deterministic selection and the
 * 23:00-06:00 Paris rule; (2) LCD ZTH05Z (_TZE284_vvmbj46n + TS0601, Z2M tuya.ts ZTH05Z):
 * DP15 humidity_alarm and DP18 humidity_periodic_report never become battery/temperature.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { describe, it } = require('../_support/dual-runner');

const ROOT = path.join(__dirname, '..', '..');
require('../_support/homey-stub').install();

const { classify, normSubject } = require('../../tools/ci/bastien-backport');
const CFG = { ...require('../../tools/ci/bastien-backport').DEFAULT_CONFIG,
  ...JSON.parse(fs.readFileSync(path.join(ROOT, 'config/ci/bastien-backport.json'), 'utf8')) };

function ctx(over = {}) {
  return { cfg: CFG, targetText: '', targetSubjects: new Set(), ledgerEntry: null,
    driverExists: (id) => id !== 'master_only_driver', ...over };
}
const C = (subject, files, body = '') => ({ sha: 'a'.repeat(40), subject, body, files });

describe('P3388 bastien backport selection', () => {
  it('picks a lib fix and keeps only shared paths', () => {
    const v = classify(C('fix(P9001): x', ['lib/a.js', 'app.json', '.github/workflows/w.yml', 'test/x.test.js']), ctx());
    assert.strictEqual(v.status, 'eligible');
    assert.deepStrictEqual(v.keptFiles, ['lib/a.js', 'test/x.test.js']);
  });

  it('never picks alt-control P3380-P3383, [auto:*] chores or non-fix types', () => {
    assert.strictEqual(classify(C('feat(P3380-P3383): alternative control paths', ['lib/a.js']), ctx()).status, 'skip');
    assert.strictEqual(classify(C('fix(P3382): alt cards', ['lib/a.js']), ctx()).status, 'skip');
    assert.strictEqual(classify(C('chore(xr): needs-info [auto:xr] [skip ci]', ['lib/a.js']), ctx()).status, 'skip');
    assert.strictEqual(classify(C('ci(P9002): gate', ['lib/a.js']), ctx()).status, 'skip');
    assert.strictEqual(classify(C('fix(P9003): y', ['lib/a.js'], 'Master only (file absent on bastien-home).'), ctx()).status, 'skip');
  });

  it('skips drivers absent on bastien-home and commits already there', () => {
    assert.match(classify(C('fix(P9004): z', ['drivers/master_only_driver/device.js']), ctx()).reason, /driver-absent/);
    assert.strictEqual(classify(C('fix(P9005): w', ['lib/a.js']), ctx({ targetText: `x\n(cherry picked from commit ${'a'.repeat(40)})` })).reason, 'already-present');
    assert.match(classify(C('fix(P9006): same [skip ci]', ['lib/a.js']), ctx({ targetSubjects: new Set([normSubject('fix(P9006): same')]) })).reason, /same subject/);
  });

  it('compose changes and bounded attempts become candidate tasks, not picks', () => {
    assert.strictEqual(classify(C('fix(P9007): c', ['drivers/switch_1gang/driver.compose.json', 'lib/a.js']), ctx()).status, 'needs-manual');
    assert.strictEqual(classify(C('fix(P9008): d', ['lib/a.js']), ctx({ ledgerEntry: { conflicts: 3 } })).status, 'needs-manual');
    assert.strictEqual(classify(C('fix(P9009): e', ['lib/a.js']), ctx({ ledgerEntry: { reds: 2 } })).status, 'needs-manual');
  });
});

describe('P3388/t1025u backport and Bastien publish at any hour', () => {
  const wf = (f) => fs.readFileSync(path.join(ROOT, '.github/workflows', f), 'utf8');

  it('the backport workflow still has a nightly cron, ancestor check, kill switch, and never force-pushes', () => {
    const src = wf('bastien-backport-nightly.yml');
    const m = /cron: '(\d+) (\d+) \* \* \*'/.exec(src);
    assert.ok(m);
    assert.strictEqual(m[1], '40');
    assert.strictEqual(m[2], '22');
    assert.match(src, /merge-base --is-ancestor origin\/bastien-home HEAD/);
    assert.match(src, /vars\.BASTIEN_BACKPORT != 'off'/);
    assert.ok(!/--force|push -f\b/.test(src));
    assert.ok(!/bastien-night-window\.js/.test(src));
    assert.ok(!/steps\.night\.outputs\.inside/.test(src));
  });

  it('draft-to-test paths do not hold Bastien for the time of day; master copy still only runs on bastien-home', () => {
    assert.ok(!/outside the Bastien night window/.test(wf('draft-to-test-fleet.yml')));
    assert.ok(!/needs\.night\.outputs\.ok == 'true'/.test(wf('draft-to-test.yml')));
    assert.match(wf('bastien-publish.yml'), /if: github\.ref_name == 'bastien-home'/);
  });
});

describe('P3388 LCD ZTH05Z DP map (_TZE284_vvmbj46n + TS0601)', () => {
  function lcd(mfr) {
    const LCD = require('../../drivers/lcdtemphumidsensor/device');
    const store = {};
    const dev = Object.create(LCD.prototype);
    const settings = { zb_manufacturer_name: mfr, zb_model_id: 'TS0601' };
    dev.getSetting = (k) => settings[k] ?? null;
    dev.getData = () => ({ manufacturerName: mfr, productId: 'TS0601' });
    dev.getStoreValue = (k) => store[k];
    dev.setStoreValue = async (k, v) => { store[k] = v; };
    dev.log = () => {};
    return { dev, store };
  }

  it('DP18 and DP15 are stored settings, never temperature or battery', () => {
    const { dev, store } = lcd('_TZE284_vvmbj46n');
    assert.strictEqual(dev.dpMappings[18].transform(30), null);
    assert.strictEqual(dev.dpMappings[15].transform(2), null);
    assert.strictEqual(store.lcd_humidity_periodic_report, 30);
    assert.strictEqual(store.lcd_humidity_alarm, 'cancel');
    assert.strictEqual(dev.dpMappings[19].transform(5), null);
    assert.strictEqual(store.lcd_temperature_sensitivity, 0.5);
  });

  it('other LCD couples keep the generic DP15 battery / DP18 temperature', () => {
    const { dev } = lcd('_TZE200_locansqn');
    assert.strictEqual(dev.dpMappings[18].capability, 'measure_temperature');
    assert.strictEqual(dev.dpMappings[15].capability, 'measure_battery');
  });
});
