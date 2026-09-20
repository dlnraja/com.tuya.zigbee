'use strict';

/**
 * P2625 — `_TZ3000_vsxvaj9i`+`TS0043` Contre quoi
 * Flat CR2032 3-btn enddevice: buttons must be visible in device UX
 * (maintenanceAction false), sacred couple on button_wireless_3,
 * OnOff 0xFD multi-EP clusters, per-button flow cards.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const COMPOSE = path.join(ROOT, 'drivers/button_wireless_3/driver.compose.json');
const FLOW = path.join(ROOT, 'drivers/button_wireless_3/driver.flow.compose.json');
const REG = path.join(ROOT, 'data/user-misattribution-registry.json');

describe('P2625 vsxvaj9i+TS0043 button_wireless_3 UX', () => {
  it('locks sacred couple on button_wireless_3 with case forms', () => {
    const c = JSON.parse(fs.readFileSync(COMPOSE, 'utf8'));
    const mfrs = c.zigbee?.manufacturerName || [];
    assert.ok(mfrs.some((x) => String(x) === '_TZ3000_vsxvaj9i'));
    assert.ok(mfrs.some((x) => /vsxvaj9i/i.test(String(x))));
    assert.ok((c.zigbee?.productId || []).includes('TS0043'));
    assert.equal(c.class, 'button');
    for (const cap of ['button.1', 'button.2', 'button.3', 'measure_battery']) {
      assert.ok((c.capabilities || []).includes(cap), `missing cap ${cap}`);
    }
  });

  it('scene UX: button.1-3 visible in device view (not Maintenance-only)', () => {
    const c = JSON.parse(fs.readFileSync(COMPOSE, 'utf8'));
    for (const k of ['button.1', 'button.2', 'button.3']) {
      const opts = c.capabilitiesOptions?.[k];
      assert.ok(opts, `capabilitiesOptions.${k}`);
      assert.equal(opts.maintenanceAction, false, `${k} must not be maintenance-only`);
    }
  });

  it('EP1-3 bind OnOff (cluster 6) for 0xFD press path', () => {
    const c = JSON.parse(fs.readFileSync(COMPOSE, 'utf8'));
    for (const ep of ['1', '2', '3']) {
      const e = c.zigbee?.endpoints?.[ep];
      assert.ok(e, `endpoint ${ep}`);
      assert.ok((e.clusters || []).includes(6), `EP${ep} needs OnOff 6`);
      assert.ok((e.bindings || []).includes(6), `EP${ep} needs OnOff bind`);
    }
  });

  it('flow cards expose per-button presses (no invent)', () => {
    const f = JSON.parse(fs.readFileSync(FLOW, 'utf8'));
    const ids = (f.triggers || []).map((t) => t.id);
    assert.ok(ids.includes('button_wireless_3_button_3gang_button_1_pressed'));
    assert.ok(ids.includes('button_wireless_3_button_3gang_button_2_pressed'));
    assert.ok(ids.includes('button_wireless_3_button_3gang_button_3_pressed'));
    assert.ok(ids.includes('button_wireless_3_button_3gang_button_pressed'));
  });

  it('misattribution forbids remote_wall / 1-2gang / handheld for this couple', () => {
    const reg = JSON.parse(fs.readFileSync(REG, 'utf8'));
    const entry = (reg.cases || []).find(
      (c) => c && c.id === 'p2625-vsxvaj9i-ts0043-button-wireless-3',
    );
    assert.ok(entry);
    assert.equal(entry.canonicalDriver, 'button_wireless_3');
    assert.ok(entry.forbiddenDrivers.includes('remote_button_wireless_wall'));
    assert.ok(entry.forbiddenDrivers.includes('button_wireless_1'));
    assert.ok(reg.entries?.['p2625-tz3000_vsxvaj9i-ts0043']);
  });

  it('npm check:p2625 wired', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts['check:p2625']);
  });
});
