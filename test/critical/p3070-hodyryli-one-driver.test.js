'use strict';

/**
 * P3070 — _TZE284_hodyryli + TS0601 has ONE payload driver: climate_sensor_zt08.
 *
 * WHY: the hardware is the Tuya ZT08 / ZT03_PRO weather sensor (display + external probe, EF00:
 * DP1 temp /10, DP2 humidity, DP38 probe /10, DP17 time commit; Z2M #29508/#29541/#30862, GH #513,
 * forum 140352). P133 already moved it out of climate_sensor, but two old pins put it back there in
 * the publish payload: the P2490 sacred-keep row (driverId climate_sensor) and the P3024b re-pin of
 * 11 cartesian combos (hodyryli x the other climate_sensor pids) that no driver owns. Homey then saw
 * the same couple on two drivers. See docs/rules/HODYRYLI_ZT08_ONE_DRIVER.md.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { describe, it } = require('../_support/dual-runner');
const { sourceToPayload, checkBaseline } = require('../../scripts/maintenance/publish-baseline-gate.cjs');

const ROOT = path.join(__dirname, '..', '..');
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const MFR = '_TZE284_hodyryli';

describe('P3070 hodyryli one couple, one driver', () => {
  const baseline = readJson('test/fixtures/athom-last-test-package-couples.json');

  it('sacred-keep pin points at the hardware driver', () => {
    const keep = readJson('config/architecture/publish-sacred-keep-couples.json');
    const rows = JSON.stringify(keep).match(/\{[^{}]*_TZE284_hodyryli[^{}]*\}/g) || [];
    assert.strictEqual(rows.length, 1);
    const row = JSON.parse(rows[0]);
    assert.strictEqual(row.pid, 'TS0601');
    assert.strictEqual(row.driverId, 'climate_sensor_zt08');
  });

  it('registry canonical is climate_sensor_zt08 and the source compose keeps the couple there', () => {
    const reg = JSON.stringify(readJson('data/user-misattribution-registry.json'));
    assert.match(reg, /"canonicalDriver":\s*"climate_sensor_zt08"/);
    const zt08 = readJson('drivers/climate_sensor_zt08/driver.compose.json').zigbee;
    assert.ok(zt08.manufacturerName.includes(MFR) && zt08.productId.includes('TS0601'));
    const cs = readJson('drivers/climate_sensor/driver.compose.json').zigbee;
    assert.ok(!cs.manufacturerName.some((m) => m.toLowerCase() === MFR.toLowerCase()));
  });

  it('only the parasitic climate_sensor combos are exempt, never the real couple', () => {
    const ex = baseline.exemptions.filter((e) => e.mfr === MFR);
    assert.strictEqual(ex.length, 11);
    for (const e of ex) {
      assert.strictEqual(e.driverId, 'climate_sensor');
      assert.notStrictEqual(e.pid, 'TS0601');
      assert.ok(e.reason && e.approvedBy && e.date, `${e.pid} needs reason/approvedBy/date`);
    }
  });

  it('payload view: the couple sits on climate_sensor_zt08 only and the baseline gate stays green', () => {
    const view = sourceToPayload(readJson('app.json'), ROOT, { baseline });
    const owners = (view.drivers || [])
      .filter((d) => d.zigbee && (d.zigbee.manufacturerName || []).includes(MFR) && (d.zigbee.productId || []).includes('TS0601'))
      .map((d) => d.id);
    assert.deepStrictEqual(owners, ['climate_sensor_zt08']);
    assert.deepStrictEqual(checkBaseline(view, baseline).missing, []);
  });
});
