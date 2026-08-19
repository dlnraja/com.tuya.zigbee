'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

describe('P2198 flow runtime coherence', () => {
  it('maps switch_2gang gang2 actions and condition to gang2 capability/path', () => {
    const source = read('drivers/switch/driver.js');
    assert.match(source, /switch_2gang_gang2_is_on_switch/);
    assert.match(source, /getCapabilityValue\('onoff\.gang2'\)/);
    assert.match(source, /switch_2gang_turn_on_gang2_switch/);
    assert.match(source, /setGangOnOff\(args\.device,\s*2,\s*true\)/);
    assert.match(source, /switch_2gang_turn_off_gang2_switch/);
    assert.match(source, /setGangOnOff\(args\.device,\s*2,\s*false\)/);
    assert.match(source, /switch_2gang_toggle_gang2_switch/);
    assert.match(source, /setGangOnOff\(args\.device,\s*2,\s*'toggle'\)/);
  });

  it('uses shutter position capability for position_above condition', () => {
    const source = read('drivers/shutter_roller_controller/driver.js');
    assert.match(source, /shutter_roller_controller_position_above/);
    assert.match(source, /getCapabilityValue\('windowcoverings_set'\)/);
    assert.doesNotMatch(source, /getCapabilityValue\('measure_co2'\)/);
  });

  it('wires shutter open close stop actions to effective capabilities', () => {
    const source = read('drivers/shutter_roller_controller/driver.js');
    assert.match(source, /shutter_roller_controller_open/);
    assert.match(source, /triggerCapabilityListener\?\.\('windowcoverings_set',\s*1\)/);
    assert.match(source, /shutter_roller_controller_close/);
    assert.match(source, /triggerCapabilityListener\?\.\('windowcoverings_set',\s*0\)/);
    assert.match(source, /shutter_roller_controller_stop/);
    assert.match(source, /triggerCapabilityListener\?\.\('windowcoverings_state',\s*'idle'\)/);
  });
});

