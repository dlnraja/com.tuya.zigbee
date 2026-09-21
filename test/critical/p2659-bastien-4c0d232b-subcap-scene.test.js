'use strict';

/**
 * P2659 — Bastien diag 4c0d232b (Zigbee Bastien v1.0.34)
 * Contre quoi:
 *  - sub_capability_changed tokens pass boolean value (Homey: Expected string)
 *  - switch_1gang invents undeclared *_gang1_scene / *_1gang_gang1_scene (FLOW-GUARD)
 *  - 3ch remote still stolen by wall (TS0043) — lock button_wireless_3
 * Dual-app: BOTH + Bastien house tip
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2659 Bastien 4c0d232b subcap string + no scene invent', () => {
  it('UniversalFlowCardLoader stringifies sub_capability_changed value', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'lib/flow/UniversalFlowCardLoader.js'),
      'utf8',
    );
    assert.match(src, /triggerSubCapabilityChanged/);
    assert.match(src, /String\(value\)/);
    assert.match(src, /P2659|4c0d232b/);
  });

  it('PhysicalButtonMixin only fires declared scene cards (no invent)', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'lib/mixins/PhysicalButtonMixin.js'),
      'utf8',
    );
    assert.match(src, /findDeclaredCI\(declaredScene, sceneCardId\)/);
    assert.match(src, /P2659|4c0d232b/);
    assert.ok(
      !/for \(const sceneCardId of sceneCandidates\) \{\s*this\._safeTriggerFlow\(sceneCardId/.test(src),
      'must not blindly _safeTriggerFlow every scene candidate',
    );
  });

  it('FlowCardHeuristics refuses undeclared *_gangN_scene driver-prefix probe', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'lib/flow/FlowCardHeuristics.js'),
      'utf8',
    );
    assert.match(src, /_gang\\d\+_scene/);
    assert.match(src, /P2659|4c0d232b/);
  });

  it('triggerSubCapabilityChanged coerces boolean to string at runtime', async () => {
    // Light unit: load class from source via require (module exports class)
    const UniversalFlowCardLoader = require('../../lib/flow/UniversalFlowCardLoader');
    let triggered = null;
    const homey = {
      isDestroyed: false,
      app: { log() {} },
      flow: {
        getDeviceTriggerCard(id) {
          assert.equal(id, 'sub_capability_changed');
          return {
            async trigger(device, tokens) {
              triggered = tokens;
            },
          };
        },
      },
    };
    const loader = new UniversalFlowCardLoader(homey);
    await loader.triggerSubCapabilityChanged({}, 'onoff', true);
    assert.deepEqual(triggered, { capability: 'onoff', value: 'true' });
    await loader.triggerSubCapabilityChanged({}, 'onoff.gang2', false);
    assert.deepEqual(triggered, { capability: 'onoff.gang2', value: 'false' });
  });

  it('vsxvaj9i+TS0043 stays on button_wireless_3; wall has no TS0043', () => {
    const bw3 = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/button_wireless_3/driver.compose.json'),
      'utf8',
    ));
    const wall = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/remote_button_wireless_wall/driver.compose.json'),
      'utf8',
    ));
    assert.ok((bw3.zigbee.manufacturerName || []).some((m) => /vsxvaj9i/i.test(m)));
    assert.ok((bw3.zigbee.productId || []).includes('TS0043'));
    assert.ok(!(wall.zigbee.productId || []).includes('TS0043'));
  });

  it('switch_1gang flow compose has no undeclared gang1_scene trigger id', () => {
    const flowPath = path.join(ROOT, 'drivers/switch_1gang/driver.flow.compose.json');
    if (!fs.existsSync(flowPath)) {return;}
    const flow = JSON.parse(fs.readFileSync(flowPath, 'utf8'));
    const ids = (flow.triggers || []).map((t) => t.id);
    assert.ok(!ids.includes('switch_1gang_gang1_scene'));
    assert.ok(!ids.includes('switch_1gang_1gang_gang1_scene'));
  });
});
