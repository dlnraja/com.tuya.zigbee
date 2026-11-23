'use strict';

/**
 * Gmail diag 56949320-88a3-40cf-8a5d-1213787e5dad (v9.0.1615, two FrankEver
 * FK_V02 valves on water_valve_smart). Device ids from the log are anonymized.
 * Replay only; do not post and do not store personal data.
 */
const { describe, it } = require('./_support/dual-runner');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const { tuyaDpBool } = require('../lib/tuya/tuyaDpBool');
const {
  tuyaPercentToValvePosition,
  powerOffStateFromDp,
  powerOffStateToDp,
} = require('../lib/tuya/valvePosition');
const I = require('../lib/zigbee/UnknownCommandInterpreter');
const PhysicalButtonMixin = require('../lib/mixins/PhysicalButtonMixin');

// Frames taken from the diagnostic (device UUIDs stripped).
const FRAME_OPEN = { status: 2, transid: 7, dp: 1, datatype: 1, length: 1, data: 'hex:01' };
const FRAME_CLOSED = { status: 1, transid: 1, dp: 1, datatype: 1, length: 1, data: 'hex:00' };
const VALVE_OPEN = { dp1: true, dp9: 0, dp27: 2, dp101: 100, dp102: 100 };
const VALVE_CLOSED = { dp1: false, dp9: 0, dp27: 2, dp101: 0, dp102: 0 };

function loadValveMaps() {
  // Build a lightweight owner that only exposes the FK_V02 branch.
  const src = fs.readFileSync(path.join(ROOT, 'drivers/water_valve_smart/device.js'), 'utf8');
  assert.match(src, /101:\s*\{[^}]*setting:\s*'target_valve_position'/);
  assert.match(src, /9:\s*\{[^}]*setting:\s*'countdown'/);
  assert.match(src, /27:\s*\{[^}]*setting:\s*'power_off_state'/);
  assert.match(src, /102:\s*\{[^}]*capability:\s*'valve_position'/);
  return src;
}

function makePhysicalDevice(seedOnOff) {
  const Cls = PhysicalButtonMixin(class {});
  const d = new Cls();
  d._physicalButtonState = {
    1: {
      lastState: seedOnOff,
      appCommandPending: false,
      pressStartTime: null,
      clickCount: 0,
      clickTimeout: null,
    },
  };
  d._caps = { onoff: seedOnOff };
  d.hasCapability = (c) => c === 'onoff';
  d.getCapabilityValue = (c) => d._caps[c];
  d.safeSetCapabilityValue = (c, v) => { d._caps[c] = v; };
  d.log = () => {};
  d._destroyed = false;
  d._timingProfile = { doubleClickWindow: 400, longPressThreshold: 1000 };
  d._isDebounced = () => false;
  d._flows = [];
  d._triggerPhysicalFlow = (_gang, action) => { d._flows.push(action); };
  return d;
}

