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
    for (const driverId of ['wall_switch_2gang_1way', 'wall_switch_3gang_1way', 'wall_switch_4gang_1way']) {
      const source = read(`drivers/${driverId}/device.js`);

      assert.doesNotMatch(source, /super\.triggerButtonPress/);
      assert.match(source, /_triggerPhysicalFlow\(button, type, \{ \.\.\.tokens, _internalTrigger: true \}\)/);
    }
  });
});
