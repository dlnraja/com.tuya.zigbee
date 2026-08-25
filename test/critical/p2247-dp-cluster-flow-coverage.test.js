'use strict';

/**
 * P2247 — DP / cluster / flow coverage & declared-only flow resolve
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const {
  resolveFlowCardId,
  buildPhysicalFlowCandidates,
  collectDeclaredFlowIds,
} = require('../../lib/flow/FlowCardHeuristics');
const { CLUSTERS, lookupCluster } = require('../../lib/zigbee/ZclClusterLexicon');
const { isNoopFlowCard, safeGetFlowCard } = require('../../lib/io/HomeyCompensationLayer');

describe('P2247 coverage + declared-only flow cards', () => {
  it('resolveFlowCardId returns null for undeclared speculative IDs', () => {
    const declared = new Set(['button_wireless_4_button_4gang_button_1_pressed']);
    const bad = resolveFlowCardId(
      ['button_wireless_4_button_1_button_pressed', 'button_wireless_4_button_1gang_button_pressed'],
      declared,
    );
    assert.equal(bad, null);
  });

  it('remote candidates resolve to 4gang compose card', () => {
    const declared = new Set(['button_wireless_4_button_4gang_button_1_pressed']);
    const cands = buildPhysicalFlowCandidates('button_wireless_4', 1, 'single', {
      gangCount: 4,
      isButtonDevice: true,
    });
    assert.equal(resolveFlowCardId(cands, declared), 'button_wireless_4_button_4gang_button_1_pressed');
  });

  it('safeGetFlowCard skips Homey lookup for undeclared IDs', () => {
    let probed = 0;
    const homey = {
      flow: {
        getDeviceTriggerCard(id) {
          probed++;
          throw new Error(`Invalid Flow Card ID: ${id}`);
        },
        getTriggerCard() {
          probed++;
          throw new Error('fail');
        },
      },
    };
    const declared = new Set(['real_card']);
    const card = safeGetFlowCard(homey, 'fake_card', 'trigger', declared);
    assert.equal(isNoopFlowCard(card), true);
    assert.equal(probed, 0);
  });

  it('lexicon covers all compose numeric clusters', () => {
    const driversDir = path.join('drivers');
    const missing = [];
    const lexiconIds = new Set(Object.values(CLUSTERS).map((c) => c.id));
    for (const id of fs.readdirSync(driversDir)) {
      const fp = path.join(driversDir, id, 'driver.compose.json');
      if (!fs.existsSync(fp)) continue;
      const c = JSON.parse(fs.readFileSync(fp, 'utf8'));
      for (const ep of Object.values(c.zigbee?.endpoints || {})) {
        for (const cl of [...(ep.clusters || []), ...(ep.bindings || [])]) {
          if (typeof cl === 'number' && !lexiconIds.has(cl)) {
            missing.push(`${id}:${cl}`);
          }
        }
      }
    }
    assert.deepEqual(missing, [], `missing lexicon: ${missing.slice(0, 20).join(', ')}`);
    assert.ok(lookupCluster(0xED00)?.key === 'TUYA_ED00');
    assert.ok(lookupCluster(0x0406)?.key === 'OCCUPANCY');
  });

  it('climate_sensor_zt08 has flow compose', () => {
    const fp = path.join('drivers', 'climate_sensor_zt08', 'driver.flow.compose.json');
    assert.ok(fs.existsSync(fp));
    const flow = JSON.parse(fs.readFileSync(fp, 'utf8'));
    const ids = (flow.triggers || []).map((t) => t.id);
    assert.ok(ids.includes('climate_sensor_zt08_temperature_changed'));
  });

  it('Tongou din_rail mappings include DP13/15 internals', () => {
    const src = fs.readFileSync(path.join('drivers', 'din_rail_meter', 'device.js'), 'utf8');
    assert.match(src, /13:\s*\{\s*capability:\s*null/);
    assert.match(src, /15:\s*\{\s*capability:\s*null/);
  });

  it('collectDeclaredFlowIds reads manifest triggers', () => {
    const homey = {
      manifest: {
        flow: {
          triggers: [{ id: 'a_trig' }, 'b_trig'],
          actions: [{ id: 'an_act' }],
        },
      },
    };
    const ids = collectDeclaredFlowIds(homey);
    assert.ok(ids.has('a_trig'));
    assert.ok(ids.has('b_trig'));
    assert.ok(ids.has('an_act'));
  });
});
