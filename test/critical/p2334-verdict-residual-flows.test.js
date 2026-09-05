'use strict';

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;
/**
 * P2334 — residual flow-fire blockers after P2331/32 audit verdict
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');

describe('P2334 verdict residual flow IDs', () => {
  it('app.json has full fingerbot physical_* (no hashed physi_)', () => {
    const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
    const ids = (app.flow?.triggers || []).map((t) => t.id).filter(Boolean);
    const hashed = ids.filter((id) => /fingerbot_switch_1gang_physi_/i.test(id)
      || /fingerbot_switch_1gang_power_[a-f0-9]{5}$/i.test(id));
    assert.deepStrictEqual(hashed, [], `hashed still in app.json: ${hashed.join(',')}`);
    const flowCompose = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/button_wireless_fingerbot/driver.flow.compose.json'), 'utf8'));
    const allIds = new Set([...ids, ...(flowCompose.triggers || []).map(t => t.id)]);
    for (const suffix of ['physical_single', 'physical_double', 'physical_long_press', 'physical_triple', 'physical_off', 'power_changed']) {
      const id = `button_wireless_fingerbot_switch_1gang_${suffix}`;
      assert.ok(allIds.has(id), `missing in declared flow cards: ${id}`);
    }
  });

  it('CoreCapabilityMixin covers _1gang_turned_ and _Ngang_gangN_turned_', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/mixins/CoreCapabilityMixin.js'), 'utf8');
    assert.match(src, /_1gang_turned_\$\{stateStr\}/);
    assert.match(src, /\$\{gangNum\}gang_gang\$\{gangNum\}_turned_/);
  });

  it('FlowCardHeuristics includes switch_1gang_physical for 1-gang', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/flow/FlowCardHeuristics.js'), 'utf8');
    assert.match(src, /switch_1gang_physical_\$\{pressType\}/);
  });
});