describe('P3362 diag 56949320 FrankEver valve replay', () => {
  it('maps DP102 to valve_position 0-1, DP101 to target, DP27 to setting, DP9 to countdown', () => {
    loadValveMaps();
    const compose = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/water_valve_smart/driver.compose.json'), 'utf8'));
    const ids = compose.settings.map((s) => s.id).filter(Boolean);
    assert.ok(ids.includes('countdown'));
    assert.ok(ids.includes('target_valve_position'));
    assert.ok(ids.includes('power_off_state'));
    // Open valve from the log: actual 100%, target 100%, memory, no timer.
    assert.strictEqual(tuyaPercentToValvePosition(VALVE_OPEN.dp102), 1);
    assert.strictEqual(VALVE_OPEN.dp101, 100);
    assert.strictEqual(powerOffStateFromDp(VALVE_OPEN.dp27), 'memory');
    assert.strictEqual(VALVE_OPEN.dp9, 0);
    // Closed valve from the log.
    assert.strictEqual(tuyaPercentToValvePosition(VALVE_CLOSED.dp102), 0);
    assert.strictEqual(VALVE_CLOSED.dp101, 0);
    assert.strictEqual(powerOffStateFromDp(VALVE_CLOSED.dp27), 'memory');
    assert.strictEqual(powerOffStateToDp('memory'), 2);
    assert.strictEqual(powerOffStateToDp('close'), 0);
    assert.strictEqual(powerOffStateToDp('open'), 1);
  });

  it('replays DP1 hex:01 from a stale onoff=false without skipping as false unchanged', () => {
    // The log line was: DP1 = true, then [PHYSICAL-DP] Gang 1: false unchanged.
    assert.strictEqual(tuyaDpBool(FRAME_OPEN.data), true);
    assert.strictEqual(tuyaDpBool(FRAME_OPEN), true);
    assert.strictEqual(tuyaDpBool(FRAME_CLOSED.data), false);

    const d = makePhysicalDevice(false);
    const incoming = tuyaDpBool(FRAME_OPEN);
    d._handleTuyaDPReport(1, incoming);

    assert.strictEqual(incoming, true);
    assert.strictEqual(d._physicalButtonState[1].lastState, true, 'lastState must follow the incoming report');
    assert.strictEqual(d.getCapabilityValue('onoff'), true, 'onoff tile must follow DP1=true');
    assert.ok(d._flows.includes('on'));

    const logs = [];
    d.log = (m) => logs.push(m);
    d._handleTuyaDPReport(1, tuyaDpBool(FRAME_OPEN));
    assert.ok(logs.some((m) => /true unchanged/.test(m)), 'a repeat true is the only unchanged skip');
    assert.ok(!logs.some((m) => /false unchanged/.test(m)));
    assert.strictEqual(d.getCapabilityValue('onoff'), true);
  });

  it('treats EF00 cmd 0x11 payload 0300 as mcuVersionResponse, not a short-payload guess', () => {
    const r = I.interpretFrame({ clusterId: 0xEF00, cmdId: 0x11, endpoint: 1, data: Buffer.from('0300', 'hex') });
    assert.strictEqual(r.action, 'version');
    assert.strictEqual(r.exact, true);
    assert.ok(r.confidence >= 0.9);
    assert.match(r.source, /mcuVersionResponse/);
    assert.ok(!/heuristic/.test(r.source));
    const key = I.framePattern({ clusterId: 0xEF00, cmdId: 0x11, endpoint: 1, data: Buffer.from('0300', 'hex') });
    assert.match(key, /0xEF00/);
    assert.match(key, /0300$/);
  });

  it('applies setting mappings and does not set a null capability', () => {
    const { applyMappedDpSideEffects } = require('../lib/tuya/applyMappedDp');
    const applied = {};
    const logs = [];
    const stub = {
      setSettings: (obj) => { Object.assign(applied, obj); return Promise.resolve(); },
    };
    const maps = {
      9: { capability: null, internal: 'countdown_seconds', setting: 'countdown' },
      27: { capability: null, internal: 'power_off_state', setting: 'power_off_state', settingTransform: powerOffStateFromDp },
      101: { capability: null, internal: 'target_valve_position', setting: 'target_valve_position' },
      102: { capability: 'valve_position', transform: tuyaPercentToValvePosition },
      1: { capability: 'onoff' },
    };
    assert.strictEqual(applyMappedDpSideEffects(stub, maps[1], 1, true, (m) => logs.push(m)), true);
    assert.strictEqual(applyMappedDpSideEffects(stub, maps[9], 9, 0, (m) => logs.push(m)), false);
    assert.strictEqual(applyMappedDpSideEffects(stub, maps[27], 27, 2, (m) => logs.push(m)), false);
    assert.strictEqual(applyMappedDpSideEffects(stub, maps[101], 101, 100, (m) => logs.push(m)), false);
    assert.strictEqual(applyMappedDpSideEffects(stub, maps[102], 102, tuyaPercentToValvePosition(100), (m) => logs.push(m)), true);
    assert.strictEqual(applied.countdown, 0);
    assert.strictEqual(applied.power_off_state, 'memory');
    assert.strictEqual(applied.target_valve_position, 100);
    assert.ok(!logs.some((m) => /-> null =/.test(m)));
    assert.strictEqual(stub._dpInternal.countdown_seconds, 0);
    const plugSrc = fs.readFileSync(path.join(ROOT, 'lib/devices/UnifiedPlugBase.js'), 'utf8');
    assert.match(plugSrc, /applyMappedDpSideEffects/);
  });
});
