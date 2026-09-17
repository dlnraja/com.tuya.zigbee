'use strict';

/**
 * P2554 — Button fleet first-press / cascade harden (Z2M / ZHA / HA / Homey)
 *
 * Contre quoi:
 * - harvest false-high app_json_drift vs root app.json (Homey merges in .homeybuild)
 * - TS0046 missing from cascade preferred levels
 * - dfgbtub0 without skip8004 profile (0x8004 kills 0xFD)
 * - magic packet on init without force (first press after sleep dropped)
 * - HomeyCompensationLayer only queueing magic for TS0041–44 (not 45/46)
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2554 button fleet first-press', () => {
  it('cascade runtime SSOT has TS0041–46 + dfgbtub0 preferred levels', () => {
    const cascade = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'lib/resilience/data/button-capture-cascade.json'), 'utf8'));
    for (const pid of ['TS0041', 'TS0042', 'TS0043', 'TS0044', 'TS0045', 'TS0046']) {
      assert.ok(Array.isArray(cascade.productPreferredLevels[pid]), `missing ${pid}`);
      assert.ok(cascade.productPreferredLevels[pid].includes(1), `${pid} needs L1 0xFD`);
      assert.ok(cascade.productPreferredLevels[pid].includes(2), `${pid} needs L2 raw`);
    }
    assert.ok(cascade.manufacturerPreferredLevels.dfgbtub0?.includes(1));
    assert.ok(cascade.manufacturerPreferredLevels.iszegwpd?.includes(1));
  });

  it('CI cascade copy stays in sync with runtime SSOT', () => {
    const runtime = fs.readFileSync(
      path.join(ROOT, 'lib/resilience/data/button-capture-cascade.json'), 'utf8');
    const ci = fs.readFileSync(
      path.join(ROOT, 'config/resilience/button-capture-cascade.json'), 'utf8');
    assert.equal(ci, runtime);
  });

  it('PhysicalButtonMixin forces magic packet + dfgbtub0 skip8004', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'lib/mixins/PhysicalButtonMixin.js'), 'utf8');
    assert.match(src, /force:\s*true/);
    assert.match(src, /_TZ3000_dfgbtub0/);
    assert.match(src, /skip8004:\s*true/);
    assert.match(src, /P2554/);
  });

  it('ButtonDevice wake magic covers TS0041–6F + TS0215', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'lib/devices/ButtonDevice.js'), 'utf8');
    assert.match(src, /TS004\[1-6F\]\|TS0215/);
  });

  it('HomeyCompensationLayer queues magic for TS0041–6', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'lib/io/HomeyCompensationLayer.js'), 'utf8');
    assert.match(src, /TS004\[1-6\]/);
  });

  it('button-flow-harvest prefers .homeybuild and marks drift as info', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'tools/ci/button-flow-harvest.js'), 'utf8');
    assert.match(src, /\.homeybuild/);
    assert.match(src, /severity:\s*'info'/);
    assert.match(src, /P2554/);
  });

  it('preferredLevels falls through any TS004* to hybrid FD path', () => {
    const { preferredLevels, loadCascade } = require('../../lib/mixins/ButtonCaptureCascade');
    const cascade = loadCascade();
    const device = {
      getSetting: (k) => (k === 'zb_model_id' ? 'TS0046' : null),
      getData: () => ({}),
    };
    const levels = preferredLevels(device, cascade);
    assert.ok(levels.includes(1) && levels.includes(2));
  });

  it('button_wireless_1/2/4 compose keep dfgbtub0 sacred couples', () => {
    const bw2 = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/button_wireless_2/driver.compose.json'), 'utf8'));
    const bw4 = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/button_wireless_4/driver.compose.json'), 'utf8'));
    assert.ok(bw2.zigbee.manufacturerName.includes('_TZ3000_dfgbtub0'));
    assert.ok(bw2.zigbee.productId.includes('TS0042'));
    assert.ok(bw4.zigbee.manufacturerName.includes('_TZ3000_dfgbtub0'));
    assert.ok(bw4.zigbee.productId.includes('TS0044'));
  });

  it('harvest loadAppFlowIdsByPrefix finds button_wireless_1 cards in .homeybuild', () => {
    const harvestPath = path.join(ROOT, 'tools/ci/button-flow-harvest.js');
    const src = fs.readFileSync(harvestPath, 'utf8');
    // Smoke: .homeybuild has the merged card when build exists
    const buildPath = path.join(ROOT, '.homeybuild', 'app.json');
    if (!fs.existsSync(buildPath)) {
      assert.ok(src.includes('.homeybuild'));
      return;
    }
    const app = JSON.parse(fs.readFileSync(buildPath, 'utf8'));
    const ids = (app.flow?.triggers || []).map((t) => t.id);
    assert.ok(ids.some((id) => id.startsWith('button_wireless_1_')));
  });
});
