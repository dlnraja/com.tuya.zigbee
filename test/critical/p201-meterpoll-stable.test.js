'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
describe('P201 meterPoll + wifi_camera (stable)', () => {
  it('energy plugs clear _meterPoll and pass 120s interval', () => {
    for (const rel of ['drivers/device_air_purifier_plug/device.js', 'drivers/dimmer_wall_plug/device.js']) {
      const src = read(rel);
      assert(src.includes('safeSetInterval'));
      assert(src.includes('120000'));
      assert(src.includes('safeClearInterval(this, this._meterPoll)'));
      assert(src.includes('async onUninit'));
    }
  });
  it('wifi_camera implements onUninit cleanup', () => {
    const src = read('drivers/wifi_camera/device.js');
    assert(src.includes('async onUninit'));
    assert(/async onUninit\(\)[\s\S]*_stopTimers/.test(src));
  });
  it('gmail-diagnostics wrapper exists', () => {
    assert(fs.existsSync(path.join(ROOT, 'tools', 'ci', 'gmail-diagnostics.js')));
  });
});
