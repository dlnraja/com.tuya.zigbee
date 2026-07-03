'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { resolve: resolvePressType, resolveAction } = require('../lib/utils/TuyaPressTypeMap');

const ROOT = path.join(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

describe('button flow runtime routing guards', function() {
  it('normalizes physical button vocabulary before dispatching flows', function() {
    const source = read('lib/devices/ButtonDevice.js');

    assert.match(source, /_normalizeButtonPressType\s*\(/);
    assert.match(source, /on:\s*'single'/);
    assert.match(source, /off:\s*'single'/);
    assert.match(source, /toggle:\s*'single'/);
    assert.match(source, /command_off:\s*'double'/);
    assert.match(source, /command_toggle:\s*'long'/);
    assert.match(source, /commandoff:\s*'double'/);
    assert.match(source, /commandtoggle:\s*'long'/);
    assert.match(source, /hold:\s*'long'/);
    assert.match(source, /triple:\s*'multi'/);
    assert.match(source, /release:\s*'release'/);
    assert.match(source, /const normalized = this\._normalizeButtonPressType\(pressType, count\)/);
  });

  it('decodes external button action vocabularies without losing the 0-indexed Tuya map', function() {
    assert.strictEqual(resolvePressType(0), 'single');
    assert.strictEqual(resolvePressType(1), 'double');
    assert.strictEqual(resolvePressType(2), 'long');
    assert.strictEqual(resolvePressType('button_4_double'), 'double');
    assert.strictEqual(resolvePressType('commandToggle'), 'long');
    assert.strictEqual(resolvePressType('brightness_stop'), 'release');
    assert.deepStrictEqual(resolveAction('4_triple'), { button: 4, pressType: 'multi' });
  });

  it('routes virtual, multi, triple, and release cards through safe fallbacks', function() {
    const source = read('lib/devices/ButtonDevice.js');

    assert.match(source, /_tryCard\('virtual_button_pressed'/);
    assert.match(source, /_button_\$\{gangCount\}gang_button_multi_press/);
    assert.match(source, /_tryCard\('button_triple_clicked'/);
    assert.match(source, /_tryCard\('button_release'/);
  });

  it('keeps SmartGestureEngine on the Homey timer and ButtonDevice router', function() {
    const source = read('lib/zigbee/SmartGestureEngine.js');

    assert.doesNotMatch(source, /this\.homey\.setTimeout/);
    assert.match(source, /this\.device\.homey\.setTimeout/);
    assert.match(source, /this\.device\.homey\.clearTimeout/);
    assert.match(source, /this\.device\.triggerButtonPress/);
    assert.match(source, /this\._triggerFlow\(type, 1\)/);
    assert.match(source, /single:\s*'button_pressed'/);
    assert.match(source, /release:\s*'button_release'/);
  });

  it('keeps multi-endpoint button command capture broad across SDK event styles', function() {
    const source = read('lib/zigbee/MultiEndpointCommandListener.js');
    const base = read('lib/devices/BaseUnifiedDevice.js');

    assert.match(source, /CLUSTER_ALIASES/);
    assert.match(source, /genOnOff/);
    assert.match(source, /commandOn/);
    assert.match(source, /recallScene/);
    assert.match(source, /stepWithOnOff/);
    assert.match(source, /attr\.presentValue/);
    assert.match(source, /_emitCommand/);
    assert.match(source, /this\.cleanup\(\{ silent: true \}\)/);
    assert.match(source, /epId === 'getDeviceEndpoint'/);
    assert.match(source, /typeof cluster\?\.removeListener === 'function'/);
    assert(
      source.indexOf("if (lower.includes('on')) return 'on';") <
      source.indexOf("if (lower.includes('off')) return 'off';"),
      'onOff commands must classify commandOnWithTimedOff as on before checking off'
    );
    assert.match(base, /multistateInput/);
    assert.match(base, /resolvePressType\(sceneId, 'CMD-scene'\)/);
    assert.match(base, /resolvePressType\(value, 'CMD-multistate'\)/);
    assert.match(base, /try \{\s+const flowTrigger = this\.homey\?\.flow\?\.getDeviceTriggerCard/);
    assert.match(base, /rawLower\.includes\('on'\)[\s\S]*rawLower\.includes\('off'\)/);
  });

  it('keeps wall-switch button filters away from missing super trigger handlers', function() {
    const expectedGangCounts = {
      wall_switch_2gang_1way: 2,
      wall_switch_3gang_1way: 3,
      wall_switch_4gang_1way: 4,
    };

    for (const [driverId, gangCount] of Object.entries(expectedGangCounts)) {
      const source = read(`drivers/${driverId}/device.js`);

      assert.doesNotMatch(source, /super\.triggerButtonPress/);
      assert.match(source, new RegExp(`get gangCount\\(\\) \\{ return ${gangCount}; \\}`));
      assert.match(
        source,
        /get switchCapabilities\s*\(\)\s*\{\s*const\s*\{\s*subDeviceId\s*\}\s*=\s*\(typeof\s+this\.getData\s*===\s*['"]function['"]\s*&&\s*this\.getData\(\)\)\s*\|\|\s*\{\};?\s*return\s+subDeviceId\s*\?\s*\[\s*['"]onoff['"]\s*\]\s*:\s*super\.switchCapabilities;?\s*\}/
      );
      assert.match(source, /this\._isSubDevice = Boolean\(subDeviceId\)/);
      assert.match(source, /if \(this\._isSubDevice && this\._gangNumber !== undefined && button !== this\._gangNumber\)/);
      assert.match(source, /const targetGang = this\._isSubDevice \? this\._gangNumber : gang/);
      assert.match(source, /_triggerPhysicalFlow\(button, type, \{ \.\.\.tokens, _internalTrigger: true \}\)/);
    }
  });

  it('registers button.N virtual listeners for mixed switch/button devices', function() {
    const source = read('lib/mixins/VirtualButtonMixin.js');

    assert.match(source, /const hasDedicatedButtonCapabilityRouter = typeof this\._registerButtonCapabilityListeners === 'function'/);
    assert.doesNotMatch(source, /const hasButtonDevice = typeof this\.triggerButtonPress === 'function'/);
    assert.match(source, /this\.registerCapabilityListener\(cap, async \(\) =>/);
    assert.match(source, /await this\.triggerButtonPress\(i, 'single', 1, \{ source: 'virtual' \}\)/);
    assert.match(source, /await this\._triggerPhysicalFlow\?\.\(i, 'single', \{ source: 'virtual', _internalTrigger: true \}\)/);
  });

  it('routes mixed switch button UI and flow actions through real gang commands', async function() {
    const switchBase = read('lib/devices/UnifiedSwitchBase.js');
    const flowHelper = read('lib/drivers/FlowGangControl.js');
    const drivers = [
      'drivers/switch_2gang/driver.js',
      'drivers/switch_3gang/driver.js',
      'drivers/switch_4gang/driver.js',
      'drivers/wall_switch_2gang_1way/driver.js',
      'drivers/wall_switch_3gang_1way/driver.js',
      'drivers/wall_switch_4gang_1way/driver.js',
    ];

    assert.match(switchBase, /_registerButtonCapabilityListeners\(\)/);
    assert.match(switchBase, /this\.registerCapabilityListener\(capability, async \(\) =>/);
    assert.match(switchBase, /this\._triggerPhysicalFlow\(gang, 'single', \{ source: 'virtual', _internalTrigger: true \}\)/);
    assert.match(switchBase, /await this\._setGangOnOff\(gang, !currentValue\)/);
    assert.match(flowHelper, /device\._setGangOnOff\(gang, nextValue\)/);

    for (const driver of drivers) {
      const source = read(driver);
      assert.match(source, /FlowGangControl/);
      assert.doesNotMatch(source, /\['setCapabilityValue'\]\(cap/);
    }

    const { setGangOnOff, setAllGangsOnOff } = require('../lib/drivers/FlowGangControl');
    const commands = [];
    const values = { onoff: false, 'onoff.gang2': true };
    const fakeDevice = {
      hasCapability: cap => Object.prototype.hasOwnProperty.call(values, cap),
      getCapabilityValue: cap => values[cap],
      _setGangOnOff: async (gang, value) => {
        commands.push([gang, value]);
      },
      setCapabilityValue: async (cap, value) => {
        values[cap] = value;
      },
    };

    await setGangOnOff(fakeDevice, 2, 'toggle');
    assert.deepStrictEqual(commands, [[2, false]]);
    assert.strictEqual(values['onoff.gang2'], false);

    await setAllGangsOnOff(fakeDevice, 2, true);
    assert.deepStrictEqual(commands.slice(-2), [[1, true], [2, true]]);
    assert.strictEqual(values.onoff, true);
    assert.strictEqual(values['onoff.gang2'], true);
  });
});
