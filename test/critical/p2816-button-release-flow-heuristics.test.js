'use strict';

/**
 * Contre quoi (P2816 / button-flow-harvest 2026-10-14):
 * multi-gang remotes declare `${driver}_button_Ngang_button_${gang}_release`
 * — heuristics must not invent bare `${driver}_button_Ngang_release`.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const {
  buildPhysicalFlowCandidates,
} = require(path.join(ROOT, 'lib', 'flow', 'FlowCardHeuristics.js'));

describe('P2816 multi-gang button release flow candidates', () => {
  it('emits numbered release cards for button_wireless_2', () => {
    const c = buildPhysicalFlowCandidates('button_wireless_2', 1, 'release', {
      gangCount: 2,
      isButtonDevice: true,
    });
    assert.ok(
      c.includes('button_wireless_2_button_2gang_button_1_release'),
      `missing numbered release, got=${c.filter((x) => /release/i.test(x)).join(',')}`,
    );
  });

  it('emits numbered release for scene_switch_4 gang 3', () => {
    const c = buildPhysicalFlowCandidates('scene_switch_4', 3, 'release', {
      gangCount: 4,
      isButtonDevice: true,
    });
    assert.ok(c.includes('scene_switch_4_button_4gang_button_3_release'));
  });

  it('UniversalFlowCardLoader prefers device trigger for tuya_dp_received', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'lib', 'flow', 'UniversalFlowCardLoader.js'),
      'utf8',
    );
    const idxDevice = src.indexOf("getDeviceTriggerCard('tuya_dp_received')");
    const idxApp = src.indexOf("getTriggerCard('tuya_dp_received')");
    assert.ok(idxDevice > 0 && idxApp > 0);
    assert.ok(idxDevice < idxApp, 'device trigger must be tried before app trigger');
    assert.match(src, /invalid_flow_card_id/);
  });
});
