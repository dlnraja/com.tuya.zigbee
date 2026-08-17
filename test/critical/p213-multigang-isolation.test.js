'use strict';

/**
 * P213 — multi-gang endpoint isolation, reconnect burst, TX jitter/retry.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
function src(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

const {
  capabilityForOnOffEndpoint,
  endpointForCapability,
  normalizeOnOffCommand,
  isZclOnlyDevice,
} = require('../../lib/utils/endpointCapability');
const { coalesceIfBurst, afterBurst, resetBurst } = require('../../lib/layers/ReconnectBurstCoalescer');
const { paceZigbeeCommand } = require('../../lib/zigbee/ZigbeeCommandPacer');

describe('P213 endpoint isolation', () => {
  it('maps EP1 to root onoff and EP2+ to onoff.gangN', () => {
    assert.equal(capabilityForOnOffEndpoint(1, 2), 'onoff');
    assert.equal(capabilityForOnOffEndpoint(2, 2), 'onoff.gang2');
    assert.equal(capabilityForOnOffEndpoint(3, 3), 'onoff.gang3');
  });

  it('drops reports from endpoints past gangCount (no bleed onto root onoff)', () => {
    assert.equal(capabilityForOnOffEndpoint(2, 1), null);
    assert.equal(capabilityForOnOffEndpoint(0, 2), null);
    assert.equal(capabilityForOnOffEndpoint(99, 4), null);
  });

  it('parses dotted and gang capability names to the matching endpoint', () => {
    assert.equal(endpointForCapability('onoff'), 1);
    assert.equal(endpointForCapability('onoff.gang2'), 2);
    assert.equal(endpointForCapability('onoff.2'), 2);
    assert.equal(endpointForCapability('onoff', { endpoint: 3 }), 3);
  });

  it('does not classify commandOff as on', () => {
    assert.equal(normalizeOnOffCommand('commandOff'), 'off');
    assert.equal(normalizeOnOffCommand('setOff'), 'off');
    assert.equal(normalizeOnOffCommand('commandOn'), 'on');
    assert.equal(normalizeOnOffCommand('commandToggle'), 'toggle');
    assert.equal(normalizeOnOffCommand('commandOnWithTimedOff'), 'on');
  });

  it('treats zcl_only profiles as ZCL-only even if an EF00 manager exists', () => {
    assert.equal(isZclOnlyDevice({
      _isPureTuyaDP: false,
      _manufacturerConfig: { protocol: 'zcl_only' },
      tuyaEF00Manager: { sendDP() {} },
    }), true);
    assert.equal(isZclOnlyDevice({ _isPureTuyaDP: true }), false);
  });
});

describe('P213 reconnect burst coalescer', () => {
  it('applies immediately when traffic is not bursting', () => {
    const device = {};
    const applied = [];
    coalesceIfBurst(device, 'onoff', true, (v) => applied.push(v));
    assert.deepEqual(applied, [true]);
  });

  it('last-write-wins per capability during a reconnect stampede', async () => {
    const device = {};
    const applied = [];
    const apply = (cap) => (v) => applied.push([cap, v]);

    coalesceIfBurst(device, 'onoff', false, apply('onoff'));
    coalesceIfBurst(device, 'onoff.gang2', false, apply('onoff.gang2'));
    coalesceIfBurst(device, 'onoff', true, apply('onoff'));
    coalesceIfBurst(device, 'onoff.gang2', true, apply('onoff.gang2'));

    await new Promise((r) => setTimeout(r, 80));
    const onoff = applied.filter((x) => x[0] === 'onoff').map((x) => x[1]);
    const gang2 = applied.filter((x) => x[0] === 'onoff.gang2').map((x) => x[1]);
    assert.equal(onoff[onoff.length - 1], true);
    assert.equal(gang2[gang2.length - 1], true);
    resetBurst(device);
  });

  it('runs afterBurst once when a reconnect stampede settles', async () => {
    const device = {};
    const hits = [];
    coalesceIfBurst(device, 'onoff', true, () => {});
    coalesceIfBurst(device, 'onoff.gang2', true, () => {});
    coalesceIfBurst(device, 'onoff', false, () => {});
    afterBurst(device, 'reforce-settings', () => hits.push('a'));
    afterBurst(device, 'reforce-settings', () => hits.push('b'));
    await new Promise((r) => setTimeout(r, 90));
    assert.deepEqual(hits, ['b']);
    resetBurst(device);
  });
});

describe('P213 TX pacer', () => {
  it('serializes commands with jitter so gang 2 cannot overtake gang 1', async () => {
    const order = [];
    const device = { log() {} };
    const a = paceZigbeeCommand(device, async () => {
      order.push('start-1');
      await new Promise((r) => setTimeout(r, 20));
      order.push('end-1');
      return { ok: true, via: 'zcl-named' };
    }, { enabled: true, minJitter: 5, maxJitter: 5 });
    const b = paceZigbeeCommand(device, async () => {
      order.push('start-2');
      order.push('end-2');
      return { ok: true, via: 'zcl-named' };
    }, { enabled: true, minJitter: 5, maxJitter: 5 });
    await Promise.all([a, b]);
    assert.deepEqual(order, ['start-1', 'end-1', 'start-2', 'end-2']);
  });
});

describe('P213 switch pipeline wiring', () => {
  it('UnifiedSwitchBase isolates endpoints and paces multi-gang TX', () => {
    const s = src('lib/devices/UnifiedSwitchBase.js');
    assert.match(s, /capabilityForOnOffEndpoint/);
    assert.match(s, /coalesceIfBurst/);
    assert.match(s, /paceZigbeeCommand/);
    assert.match(s, /parallelDiscover: this\._isPureTuyaDP === true && gang === 1/);
    assert.match(s, /skipDp: this\.gangCount > 1 && this\._isPureTuyaDP !== true/);
    const { spawnSync } = require('child_process');
    const chk = spawnSync(process.execPath, ['--check', path.join(ROOT, 'lib/devices/UnifiedSwitchBase.js')], { encoding: 'utf8' });
    assert.equal(chk.status, 0, chk.stderr || chk.stdout);
    assert.match(s, /getClusterEndpoint/);
    assert.match(s, /safeSetCapabilityValue\(capability, value, meta\)/);
    assert.match(s, /_pushConfiguredSwitchSettings/);
    assert.match(s, /afterBurst/);
    assert.doesNotMatch(s, /parallelDiscover: true/);
  });

  it('command listener no longer uses includes(on) for OnOff', () => {
    const s = src('lib/zigbee/MultiEndpointCommandListener.js');
    assert.match(s, /normalizeOnOffCommand/);
    assert.doesNotMatch(s, /lower\.includes\('on'\)/);
  });

  it('PhysicalButtonMixin skips group 0 on multi-gang relays and binds leftover EF00 once', () => {
    const s = src('lib/mixins/PhysicalButtonMixin.js');
    assert.match(s, /isMultiGangRelay/);
    assert.match(s, /groupsCluster && !isMultiGangRelay/);
    assert.match(s, /_tuyaDpPhysicalDetectionBound/);
    assert.match(s, /profile\.protocol === 'tuya_dp' \|\| this\._isPureTuyaDP === true/);
    assert.match(s, /super\.onEndDeviceAnnounce/);
    assert.match(s, /Math\.max\(Number\(this\.gangCount\)/);
    assert.match(s, /onOffCluster\.bind/);
  });
});
