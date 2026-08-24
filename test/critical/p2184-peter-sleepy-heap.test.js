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

describe('P2184 Peter sleepy heap / water wake', () => {
  it('defers DataRecoveryManager when heap is critical', () => {
    const source = read('lib/devices/BaseUnifiedDevice.js');
    assert.match(source, /P2184/);
    assert.match(source, /heap critical/);
    assert.match(source, /_deferDataRecoveryInit = true/);
  });

  it('retries deferred DataRecovery on button wake when heap allows', () => {
    const source = read('lib/devices/ButtonDevice.js');
    assert.match(source, /_deferDataRecoveryInit/);
    assert.match(source, /_initDataRecoveryManager/);
    assert.match(source, /markRadioActivity/);
  });

  it('water leak wake uses safe timers and BootBudget TX gate', () => {
    const source = read('drivers/water_leak_sensor/device.js');
    assert.match(source, /safeSetTimeout/);
    assert.match(source, /shouldTxSleepy/);
    assert.match(source, /markRadioActivity/);
    assert.doesNotMatch(source, /homey\.setTimeout\(async \(\) => \{\s*\n\s*this\._secondaryAlarmReadTimer/);
  });
});
