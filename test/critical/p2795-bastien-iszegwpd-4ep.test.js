'use strict';
const { describe, it } = require('../_support/dual-runner'); // P3020: same file under node --test and mocha
/**
 * Issue #554 (draqlek, TS0046 / _TZ3000_iszegwpd 6-gang wall remote) on Bastien's tree.
 * The remote joins with endpoints 1-4 only (interview in the issue, ZHA#2034); a manifest that demands
 * endpoints 5-6 makes Homey refuse the pairing. Rewritten in our own words.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');

describe('P2795 Bastien port - #554 iszegwpd + TS0046 pairs on wall_remote_6_gang with 4 endpoints', () => {
  const compose = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/wall_remote_6_gang/driver.compose.json'), 'utf8'));
  const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
  it('compose claims the couple and declares only EP1-4', () => {
    assert.ok(compose.zigbee.manufacturerName.includes('_TZ3000_iszegwpd'));
    assert.ok(compose.zigbee.productId.includes('TS0046'));
    assert.deepStrictEqual(Object.keys(compose.zigbee.endpoints).sort(), ['1', '2', '3', '4']);
  });
  it('built app.json mirrors it', () => {
    const d = app.drivers.find((x) => x.id === 'wall_remote_6_gang');
    assert.ok(d.zigbee.manufacturerName.includes('_TZ3000_iszegwpd'));
    assert.deepStrictEqual(Object.keys(d.zigbee.endpoints).sort(), ['1', '2', '3', '4']);
  });
  it('the couple has exactly one owner for TS0046 (scene_switch_6 only keeps its own TS0601_scene6)', () => {
    const owners = app.drivers.filter((d) => d.zigbee
      && d.zigbee.manufacturerName.some((m) => m.toLowerCase() === '_tz3000_iszegwpd')
      && (d.zigbee.productId || []).some((p) => p.toLowerCase() === 'ts0046')).map((d) => d.id);
    assert.deepStrictEqual(owners, ['wall_remote_6_gang']);
  });
  it('device soft-fails EF00 TX and the profile marks the remote sleepy', () => {
    const dev = fs.readFileSync(path.join(ROOT, 'drivers/wall_remote_6_gang/device.js'), 'utf8');
    assert.ok(dev.includes('skipEf00Tx'));
    const mix = fs.readFileSync(path.join(ROOT, 'lib/mixins/PhysicalButtonMixin.js'), 'utf8');
    assert.ok(/'_TZ3000_iszegwpd'[\s\S]{0,400}noEf00Tx: true/.test(mix));
  });
});
