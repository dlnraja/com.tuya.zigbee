'use strict';

/**
 * P2668 — Bastien complementary couple patches Contre quoi
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2668 Bastien complementary couple research patches', () => {
  it('Hobeian heal sets Energy approximation (Z2M no metering)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/tuya/HobeianZg301zHeal.js'), 'utf8');
    assert.ok(src.includes('P2668'));
    assert.ok(src.includes('setEnergy'));
    assert.ok(src.includes('usageConstant'));
  });

  it('switch_1gang learnmode mentions Bastien + HOBEIAN + ≥1.0.44', () => {
    const j = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/switch_1gang/driver.compose.json'),
      'utf8',
    ));
    const en = j.zigbee?.learnmode?.instruction?.en || '';
    assert.ok(/Zigbee Bastien/i.test(en));
    assert.ok(/HOBEIAN|ZG-301Z/i.test(en));
    assert.ok(/1\.0\.4[34]/.test(en));
  });

  it('lcdtemphumidsensor has anti-Virtual learnmode', () => {
    const j = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/lcdtemphumidsensor/driver.compose.json'),
      'utf8',
    ));
    const en = j.zigbee?.learnmode?.instruction?.en || '';
    assert.ok(/Zigbee Bastien/i.test(en));
    assert.ok(/NOT Homey Zigbee/i.test(en));
  });

  it('switch_4gang setClass light for ltt60asa family', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/switch_4gang/device.js'), 'utf8');
    assert.ok(src.includes('P2668'));
    assert.ok(src.includes("setClass('light')"));
    assert.ok(/ltt60asa/i.test(src));
  });

  it('npm check:p2668 wired', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts['check:p2668']);
  });
});
