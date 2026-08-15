'use strict';

/**
 * Tests — BUTTON subsystem fixes (B1–B12, v10.3.0)
 * Source-contract tests pinning the fixed behavior of the dual
 * internal/system vs real physical button paths.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const ROOT = path.join(__dirname, '..');
const { resolve: resolvePressType } = require('../lib/utils/TuyaPressTypeMap');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

const mixinSrc = read('lib/mixins/PhysicalButtonMixin.js');
const buttonDeviceSrc = read('lib/devices/ButtonDevice.js');
const sosSrc = read('drivers/button_emergency_sos/device.js');
const sensorBaseSrc = read('lib/devices/UnifiedSensorBase.js');
const raw4Src = read('drivers/button_wireless_4/device.js');
const batteryRouterSrc = read('lib/helpers/BatteryRouter.js');
const baseUnifiedSrc = read('lib/devices/BaseUnifiedDevice.js');

describe('B1 — OnOff command press-type resolution', () => {
  it('maps commandOff→double, commandToggle→long, off/on→single via the shared resolver', () => {
    assert.strictEqual(resolvePressType('commandOff'), 'double');
    assert.strictEqual(resolvePressType('commandToggle'), 'long');
    assert.strictEqual(resolvePressType('off'), 'single');
    assert.strictEqual(resolvePressType('on'), 'single');
    assert.strictEqual(resolvePressType('toggle'), 'single');
  });

  it('onOffCmdMap routes through the resolver instead of forcing single', () => {
    assert.match(mixinSrc, /resolveOnOffPressType\(cmd, 'onOffCmdMap'\)/);
    const loopMatch = mixinSrc.match(/const onOffCmdMap[\s\S]*?for \(const cmd of onOffCmdMap\) \{[\s\S]*?\}/);
    assert(loopMatch, 'onOffCmdMap loop must exist');
    assert.doesNotMatch(loopMatch[0], /_triggerPhysicalFlow\(gang, 'single'\)/);
  });

  it('L1 raw only accepts OnOff cmd 0-2 without attribute-report payload', () => {
    assert.match(mixinSrc, /clusterId === 6 && cmd <= 2 && frameData\.length <= 3/);
  });
});

describe('B2/B3 — Scene recall listener', () => {
  const fnStart = buttonDeviceSrc.indexOf('async _registerSceneRecallListener');
  const fnEnd = buttonDeviceSrc.indexOf('async setButtonMode');
  const sceneFn = buttonDeviceSrc.slice(fnStart, fnEnd);

  it('does not fire the button_pressed card directly', () => {
    assert(fnStart > -1 && fnEnd > fnStart, 'scene listener must exist');
    assert.doesNotMatch(sceneFn, /getDeviceTriggerCard\('button_pressed'\)/);
  });

  it('uses endpoint id + PRESS_MAP for multi-endpoint devices', () => {
    assert.match(sceneFn, /PRESS_MAP\[sceneId\] \|\| 'single'/);
    assert.match(sceneFn, /buttonIdx = epId/);
  });

  it('restricts the 1-16/17-32/33-48 convention to single-endpoint devices', () => {
    assert.match(sceneFn, /isSingleEndpoint/);
    assert.match(sceneFn, /sceneId >= 17 && sceneId <= 32/);
  });

  it('does not silently drop sceneId 0', () => {
    assert.match(sceneFn, /sceneId === 0/);
  });

  it('is registered from onNodeInit with a double-registration guard', () => {
    assert.match(buttonDeviceSrc, /_sceneRecallListenerRegistered/);
    const onNodeInitStart = buttonDeviceSrc.indexOf('async onNodeInit({ zclNode })');
    const onNodeInitEnd = buttonDeviceSrc.indexOf('async _registerButtonCapabilityListeners');
    const onNodeInitBody = buttonDeviceSrc.slice(onNodeInitStart, onNodeInitEnd);
    assert.match(onNodeInitBody, /await this\._registerSceneRecallListener\(zclNode\)/);
  });

  it('_triggerPhysicalFlow awaits the ButtonDevice router', () => {
    assert.match(mixinSrc, /return this\.triggerButtonPress\(gang, normType, clicks, \{ source: 'physical' \}\)/);
  });
});

describe('B4 — onEndDeviceAnnounce super calls', () => {
  it('ButtonDevice calls the parent handler', () => {
    const start = buttonDeviceSrc.indexOf('async onEndDeviceAnnounce()');
    const body = buttonDeviceSrc.slice(start, start + 600);
    assert.match(body, /await super\.onEndDeviceAnnounce\?\.\(\)/);
  });

  it('SOS driver calls the parent handler', () => {
    const start = sosSrc.indexOf('async onEndDeviceAnnounce()');
    const body = sosSrc.slice(start, start + 600);
    assert.match(body, /await super\.onEndDeviceAnnounce\?\.\(\)/);
  });
});

describe('B5 — SOS announce heuristic is gated', () => {
  it('requires the sos_announce_heuristic setting', () => {
    assert.match(sosSrc, /getSetting\?\.\('sos_announce_heuristic'\) === true/);
    assert.match(sosSrc, /now - lastAlarm > 2000/);
    assert.match(sosSrc, /now - lastActivity > 30000/);
  });

  it('declares the setting (default OFF) in driver.compose.json', () => {
    const compose = JSON.parse(read('drivers/button_emergency_sos/driver.compose.json'));
    const groups = compose.settings || [];
    const ids = [];
    for (const entry of groups) {
      if (entry.id) {ids.push(entry.id);}
      for (const child of entry.children || []) {ids.push(child.id);}
    }
    assert(ids.includes('sos_announce_heuristic'), 'setting must be declared');
    const flat = JSON.stringify(groups);
    const setting = flat.match(/"id":\s*"sos_announce_heuristic"[\s\S]*?"value":\s*false/);
    assert(setting, 'setting must default to false');
  });
});

describe('B6/B7 — SOS capability/flow parity and single listener', () => {
  it('_handleAlarm pulses button.1 and fires the generic button_pressed card', () => {
    const start = sosSrc.indexOf('async _handleAlarm(payload)');
    const end = sosSrc.indexOf('async _setupBattery()');
    const body = sosSrc.slice(start, end);
    assert.match(body, /safeSetCapabilityValue\('button\.1', true\)/);
    assert.match(body, /getDeviceTriggerCard\('button_pressed'\)/);
    assert.match(body, /\{ button: '1', type: 'single' \}/);
  });

  it('blocks the mixin asymmetric button.1 listener via a no-op router override', () => {
    assert.match(sosSrc, /async _registerButtonCapabilityListeners\(\) \{ \/\* intentionally empty/);
  });
});

describe('B8 — DP button vs battery exclusion', () => {
  it('excludes battery DPs from the button branch when measure_battery exists', () => {
    assert.match(sensorBaseSrc, /dpIsBattery = batteryDPs\.includes\(dp\) && this\.hasCapability\('measure_battery'\)/);
    assert.match(sensorBaseSrc, /!dpIsBattery && buttonDPs\.includes\(dp\)/);
  });

  it('emits the declared type token (not action) on button_pressed', () => {
    const start = sensorBaseSrc.indexOf("getDeviceTriggerCard('button_pressed')");
    const body = sensorBaseSrc.slice(start, start + 300);
    assert.match(body, /type: value === 0 \? 'single' : value === 1 \? 'double' : 'hold'/);
    assert.doesNotMatch(body, /action:/);
  });

  it('button_pressed declares button + type tokens in app.json', () => {
    const app = JSON.parse(read('app.json'));
    const card = app.flow.triggers.find((t) => t.id === 'button_pressed');
    assert(card, 'button_pressed card must exist');
    const tokenNames = (card.tokens || []).map((t) => t.name);
    assert(tokenNames.includes('button') && tokenNames.includes('type'));
  });
});

describe('B9 — button_wireless_4 raw interceptor rejects reports', () => {
  it('only accepts the 0xFD command at the ZCL command id position', () => {
    // v10.6.0: superseded by the shared ZCL header parser — cmdId is read at
    // the correct offset for BOTH 3-byte and 5-byte (mfr-specific) headers,
    // and the payload is validated against the action range 0..2.
    assert.match(raw4Src, /parseZclHeader/);
    assert.match(raw4Src, /hdr\.cmdId === 0xFD/);
    assert.match(raw4Src, /\[0, 1, 2\]\.includes\(data\[hdr\.payloadOffset\]\)/);
    assert.doesNotMatch(raw4Src, /data\.length >= 4 && \[0, 1, 2\]\.includes\(data\[3\]\)/);
  });
});

describe('B10 — wall switch mixin wrap and gang filters', () => {
  const drivers = [
    'wall_switch_1gang_1way',
    'wall_switch_2gang_1way',
    'wall_switch_3gang_1way',
    'wall_switch_4gang_1way',
  ];

  it('no driver re-wraps PhysicalButtonMixin(VirtualButtonMixin(...))', () => {
    for (const driverId of drivers) {
      const src = read(`drivers/${driverId}/device.js`);
      assert.doesNotMatch(src, /PhysicalButtonMixin\(VirtualButtonMixin\(/, `${driverId} must not double-wrap`);
      assert.doesNotMatch(src, /require\('\.\.\/\.\.\/lib\/mixins\/PhysicalButtonMixin'\)/, `${driverId} must not import the mixin`);
    }
  });

  it('mixins are already in the UnifiedSwitchBase chain', () => {
    const switchBase = read('lib/devices/UnifiedSwitchBase.js');
    const tuyaBase = read('lib/tuya/TuyaZigbeeDevice.js');
    assert.match(switchBase, /class UnifiedSwitchBase extends TuyaZigbeeDevice/);
    assert.match(tuyaBase, /extends PhysicalButtonMixin\(VirtualButtonMixin\(/);
  });

  it('initPhysicalButtonDetection has a double-init guard', () => {
    assert.match(mixinSrc, /if \(this\._physicalButtonDetectionInitialized\) \{/);
    assert.match(mixinSrc, /this\._physicalButtonDetectionInitialized = false/);
  });
});

describe('B11 — battery 200-sentinel alignment and third writer', () => {
  it('ButtonDevice defaults 200→100 (sentinel only when profile opts out)', () => {
    assert.match(buttonDeviceSrc, /treat200AsSentinel: context\.profile\?\.zcl200IsPercent === false/);
  });

  it('ButtonDevice and SOS declare _ownsBatteryHandling', () => {
    assert.match(buttonDeviceSrc, /get _ownsBatteryHandling\(\) \{ return true; \}/);
    assert.match(sosSrc, /get _ownsBatteryHandling\(\) \{ return true; \}/);
  });

  it('BatteryRouter skips the 50% estimate and capability reporting for owning devices', () => {
    assert.match(batteryRouterSrc, /!deviceOwnsBattery && batteryInfo\.source !== BatterySource\.NONE/);
    assert.match(batteryRouterSrc, /device\._ownsBatteryHandling === true/);
  });
});

describe('B12 — dead fallbacks removed', () => {
  it('BaseUnifiedDevice falls back to the real generic button_pressed card', () => {
    assert.doesNotMatch(baseUnifiedSrc, /button_\$\{buttonIndex\}_pressed/);
    assert.match(baseUnifiedSrc, /getDeviceTriggerCard\('button_pressed'\)/);
    assert.match(baseUnifiedSrc, /\{ button: String\(buttonIndex\), type: pressType \}/);
  });

  it('_triggerHoldRelease tries the mid-form gang release card', () => {
    const start = buttonDeviceSrc.indexOf('async _triggerHoldRelease(button)');
    const body = buttonDeviceSrc.slice(start, start + 2500);
    assert.match(body, /\$\{driverId\}_button_\$\{gangCount\}gang_button_release/);
  });
});
