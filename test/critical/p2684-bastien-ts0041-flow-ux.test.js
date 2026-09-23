'use strict';

/**
 * P2684 — Bastien TS0041 « not recognized / no Bouton 1 appuyé Flow »
 * Contre quoi: Unknown pairing + dead 0xFD + dual battery + missing flow cards.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2684 Bastien TS0041 button_wireless_1 Flow UX', () => {
  it('compose locks axpdxqgu+TS0041 and teaches Flow Bouton 1 (not Zigbee channels)', () => {
    const compose = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/button_wireless_1/driver.compose.json'), 'utf8'));
    assert.ok((compose.zigbee.manufacturerName || []).some((m) => /axpdxqgu/i.test(m)));
    assert.ok((compose.zigbee.productId || []).includes('TS0041'));
    assert.strictEqual(compose.class, 'button');
    assert.ok((compose.capabilities || []).includes('button.1'));
    assert.ok(!(compose.capabilities || []).includes('alarm_battery'),
      'Homey BATTERY_CAPABILITY_CONFLICT — measure only');
    const lm = JSON.stringify(compose.zigbee.learnmode || {});
    assert.match(lm, /Bouton 1 appuy|Button 1 pressed/i);
    assert.match(lm, /PAS Homey Zigbee|NOT Homey Zigbee/i);
  });

  it('flow compose declares Bouton 1 appuyé + Bouton appuyé', () => {
    const flow = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/button_wireless_1/driver.flow.compose.json'), 'utf8'));
    const ids = (flow.triggers || []).map((t) => t.id);
    assert.ok(ids.includes('button_wireless_1_button_1gang_button_1_pressed'));
    assert.ok(ids.includes('button_wireless_1_button_1gang_button_pressed'));
  });

  it('axpdxqgu DEVICE_PROFILES is snappy hybrid skip8004 buttonCount 1', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/mixins/PhysicalButtonMixin.js'), 'utf8');
    assert.match(src, /'_TZ3000_axpdxqgu'\s*:\s*\{[\s\S]*?debounceMs:\s*80/);
    assert.match(src, /'_TZ3000_axpdxqgu'\s*:\s*\{[\s\S]*?buttonCount:\s*1/);
    assert.match(src, /'_TZ3000_axpdxqgu'\s*:\s*\{[\s\S]*?skip8004:\s*true/);
    assert.match(src, /axpdxqgu\|adndolvx|axpdxqgu/);
  });

  it('device.js rehydrates button.1 + strips dual alarm_battery', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/button_wireless_1/device.js'), 'utf8');
    assert.match(src, /P2684 rehydrate button\.1/);
    assert.match(src, /removeCapability\('alarm_battery'\)/);
    assert.match(src, /applyHomeyButtonUiCharter/);
  });

  it('heuristics emit numbered button_1_pressed for button_wireless_1', () => {
    const { buildPhysicalFlowCandidates } = require('../../lib/flow/FlowCardHeuristics');
    const c = buildPhysicalFlowCandidates('button_wireless_1', 1, 'single', {
      gangCount: 1,
      isButtonDevice: true,
    });
    assert.ok(c.some((id) => /button_1gang_button_1_pressed$/i.test(id)));
    assert.ok(c.some((id) => /button_1gang_button_pressed$/i.test(id)));
  });
});
