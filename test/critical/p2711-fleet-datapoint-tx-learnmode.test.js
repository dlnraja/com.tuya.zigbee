'use strict';

/**
 * P2711 — Fleet GitHub/forum treat: EF00 datapoint TX frame + #551 learnmode
 *
 * Contre quoi:
 * - UniversalDriverInit.sendTuyaDP / NamedButtonFallback pass `value` →
 *   Homey "tuya.datapoint: value is an unexpected property" (Michaelp #2253 class)
 * - button_wireless_3 Universal learnmode says "Zigbee Bastien" → users pick wrong app (#551)
 * Dual-app: BOTH (TX frame) · MASTER learnmode string (Bastien keeps Bastien wording)
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2711 fleet datapoint TX + famkxci2 learnmode', () => {
  it('UniversalDriverInit.sendTuyaDP builds full status/transid/length frame', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/helpers/UniversalDriverInit.js'), 'utf8');
    assert.ok(src.includes('P2711'));
    assert.match(src, /status:\s*0/);
    assert.match(src, /transid/);
    assert.match(src, /length:\s*buf\.length/);
    assert.ok(!/datapoint\(\s*\{\s*dp\s*,\s*datatype:\s*dt\s*,\s*data:\s*buf\s*\}\s*\)/.test(src));
    assert.ok(!/datapoint\(\s*\{[^}]*\bvalue\s*:/.test(src));
  });

  it('NamedButtonFallback feed never passes value key to datapoint', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/mixins/NamedButtonFallback.js'), 'utf8');
    assert.ok(src.includes('P2711'));
    const feed = src.slice(src.indexOf('async function _feed'), src.indexOf('function registerNamedButtonFallbacks'));
    assert.ok(!/\bvalue\s*:/.test(feed));
    assert.match(feed, /status:\s*0/);
  });

  it('button_wireless_3 learnmode names this app track (not wrong sibling)', () => {
    const compose = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/button_wireless_3/driver.compose.json'),
      'utf8',
    ));
    const app = JSON.parse(fs.readFileSync(path.join(ROOT, '.homeycompose/app.json'), 'utf8'));
    const en = compose.zigbee?.learnmode?.instruction?.en || '';
    const id = String(app.id || '');
    if (id.includes('bastien')) {
      assert.match(en, /Zigbee Bastien|Bastien/);
    } else if (id.includes('stable')) {
      assert.match(en, /Tuya Unified|Stable/);
      assert.ok(!/Zigbee Bastien/.test(en));
    } else {
      assert.match(en, /Universal Tuya/);
      assert.ok(!/Zigbee Bastien/.test(en));
    }
    assert.ok(srcHasFam(compose));
  });

  it('npm check:p2711 wired', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts && pkg.scripts['check:p2711']);
  });
});

function srcHasFam(compose) {
  const mfr = compose.zigbee?.manufacturerName || [];
  return mfr.some((m) => /famkxci2/i.test(m));
}
