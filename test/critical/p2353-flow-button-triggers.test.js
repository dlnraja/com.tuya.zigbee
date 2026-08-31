'use strict';

/**
 * P2353 — Flow / button / trigger treatment
 * - scene_switch + multi-button remotes emit Ngang declared card candidates
 * - sacred-keep pins for wkai4ga5 / dfgbtub0 remotes
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

describe('P2353 flow button trigger candidates', () => {
  it('scene_switch_4 emits both button_N and 4gang declared shapes', () => {
    const c = buildPhysicalFlowCandidates('scene_switch_4', 1, 'single', {
      gangCount: 4,
      isButtonDevice: true,
    });
    assert.ok(c.some((id) => id === 'scene_switch_4_button_1_pressed'));
    assert.ok(c.some((id) => id === 'scene_switch_4_button_4gang_button_1_pressed'));
    assert.ok(c.some((id) => id === 'scene_switch_4_button_pressed'));
    assert.ok(!c.some((id) => /button_1gang_button_pressed/.test(id)));
  });

  it('button_wireless_4 prefers 4gang_button_N shapes', () => {
    const c = buildPhysicalFlowCandidates('button_wireless_4', 2, 'single', {
      gangCount: 4,
      isButtonDevice: true,
    });
    assert.ok(c.some((id) => id === 'button_wireless_4_button_4gang_button_2_pressed'));
    assert.ok(c.some((id) => id === 'button_wireless_4_button_4gang_button_pressed'));
    assert.ok(!c.some((id) => /_button_2_button_pressed$/.test(id)));
  });

  it('resolveFlowCardId stays declared-only (no invent)', () => {
    const declared = new Set([
      'scene_switch_4_button_1_pressed',
      'scene_switch_4_button_4gang_button_1_pressed',
    ]);
    const c = buildPhysicalFlowCandidates('scene_switch_4', 1, 'single', {
      gangCount: 4,
      isButtonDevice: true,
    });
    const hit = resolveFlowCardId(c, declared);
    assert.ok(hit);
    assert.ok(declared.has(hit));
  });

  it('sacred-keep pins button remotes wkai / dfg', () => {
    const keep = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'config/architecture/publish-sacred-keep-couples.json'),
      'utf8',
    ));
    const has = (mfr, pid, driverId) => keep.couples.some(
      (c) => c.mfr.toLowerCase() === mfr.toLowerCase()
        && c.pid.toUpperCase() === pid
        && c.driverId === driverId,
    );
    assert.ok(has('_TZ3000_wkai4ga5', 'TS0044', 'scene_switch_4'));
    assert.ok(has('_TZ3000_dfgbtub0', 'TS0044', 'button_wireless_4'));
    assert.ok(has('_TZ3000_dfgbtub0', 'TS0042', 'button_wireless_2'));
  });

  it('no titleFormatted [[device]] in button/wall flow compose', () => {
    const dirs = [
      'scene_switch_4', 'button_wireless_1', 'button_wireless_2',
      'button_wireless_3', 'button_wireless_4',
      'wall_switch_1gang_1way', 'wall_switch_2gang_1way',
      'wall_switch_3gang_1way', 'wall_switch_4gang_1way',
    ];
    for (const id of dirs) {
      const fp = path.join(ROOT, 'drivers', id, 'driver.flow.compose.json');
      const j = JSON.parse(fs.readFileSync(fp, 'utf8'));
      for (const t of j.triggers || []) {
        assert.equal(
          JSON.stringify(t.titleFormatted || {}).includes('[[device]]'),
          false,
          `${id} ${t.id}`,
        );
      }
    }
  });
});
