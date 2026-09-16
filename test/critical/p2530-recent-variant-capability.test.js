'use strict';

/**
 * P2530 — Recent-device complementary variants + capabilities Contre quoi
 * Dual-app: BOTH
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const hasMfr = (compose, re) => (compose.zigbee?.manufacturerName || []).some((m) => re.test(String(m)));
const hasCap = (compose, id) => (compose.capabilities || []).some((c) => String(c) === id);

describe('P2530 recent variant + capability completer', () => {
  it('completer script + ComplementaryMerge exist', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'tools/ci/recent-variant-capability-completer.js')));
    assert.ok(fs.existsSync(path.join(ROOT, 'lib/enrichment/ComplementaryMerge.js')));
  });

  it('curtain_motor keeps Moes/AM43/tubular OEM families + cover caps', () => {
    const c = readJson('drivers/curtain_motor/driver.compose.json');
    assert.ok(hasMfr(c, /_TZE204_5slehgeo/i));
    assert.ok(hasMfr(c, /_TZE200_5slehgeo/i));
    assert.ok(hasMfr(c, /_TZE284_5slehgeo/i));
    assert.ok(hasMfr(c, /icka1clh/i));
    assert.ok(hasMfr(c, /fodv6bkr/i));
    assert.ok(hasMfr(c, /3mzb0sdz/i));
    assert.ok(hasCap(c, 'windowcoverings_state'));
    assert.ok(hasCap(c, 'windowcoverings_set'));
    assert.ok(hasCap(c, 'measure_battery'));
  });

  it('presence_sensor_radar keeps gkfbdvyx/clrdrnya OEM + alarm_human (not phantom battery)', () => {
    const c = readJson('drivers/presence_sensor_radar/driver.compose.json');
    assert.ok(hasMfr(c, /_TZE204_gkfbdvyx/i));
    assert.ok(hasMfr(c, /_TZE200_gkfbdvyx/i));
    assert.ok(hasMfr(c, /_TZE284_gkfbdvyx/i));
    assert.ok(hasMfr(c, /clrdrnya/i));
    assert.ok(hasCap(c, 'alarm_motion'));
    assert.ok(hasCap(c, 'alarm_human'));
    assert.ok(hasCap(c, 'measure_luminance'));
    assert.ok(!hasCap(c, 'measure_battery'), 'mains radar must not gain phantom battery');
  });

  it('wall_dimmer_tuya keeps m1cvyneb TZE200/204/284 + onoff/dim', () => {
    const c = readJson('drivers/wall_dimmer_tuya/driver.compose.json');
    assert.ok(hasMfr(c, /_TZE284_m1cvyneb/i));
    assert.ok(hasMfr(c, /_TZE204_m1cvyneb/i));
    assert.ok(hasMfr(c, /_TZE200_m1cvyneb/i));
    assert.ok(hasCap(c, 'onoff'));
    assert.ok(hasCap(c, 'dim'));
  });

  it('TZ3000 recent seeds keep case variants + battery where expected', () => {
    const btn = readJson('drivers/button_wireless_1/driver.compose.json');
    const scene = readJson('drivers/scene_switch_4/driver.compose.json');
    const knob = readJson('drivers/smart_knob/driver.compose.json');
    assert.ok(hasMfr(btn, /_TZ3000_mrpevh8p/i));
    assert.ok(hasMfr(btn, /_tz3000_mrpevh8p/i));
    assert.ok(hasCap(btn, 'measure_battery'));
    assert.ok(hasMfr(scene, /_TZ3000_zgyzgdua/i));
    assert.ok(hasMfr(knob, /_TZ3000_uri7ongn/i));
  });

  it('kq1l5eu5 Moes SFC02 stays wall_curtain_switch (not curtain_motor)', () => {
    const motor = readJson('drivers/curtain_motor/driver.compose.json');
    const wall = readJson('drivers/wall_curtain_switch/driver.compose.json');
    assert.ok(!hasMfr(motor, /kq1l5eu5/i), 'anti-bot: kq1l5eu5 forbidden on curtain_motor');
    assert.ok(hasMfr(wall, /_TZE284_kq1l5eu5/i));
    assert.ok(hasMfr(wall, /_TZE200_kq1l5eu5/i) || hasMfr(wall, /_TZE204_kq1l5eu5/i));
    assert.ok(hasCap(wall, 'windowcoverings_state') || hasCap(wall, 'windowcoverings_set') || hasCap(wall, 'onoff'));
  });
});
