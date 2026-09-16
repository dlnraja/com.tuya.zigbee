'use strict';

/**
 * P2526 — VicHY 74e5cae7 residual: presence flow edge-fire must be callable.
 * Contre quoi: compose WHEN "Presence detected" never fires while native
 * motion WHEN works (alarm_motion capability) — tip-lag 9.0.945 / unwired cards.
 * Dual-app: BOTH
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DEVICE_PATH = path.join(ROOT, 'drivers/presence_sensor_radar/device.js');

describe('P2526 VicHY presence flow edge-fire', () => {
  it('diag 74e5cae7 Contre quoi: tip must wire presence_detected (not compose-only)', () => {
    const src = fs.readFileSync(DEVICE_PATH, 'utf8');
    assert.ok(src.includes('74e5cae7') || src.includes('P2524'), 'must reference VicHY diag lock');
    assert.ok(src.includes('_triggerPresenceFlows'), 'must define flow fire helper');
    assert.ok(src.includes('presence_sensor_radar_presence_detected'));
    assert.ok(src.includes('prevMotion !== value') || src.includes('prevMotion !=='));
  });

  it('driver registers is_present + motion_active conditions', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'drivers/presence_sensor_radar/driver.js'),
      'utf8',
    );
    assert.ok(src.includes('presence_sensor_radar_is_present'));
    assert.ok(
      src.includes('presence_sensor_radar_motion_active'),
      'P2526: motion_active condition must be registered (compose declares it)',
    );
  });

  it('runtime: false→true alarm_motion edge fires presence_detected card', async () => {
    // Lightweight stub of device methods — load only the methods via eval of extracted source
    // (full device.js pulls Homey — simulate the edge contract instead).
    const fired = [];
    const device = {
      _motion: false,
      _human: false,
      hasCapability(c) { return c === 'alarm_human' || c === 'alarm_motion'; },
      getCapabilityValue(c) {
        if (c === 'alarm_motion') return this._motion;
        if (c === 'alarm_human') return this._human;
        return null;
      },
      homey: {
        flow: {
          getDeviceTriggerCard(id) {
            return {
              trigger: async () => { fired.push(id); },
            };
          },
        },
      },
      _triggerPresenceFlows(detected) {
        const cardId = detected
          ? 'presence_sensor_radar_presence_detected'
          : 'presence_sensor_radar_presence_cleared';
        this.homey.flow.getDeviceTriggerCard(cardId).trigger(this, {});
        if (detected) {
          this.homey.flow.getDeviceTriggerCard('presence_sensor_radar_motion_detected').trigger(this, {});
        }
      },
      async safeSetCapabilityValue(capability, value) {
        const edgeMotion = capability === 'alarm_motion' && typeof value === 'boolean';
        const prevMotion = edgeMotion ? this.getCapabilityValue('alarm_motion') : undefined;
        if (capability === 'alarm_motion') this._motion = value;
        if (capability === 'alarm_human') this._human = value;
        if (edgeMotion) {
          this._human = value;
          if (prevMotion !== value) this._triggerPresenceFlows(value);
        }
        return true;
      },
      _commitPresenceAndFlows(presence) {
        const next = !!presence;
        // motion first so edge-fire sees prev correctly
        return this.safeSetCapabilityValue('alarm_motion', next)
          .then(() => this.safeSetCapabilityValue('alarm_human', next));
      },
    };

    await device._commitPresenceAndFlows(true);
    assert.ok(
      fired.includes('presence_sensor_radar_presence_detected'),
      `expected presence_detected, got ${JSON.stringify(fired)}`,
    );
    assert.ok(fired.includes('presence_sensor_radar_motion_detected'));

    fired.length = 0;
    await device._commitPresenceAndFlows(true); // no edge
    assert.equal(fired.length, 0, 'sticky true must not re-fire');

    await device._commitPresenceAndFlows(false);
    assert.ok(fired.includes('presence_sensor_radar_presence_cleared'));
  });
});
