'use strict';

/**
 * P2524 — presence_sensor_radar must fire declared presence flow triggers.
 * Contre quoi (diag 74e5cae7 @ 9.0.945): UI shows presence, motion flows work,
 * but presence_* cards never trigger (compose-only / un-wired).
 * Dual-app: BOTH
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2524 radar presence flow wire', () => {
  it('compose declares presence_detected / cleared / motion_detected', () => {
    const flow = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/presence_sensor_radar/driver.flow.compose.json'),
      'utf8',
    ));
    const ids = (flow.triggers || []).map((t) => t.id);
    assert.ok(ids.includes('presence_sensor_radar_presence_detected'));
    assert.ok(ids.includes('presence_sensor_radar_presence_cleared'));
    assert.ok(ids.includes('presence_sensor_radar_motion_detected'));
  });

  it('device.js wires _triggerPresenceFlows + _commitPresenceAndFlows (P2524)', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'drivers/presence_sensor_radar/device.js'),
      'utf8',
    );
    assert.ok(src.includes('_triggerPresenceFlows'), 'missing _triggerPresenceFlows');
    assert.ok(src.includes('_commitPresenceAndFlows'), 'missing _commitPresenceAndFlows');
    assert.ok(
      src.includes("presence_sensor_radar_presence_detected"),
      'must fire presence_detected card id',
    );
    assert.ok(
      src.includes("presence_sensor_radar_presence_cleared"),
      'must fire presence_cleared card id',
    );
    assert.ok(
      /getDeviceTriggerCard\([^,)]+\)/.test(src)
        && !/getDeviceTriggerCard\([^)]+,\s*['\"]trigger['\"]/.test(src),
      'SDK3: getDeviceTriggerCard(id) only — no second trigger arg',
    );
  });

  it('is_present condition checks alarm_human OR alarm_motion', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'drivers/presence_sensor_radar/driver.js'),
      'utf8',
    );
    assert.ok(src.includes('alarm_human'));
    assert.ok(src.includes('alarm_motion'));
  });

  it('wifi_ir_remote omits titleFormatted (P2487 Contre quoi / Auto-Fix red)', () => {
    const j = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/wifi_ir_remote/driver.flow.compose.json'),
      'utf8',
    ));
    for (const card of [...(j.actions || []), ...(j.triggers || [])]) {
      assert.equal(
        card.titleFormatted,
        undefined,
        `${card.id} must not set titleFormatted`,
      );
    }
  });
});
