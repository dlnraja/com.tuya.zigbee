'use strict';

/**
 * P211 — LayerSignalFusion: dual-layer echo / phantom / spam guards
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fusion = require('../../lib/layers/LayerSignalFusion');
const { ReceptionManager } = require('../../lib/multichannel/ReceptionManager');

function mockDevice() {
  return { _destroyed: false, log() {} };
}

describe('LayerSignalFusion P211', () => {
  it('suppresses ZCL then DP echo for same temperature', () => {
    const d = mockDevice();
    fusion.reset(d);
    const a = fusion.decide(d, 'measure_temperature', 22.1, 'zcl');
    const b = fusion.decide(d, 'measure_temperature', 22.05, 'tuya-dp');
    assert.equal(a.commit, true);
    assert.equal(b.commit, false);
    assert.equal(b.reason, 'cross-layer-echo');
    assert.equal(b.agree, true);
  });

  it('suppresses IAS then DP alarm_motion spam', () => {
    const d = mockDevice();
    fusion.reset(d);
    assert.equal(fusion.decide(d, 'alarm_motion', true, 'ias').commit, true);
    const echo = fusion.decide(d, 'alarm_motion', true, 'dp');
    assert.equal(echo.commit, false);
    assert.equal(echo.echo, true);
  });

  it('blocks phantom estimated over fresh zcl battery', () => {
    const d = mockDevice();
    fusion.reset(d);
    assert.equal(fusion.decide(d, 'measure_battery', 84, 'zcl').commit, true);
    const ph = fusion.decide(d, 'measure_battery', 80, 'estimated');
    assert.equal(ph.commit, false);
    assert.equal(ph.phantom, true);
  });

  it('priority-hold: voltage cannot thrash fresh zcl battery', () => {
    const d = mockDevice();
    fusion.reset(d);
    assert.equal(fusion.decide(d, 'measure_battery', 90, 'zcl').commit, true);
    const hold = fusion.decide(d, 'measure_battery', 70, 'voltage');
    assert.equal(hold.commit, false);
    assert.equal(hold.reason, 'priority-hold');
  });

  it('normalizes zigbee/acl aliases', () => {
    assert.equal(fusion.normalizeSource('zigbee'), 'zcl');
    assert.equal(fusion.normalizeSource('acl'), 'ias');
    assert.equal(fusion.normalizeSource('dp'), 'tuya-dp');
  });

  it('ReceptionManager marks cross-channel soft dedup', () => {
    const d = mockDevice();
    const rx = new ReceptionManager(d);
    const a = rx.receive('measure_humidity', 45.0, 'zcl');
    const b = rx.receive('measure_humidity', 45.5, 'tuya-dp');
    assert.equal(a.deduped, false);
    assert.equal(b.deduped, true);
    assert.equal(b.crossChannel, true);
  });

  it('allows real alarm state change after echo window logic', () => {
    const d = mockDevice();
    fusion.reset(d);
    assert.equal(fusion.decide(d, 'alarm_contact', false, 'ias').commit, true);
    // different value from peer layer → commit (binary change)
    const next = fusion.decide(d, 'alarm_contact', true, 'tuya-dp');
    assert.equal(next.commit, true);
  });

  it('suppresses ZCL then DP button echo and estimated power phantoms', () => {
    const d = mockDevice();
    fusion.reset(d);
    assert.equal(fusion.decide(d, 'button.1', true, 'zcl').commit, true);
    const echo = fusion.decide(d, 'button.1', true, 'tuya-dp');
    assert.equal(echo.commit, false);
    assert.equal(echo.echo, true);

    fusion.reset(d);
    assert.equal(fusion.decide(d, 'measure_power', 42, 'zcl').commit, true);
    const ph = fusion.decide(d, 'measure_power', 40, 'estimated');
    assert.equal(ph.commit, false);
    assert.equal(ph.phantom, true);
  });
});
