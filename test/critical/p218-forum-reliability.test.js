'use strict';

/**
 * Silent forum soak: SOS ACE dispatch, SOS flow tokens, TX retry vs jitter,
 * 2-gang sub-device routing, IAS wake skip EF00.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
function src(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}
function compose(driver) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', driver, 'driver.compose.json'), 'utf8'));
}

describe('P218 SOS ACE + flow cards', () => {
  it('IasAceBoundCluster dispatches emergency to super.handleFrame (does not swallow cmd 2)', () => {
    const s = src('lib/clusters/IasAceCluster.js');
    assert.match(s, /commandEmergency/);
    assert.match(s, /super\.handleFrame/);
    assert.doesNotMatch(s, /\[0,1,2,3,4,5,6,7,8,9\]\.includes\(c\)\) \{return;\}/);
  });

  it('SOS trigger cards are fired with empty tokens (card has no token schema)', () => {
    const s = src('drivers/button_emergency_sos/driver.js');
    assert.match(s, /button_emergency_sos_pressed',\s*device,\s*\{\}/);
    assert.match(s, /button_emergency_sos_physical_on/);
    assert.doesNotMatch(s, /_triggerCard\('button_emergency_sos_pressed', device, tokens/);
  });

  it('SOS keeps button.1 so a physical press can pulse the tile', () => {
    const c = compose('button_emergency_sos');
    assert.ok(c.capabilities.includes('button.1'));
    assert.equal(c.capabilitiesOptions['button.1'].setable, false);
    const dev = src('drivers/button_emergency_sos/device.js');
    assert.match(dev, /'button\.1'/);
  });
});

describe('P218 TX retry vs reporting jitter', () => {
  it('command retry uses a fixed 350ms delay, not exponential jitter', () => {
    const s = src('lib/zigbee/ZigbeeCommandPacer.js');
    assert.match(s, /retryDelayMs \?\? 350/);
    assert.match(s, /backoffMultiplier: 1/);
    assert.doesNotMatch(s, /initialDelay: 80/);
  });

  it('reporting jitter stays on configureReporting maxInterval only', () => {
    const s = src('lib/devices/UnifiedSwitchBase.js');
    assert.match(s, /applyReportingJitter/);
    assert.match(s, /retry no-ack at 350 ms/);
  });
});

describe('P218 2-gang sub-device routing', () => {
  it('NovaDigital/Zemismart TS0002 couples pair on wall_switch_2gang_1way not switch_2gang', () => {
    const wall = compose('wall_switch_2gang_1way');
    const sw2 = compose('switch_2gang');
    const mfrs = ['_TZ3000_ywubfuvt', '_TZ3000_kgxej1dv', '_TZ3000_jjdkhueq'];
    const wallSet = new Set(wall.zigbee.manufacturerName.map((m) => String(m).toLowerCase()));
    const sw2Set = new Set(sw2.zigbee.manufacturerName.map((m) => String(m).toLowerCase()));
    for (const m of mfrs) {
      assert.ok(wallSet.has(m.toLowerCase()), `wall missing ${m}`);
      assert.equal(sw2Set.has(m.toLowerCase()), false, `switch_2gang still has ${m}`);
    }
    assert.ok(wall.devices && wall.devices.secondSwitch);
    assert.deepEqual(wall.devices.secondSwitch.capabilities, ['onoff']);
    assert.ok(wall.zigbee.productId.includes('TS0002'));
  });
});

describe('P218 sleepy IAS water', () => {
  it('sensor wake skips Tuya dataQuery when the node has no EF00 cluster', () => {
    const s = src('lib/devices/UnifiedSensorBase.js');
    assert.match(s, /no EF00 — skip dataQuery/);
  });

  it('water leak re-attaches IAS on end-device announce', () => {
    const s = src('drivers/water_leak_sensor/device.js');
    assert.match(s, /async onEndDeviceAnnounce/);
    assert.match(s, /enrollIASZone/);
  });
});

describe('P218 smartbutton wake bind map', () => {
  it('ButtonDevice looks up onOff/scenes by name instead of a broken index', () => {
    const s = src('lib/devices/ButtonDevice.js');
    assert.match(s, /CLUSTER_NAMES/);
    assert.match(s, /genOnOff/);
    assert.doesNotMatch(s, /\[5,'genScenes',6,'genOnOff'/);
  });
});
