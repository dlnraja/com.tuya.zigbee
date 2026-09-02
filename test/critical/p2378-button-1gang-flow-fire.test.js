'use strict';

/**
 * P2378 — Peter Smartbutton (cfbf687f): 1-gang remotes must fire *_button_1gang_* compose cards.
 * Diag showed 0xFD RX + button_matrix OK, but Flows on button_wireless_1_button_1gang_* never ran.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const {
  buildPhysicalFlowCandidates,
  resolveFlowCardId,
} = require(path.join(ROOT, 'lib/flow/FlowCardHeuristics.js'));

describe('P2378 button_wireless_1 1gang flow fire', () => {
  it('compose declares 1gang pressed/double/long cards', () => {
    const flow = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/button_wireless_1/driver.flow.compose.json'), 'utf8'));
    const ids = flow.triggers.map((t) => t.id);
    assert.ok(ids.includes('button_wireless_1_button_1gang_button_pressed'));
    assert.ok(ids.includes('button_wireless_1_button_1gang_button_double_press'));
    assert.ok(ids.includes('button_wireless_1_button_1gang_button_long_press'));
  });

  it('heuristics include 1gang cards for gangCount=1', () => {
    const flow = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/button_wireless_1/driver.flow.compose.json'), 'utf8'));
    const declared = new Set(flow.triggers.map((t) => t.id));
    for (const press of ['single', 'double', 'long']) {
      const c = buildPhysicalFlowCandidates('button_wireless_1', 1, press, {
        gangCount: 1,
        isButtonDevice: true,
      });
      assert.ok(c.some((id) => /button_1gang/.test(id)), `missing 1gang for ${press}`);
      assert.ok(resolveFlowCardId(c, declared), `no declared resolve for ${press}`);
    }
  });

  it('ButtonDevice trigger path always tries Ngang cards (source contains 1gang)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/devices/ButtonDevice.js'), 'utf8');
    assert.ok(src.includes('buildPhysicalFlowCandidates'));
    assert.ok(src.includes('P2378'));
    // Must not gate Ngang cards behind gangCount > 1 only
    assert.ok(!/if \(gangCount > 1\) \{\s*await this\._tryCard\(`\$\{driverId\}_button_\$\{gangCount\}gang_button_pressed`/.test(src));
    assert.ok(src.includes('`$${driverId}_button_${gangCount}gang_button_pressed`')
      || src.includes('${driverId}_button_${gangCount}gang_button_pressed'));
  });
});
