'use strict';

/**
 * P2745 — Bastien 2-btn Homey tagged Flows Contre quoi
 * Screenshot: Bouton appuyé / double / long / multi + batterie changée (tag icon)
 * were dead on snappy TS0042 while Bouton 1* still pulsed via capability UI.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2745 Bastien 2-btn tagged flow cards', () => {
  it('heuristics map multi/triple to declared *_button_multi_press (not bare multi)', () => {
    const { buildPhysicalFlowCandidates } = require('../../lib/flow/FlowCardHeuristics');
    const multi = buildPhysicalFlowCandidates('button_wireless_2', 1, 'multi', {
      gangCount: 2,
      isButtonDevice: true,
    });
    assert.ok(multi.includes('button_wireless_2_button_2gang_button_multi_press'));
    assert.ok(!multi.includes('button_wireless_2_button_2gang_multi'));
    const dbl = buildPhysicalFlowCandidates('button_wireless_2', 1, 'double', {
      gangCount: 2,
      isButtonDevice: true,
    });
    assert.ok(dbl.includes('button_wireless_2_button_2gang_button_double_press'));
    assert.ok(dbl.includes('button_wireless_2_button_2gang_button_1_double'));
    assert.ok(!dbl.includes('button_wireless_2_button_2gang_button_1_pressed'),
      'double must not prefer single pressed');
  });

  it('snappy path fires generic dropdown + numbered (not preferred-only)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/devices/ButtonDevice.js'), 'utf8');
    assert.ok(src.includes('P2745'));
    assert.ok(src.includes('${base}_button_pressed'));
    assert.ok(src.includes('${base}_button_${btnNum}_pressed'));
    assert.ok(src.includes('${base}_button_double_press'));
    assert.ok(src.includes('${base}_button_multi_press'));
    assert.ok(!/Snappy = ONE primary Flow/.test(src));
  });

  it('button_wireless_2 compose: token≠arg name + measure_battery_changed', () => {
    const flow = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/button_wireless_2/driver.flow.compose.json'), 'utf8'));
    const byId = Object.fromEntries((flow.triggers || []).map((t) => [t.id, t]));
    const generic = byId.button_wireless_2_button_2gang_button_pressed;
    assert.ok(generic);
    assert.ok(generic.args?.some((a) => a.name === 'button'));
    assert.ok(generic.tokens?.some((t) => t.name === 'button_id'),
      'token must be button_id (not button) to avoid Homey arg collision');
    assert.ok(!generic.tokens?.some((t) => t.name === 'button'));
    assert.ok(byId.button_wireless_2_measure_battery_changed);
    assert.ok(byId.button_wireless_2_measure_battery_changed.tokens?.some((t) => t.name === 'battery'));
  });

  it('npm check:p2745 wired', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts['check:p2745']);
  });
});
