'use strict';

/**
 * P2381 — After P2376 flow-dedupe, driver.compose triggers must still fire.
 * Peter cfbf687f @ 9.0.779: 0xFD + button_matrix OK, Homey Flows on
 * button_wireless_1_button_1gang_* never ran because collectDeclaredFlowIds
 * only read app.json (driver cards stripped).
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '../..');
const {
  collectDeclaredFlowIds,
  triggerFlowCardHeuristic,
} = require(path.join(ROOT, 'lib/flow/FlowCardHeuristics.js'));

describe('P2381 driver flow cards after app.json dedupe', () => {
  it('collectDeclaredFlowIds merges device.driver.manifest.flow', () => {
    const homey = {
      manifest: {
        flow: {
          triggers: [{ id: 'button_matrix' }],
        },
      },
    };
    const device = {
      driver: {
        id: 'button_wireless_1',
        manifest: {
          flow: {
            triggers: [
              { id: 'button_wireless_1_button_1gang_button_pressed' },
              { id: 'button_wireless_1_button_1gang_button_double_press' },
            ],
          },
        },
      },
    };
    const declared = collectDeclaredFlowIds(homey, device);
    assert.ok(declared.has('button_matrix'));
    assert.ok(declared.has('button_wireless_1_button_1gang_button_pressed'));
    assert.ok(declared.has('button_wireless_1_button_1gang_button_double_press'));
  });

  it('triggerFlowCardHeuristic fires driver-scoped card when only in driver manifest', async () => {
    const triggered = [];
    const device = {
      driver: {
        id: 'button_wireless_1',
        manifest: {
          flow: {
            triggers: [{ id: 'button_wireless_1_button_1gang_button_pressed' }],
          },
        },
      },
      homey: {
        manifest: { flow: { triggers: [{ id: 'button_matrix' }] } },
        flow: {
          getDeviceTriggerCard(id) {
            return {
              async trigger(_dev, tokens) {
                triggered.push({ id, tokens });
                return true;
              },
            };
          },
          getTriggerCard() { return null; },
        },
      },
    };
    const ok = await triggerFlowCardHeuristic(
      device,
      ['button_wireless_1_button_1gang_button_pressed'],
      { button: '1' },
      'trigger',
    );
    assert.equal(ok, true);
    assert.equal(triggered.length, 1);
    assert.equal(triggered[0].id, 'button_wireless_1_button_1gang_button_pressed');
  });

  it('ButtonDevice _tryCard source includes P2381 driverScoped gate', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/devices/ButtonDevice.js'), 'utf8');
    assert.match(src, /P2381/);
    assert.match(src, /driverScoped/);
    assert.match(src, /collectDeclaredFlowIds\(this\.homey, this\)/);
  });
});
