'use strict';

/**
 * P2634 — _TZ3000_ltt60asa + TS0004 Contre quoi
 * Homey "Zigbee unknown" until locked on switch_4gang (Z2M TS0004_switch_module).
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2634 TS0004 switch-module (ltt60asa / mmkbptmx / liygxtcq)', () => {
  it('heal helper exports family + heal', () => {
    const heal = require(path.join(ROOT, 'lib/tuya/Ts0004SwitchModuleHeal.js'));
    assert.equal(typeof heal.healTs0004SwitchModule, 'function');
    assert.equal(typeof heal.isTs0004SwitchModule, 'function');
    assert.ok(heal.FAMILY_MFR.includes('ltt60asa'));
    assert.ok(heal.FAMILY_MFR.includes('mmkbptmx'));
    assert.ok(heal.FAMILY_MFR.includes('liygxtcq'));
  });

  it('switch_4gang locks ltt60asa + liygxtcq + TS0004 (UNION, no shrink)', () => {
    const c = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/switch_4gang/driver.compose.json'),
      'utf8',
    ));
    const mfr = c.zigbee.manufacturerName || [];
    assert.ok(mfr.length >= 292, `P2520: mfr must not shrink (got ${mfr.length})`);
    assert.ok(mfr.some((x) => /ltt60asa/i.test(String(x))), 'ltt60asa required');
    assert.ok(mfr.some((x) => /liygxtcq/i.test(String(x))), 'liygxtcq sibling required');
    assert.ok(mfr.some((x) => /mmkbptmx/i.test(String(x))), 'mmkbptmx sibling required');
    assert.ok((c.zigbee.productId || []).includes('TS0004'));
  });

  it('EP1 has E000/E001 + metering clusters (ZHA Switch_4G_Metering)', () => {
    const c = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/switch_4gang/driver.compose.json'),
      'utf8',
    ));
    const ep1 = (c.zigbee.endpoints && c.zigbee.endpoints['1'] && c.zigbee.endpoints['1'].clusters) || [];
    for (const need of [6, 57344, 57345, 1794, 2820]) {
      assert.ok(ep1.includes(need), `EP1 missing cluster ${need}`);
    }
    for (const ep of ['2', '3', '4']) {
      const clusters = c.zigbee.endpoints[ep].clusters || [];
      assert.ok(clusters.includes(6), `EP${ep} OnOff required`);
      assert.ok(clusters.includes(57345), `EP${ep} E001 required`);
    }
  });

  it('switch_mode setting present; device.js wires P2634 heal', () => {
    const c = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/switch_4gang/driver.compose.json'),
      'utf8',
    ));
    const sm = (c.settings || []).find((s) => s && s.id === 'switch_mode');
    assert.ok(sm, 'switch_mode setting required');
    assert.equal(sm.value, 'state');

    const src = fs.readFileSync(path.join(ROOT, 'drivers/switch_4gang/device.js'), 'utf8');
    assert.ok(src.includes('healTs0004SwitchModule'));
    assert.ok(src.includes('P2634'));
    assert.ok(src.includes('Ts0004SwitchModuleHeal'));
  });

  it('misattribution locks couple on switch_4gang', () => {
    const reg = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'data/user-misattribution-registry.json'),
      'utf8',
    ));
    const hit = (reg.cases || []).find((c) => c.id === 'p2634-tz3000-ltt60asa-ts0004-switch-4gang');
    assert.ok(hit, 'registry case required');
    assert.equal(hit.canonicalDriver, 'switch_4gang');
    assert.ok((hit.mfr || []).some((m) => /ltt60asa/i.test(m)));
    assert.ok((hit.productId || []).includes('TS0004'));
    assert.ok((hit.forbiddenDrivers || []).includes('wall_switch_4gang_1way'));
  });

  it('wall_switch_4gang_1way must not steal ltt60asa', () => {
    const wall = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/wall_switch_4gang_1way/driver.compose.json'),
      'utf8',
    ));
    assert.ok(!(wall.zigbee.manufacturerName || []).some((x) => /ltt60asa/i.test(String(x))));
  });

  it('npm scripts wired', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts['check:p2634']);
    assert.ok(String(pkg.scripts['check:p263x'] || '').includes('check:p2634'));
  });
});
