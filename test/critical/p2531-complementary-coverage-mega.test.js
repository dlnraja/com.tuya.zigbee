'use strict';

/**
 * P2531 — Contre quoi: complementary coverage mega must exist + never shrink sacred locks
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const hasMfr = (c, re) => (c.zigbee?.manufacturerName || []).some((m) => re.test(String(m)));
const hasCap = (c, id) => (c.capabilities || []).some((x) => String(x) === id);

describe('P2531 complementary coverage mega', () => {
  it('mega orchestrator + P2520 merge helper exist', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'tools/ci/p2531-complementary-coverage-mega.js')));
    assert.ok(fs.existsSync(path.join(ROOT, 'lib/enrichment/ComplementaryMerge.js')));
    assert.ok(fs.existsSync(path.join(ROOT, 'config/architecture/complementary-variant-enrich-ssot.json')));
  });

  it('package exposes enrich:coverage:mega + check:p2531 scripts', () => {
    const pkg = readJson('package.json');
    assert.ok(pkg.scripts['enrich:coverage:mega']);
    assert.ok(pkg.scripts['enrich:coverage:mega:apply']);
    assert.ok(pkg.scripts['check:p2531']);
    assert.ok(pkg.scripts['check:p2530']);
    assert.ok(pkg.scripts['check:p2530d']);
    assert.ok(pkg.scripts['check:p2532']);
    assert.ok(pkg.scripts['check:p253x']);
  });

  it('sacred recent couples survive complementary mega overlays', () => {
    const dimmer = readJson('drivers/wall_dimmer_tuya/driver.compose.json');
    const curtain = readJson('drivers/curtain_motor/driver.compose.json');
    const wall = readJson('drivers/wall_curtain_switch/driver.compose.json');
    const radar = readJson('drivers/presence_sensor_radar/driver.compose.json');
    const soil = readJson('drivers/soil_sensor/driver.compose.json');
    const din = readJson('drivers/din_rail_meter/driver.compose.json');

    assert.ok(hasMfr(dimmer, /m1cvyneb/i));
    assert.ok(hasMfr(curtain, /icka1clh/i));
    assert.ok(hasMfr(curtain, /fodv6bkr/i));
    assert.ok(!hasMfr(curtain, /kq1l5eu5/i), 'kq1l5eu5 must stay off curtain_motor');
    assert.ok(hasMfr(wall, /kq1l5eu5/i));
    assert.ok(hasMfr(radar, /clrdrnya/i));
    assert.ok(hasMfr(soil, /nt4pquef/i));
    assert.ok(hasMfr(din, /6ocnqlhn/i));
  });

  it('complementary enrich must not mass-shrink switch_1gang generics', () => {
    const c = readJson('drivers/switch_1gang/driver.compose.json');
    const n = (c.zigbee?.manufacturerName || []).length;
    assert.ok(n >= 1400, `switch_1gang mfr entries must stay dense generics (${n})`);
    assert.ok(hasMfr(c, /7tdtqgwv/i), 'ZHA/Z2M somgoms 7tdtqgwv OEM overlay');
  });

  it('knob scene + rotary seeds stay on smart_knob with battery', () => {
    const knob = readJson('drivers/smart_knob/driver.compose.json');
    assert.ok(hasMfr(knob, /uri7ongn/i));
    assert.ok(hasMfr(knob, /kaflzta4/i));
    assert.ok(hasCap(knob, 'measure_battery'));
    assert.ok(hasCap(knob, 'dim'));
  });

  it('mega orchestrator forces SHADOW forum + never invent (source lock)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'tools/ci/p2531-complementary-coverage-mega.js'), 'utf8');
    assert.ok(/SHADOW_FORUM:\s*'1'/.test(src) || /SHADOW_FORUM/.test(src));
    assert.ok(/FORUM_AUTO_POST:\s*'0'/.test(src));
    assert.ok(/never invent pid/i.test(src));
  });
});
