'use strict';
// P3070: bulb and LED-strip drivers of class "light" were shipped with the generic module icon.
// They now reuse the repo's own bulb (bulb_white) and strip (dimmable_led_strip) assets: no new
// artwork, no app.json change. Guard: a light-class driver whose id names a bulb, spot or strip
// must not fall back to the generic module icon again.
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const D = path.resolve(__dirname, '../../drivers');
const md5 = (p) => crypto.createHash('md5').update(fs.readFileSync(p)).digest('hex');
const asset = (id, f) => path.join(D, id, 'assets', f);
const FILES = ['icon.svg', 'images/small.png', 'images/large.png'];
const MAP = {
  bulb_white: ['bulb_rgb_rgbw', 'light_bulb_dimmable_tunable', 'light_bulb_rgb', 'light_bulb_rgb_led',
    'light_bulb_tunable_white', 'rgb_bulb_E14', 'rgb_bulb_E27', 'tunable_bulb_E14', 'tunable_bulb_E27',
    'rgb_spot_GU10', 'tunable_spot_GU10', 'rgb_spot_GardenLight', 'dimmer_bulb_dimmable', 'bulb_dimmable_dimmer'],
  dimmable_led_strip: ['rgb_led_strip', 'rgb_led_strip_controller'],
};

describe('P3070 light drivers use a light icon from existing repo assets', () => {
  it('each listed driver mirrors its source icon and images', () => {
    for (const [src, ids] of Object.entries(MAP)) {
      for (const id of ids) {
        for (const f of FILES) assert.strictEqual(md5(asset(id, f)), md5(asset(src, f)), `${id}/${f}`);
      }
    }
  });

  it('no bulb/spot/strip light driver uses the generic module icon', () => {
    const generic = md5(asset('air_purifier_contact', 'icon.svg'));
    const bad = fs.readdirSync(D).filter((id) => {
      const c = path.join(D, id, 'driver.compose.json');
      if (!fs.existsSync(c) || !fs.existsSync(asset(id, 'icon.svg'))) return false;
      const cls = JSON.parse(fs.readFileSync(c, 'utf8')).class;
      return cls === 'light' && /bulb|spot|strip/i.test(id) && md5(asset(id, 'icon.svg')) === generic;
    });
    assert.deepStrictEqual(bad, []);
  });
});
