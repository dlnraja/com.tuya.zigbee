'use strict';

/**
 * Gmail / Homey diag e181bc15 (v9.0.589): water_leak_sensor flooded
 * battery_health_changed with health_score undefined because the app
 * trigger was called as trigger(device, tokens) instead of trigger(tokens).
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const ROOT = path.join(__dirname, '..', '..');
const BatteryHealthFlowHandler = require('../../lib/flow/BatteryHealthFlowHandler');

describe('P2183 battery health flow tokens', () => {
  it('coerces undefined health_score to 0', () => {
    assert.strictEqual(BatteryHealthFlowHandler._finiteNum(undefined), 0);
    assert.strictEqual(BatteryHealthFlowHandler._finiteNum(null), 0);
    assert.strictEqual(BatteryHealthFlowHandler._finiteNum(NaN), 0);
    assert.strictEqual(BatteryHealthFlowHandler._finiteNum(87), 87);
  });

  it('app trigger helpers pass a tokens object, not the device', async () => {
    const calls = [];
    const device = {
      _destroyed: false,
      log() {},
      error() {},
      homey: {
        flow: {
          getTriggerCard(id) {
            return {
              async trigger(tokens, state) {
                calls.push({ id, tokens, state });
              }
            };
          }
        }
      }
    };
    await BatteryHealthFlowHandler.triggerHealthChanged(device, {
      healthScore: undefined,
      healthStatus: 'Poor',
      batteryType: 'CR2032',
      estimatedRemainingDays: undefined,
      healthStatusCode: 'POOR'
    }, 'GOOD');
    assert.strictEqual(calls.length, 1);
    assert.strictEqual(typeof calls[0].tokens.health_score, 'number');
    assert.strictEqual(calls[0].tokens.health_score, 0);
    assert.ok(!calls[0].tokens.setCapabilityValue);
  });

  it('battery health flow cards name a device unless a driver_id filter already selects it', () => {
    for (const name of [
      'battery_health_changed',
      'battery_needs_replacement',
      'health_battery_replacement_predicted',
      'health_failure_predicted'
    ]) {
      const json = JSON.parse(fs.readFileSync(
        path.join(ROOT, '.homeycompose/flow/triggers', `${name}.json`),
        'utf8'
      ));
      const dev = (json.args || []).find((a) => a && a.type === 'device');
      const pinned = dev && /(?:^|&)driver_id=/.test(String(dev.filter || ''));
      const formatted = json.titleFormatted || {};
      if (!dev || pinned) {
        assert.ok(!JSON.stringify(formatted).includes('[[device]]'), name);
        continue;
      }
      for (const [lang, text] of Object.entries(formatted)) {
        assert.equal(String(text).split('[[device]]').length - 1, 1, `${name} ${lang}`);
      }
      const extra = (json.args || []).filter((a) => a && a.name && a.type !== 'device').map((a) => a.name);
      for (const argName of extra) {
        assert.ok(String(formatted.en || '').includes(`[[${argName}]]`), `${name} [[${argName}]]`);
      }
    }
  });
});
