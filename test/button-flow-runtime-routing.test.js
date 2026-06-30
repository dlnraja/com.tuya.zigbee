'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

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
    assert.match(source, /hold:\s*'long'/);
    assert.match(source, /triple:\s*'multi'/);
    assert.match(source, /release:\s*'release'/);
    assert.match(source, /const normalized = this\._normalizeButtonPressType\(pressType, count\)/);
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
    assert.match(source, /this\.device\.triggerButtonPress/);
    assert.match(source, /single:\s*'button_pressed'/);
    assert.match(source, /release:\s*'button_release'/);
  });

  it('keeps wall-switch button filters away from missing super trigger handlers', function() {
    for (const driverId of ['wall_switch_2gang_1way', 'wall_switch_3gang_1way', 'wall_switch_4gang_1way']) {
      const source = read(`drivers/${driverId}/device.js`);

      assert.doesNotMatch(source, /super\.triggerButtonPress/);
      assert.match(source, /_triggerPhysicalFlow\(button, type, \{ \.\.\.tokens, _internalTrigger: true \}\)/);
    }
  });
});
