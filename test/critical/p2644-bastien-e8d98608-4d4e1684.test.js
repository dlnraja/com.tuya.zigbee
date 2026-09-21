'use strict';

/**
 * P2644 — Bastien diags e8d98608 + 4d4e1684
 * Contre quoi:
 *  - CI.containsCI ReferenceError kills onNodeInit (remote_button_* )
 *  - switch_1gang invents switch_1gang_1gang_turned_* (FLOW-GUARD)
 *  - axpdxqgu+TS0041 must stay on button_wireless_1 (not wall remote)
 * Dual-app: BOTH (+ Bastien house)
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const {
  buildOnOffTurnedFlowCandidates,
} = require('../../lib/flow/FlowCardHeuristics');

describe('P2644 Bastien e8d98608 / 4d4e1684', () => {
  it('no CI.containsCI in remote_button_wireless_* device.js', () => {
    const dir = path.join(ROOT, 'drivers');
    const drivers = fs.readdirSync(dir).filter((d) => d.startsWith('remote_button_wireless'));
    assert.ok(drivers.length >= 1);
    for (const d of drivers) {
      const p = path.join(dir, d, 'device.js');
      if (!fs.existsSync(p)) continue;
      const src = fs.readFileSync(p, 'utf8');
      assert.ok(!/\bCI\.containsCI\b/.test(src), `${d} still uses CI.containsCI`);
      if (/containsCI\(/.test(src)) {
        assert.ok(
          /CaseInsensitiveMatcher/.test(src),
          `${d} uses containsCI without CaseInsensitiveMatcher import`,
        );
      }
    }
  });

  it('switch_1gang prefers switch_1gang_turned_on not *_1gang_1gang_*', () => {
    const c = buildOnOffTurnedFlowCandidates('switch_1gang', 1, true);
    assert.equal(c[0], 'switch_1gang_turned_on');
    assert.ok(!c.includes('switch_1gang_1gang_turned_on'));
    assert.ok(c.includes('switch_1gang_physical_gang1_on') || c.includes('switch_1gang_physical_on'));
  });

  it('contact_sensor_1gang still gets *_1gang_turned_* candidate', () => {
    const c = buildOnOffTurnedFlowCandidates('contact_sensor', 1, false);
    assert.ok(c.includes('contact_sensor_turned_off'));
    assert.ok(c.includes('contact_sensor_1gang_turned_off'));
  });

  it('axpdxqgu+TS0041 locked on button_wireless_1, not wall remote mfr list', () => {
    const bw = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/button_wireless_1/driver.compose.json'),
      'utf8',
    ));
    const wall = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/remote_button_wireless_wall/driver.compose.json'),
      'utf8',
    ));
    assert.ok((bw.zigbee.manufacturerName || []).some((m) => /axpdxqgu/i.test(m)));
    assert.ok((bw.zigbee.productId || []).includes('TS0041'));
    assert.ok(!(wall.zigbee.manufacturerName || []).some((m) => /axpdxqgu/i.test(m)));
  });

  it('vsxvaj9i+TS0043 locked on button_wireless_3', () => {
    const bw3 = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/button_wireless_3/driver.compose.json'),
      'utf8',
    ));
    assert.ok((bw3.zigbee.manufacturerName || []).some((m) => /vsxvaj9i/i.test(m)));
    assert.ok((bw3.zigbee.productId || []).includes('TS0043'));
  });

  it('remote_button_wireless_wall is 1-btn only (no TS0043 steal — Bastien 4d4e1684)', () => {
    const wall = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/remote_button_wireless_wall/driver.compose.json'),
      'utf8',
    ));
    const pids = wall.zigbee.productId || [];
    assert.ok(pids.includes('TS0041'));
    assert.ok(!pids.includes('TS0043'), 'wall must not claim TS0043 (3ch)');
    assert.ok(!pids.includes('TS0042'));
    assert.ok(!pids.includes('TS0044'));
    const caps = wall.capabilities || [];
    assert.ok(caps.includes('button.1'));
    assert.ok(!caps.includes('button.2'));
    assert.ok(!caps.includes('button.3'));
  });
});
