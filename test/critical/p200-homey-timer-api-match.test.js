'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const SAMPLE = [
  'drivers/wall_dimmer_1gang_1way/device.js',
  'drivers/switch_4gang/device.js',
  'drivers/switch_3gang/device.js',
  'drivers/dimmer_3gang/device.js',
  'drivers/button_wireless_switch/device.js',
];

describe('P200 Homey timer API match', () => {
  it('sample drivers clear appCommand/zcl timeouts via safeClearTimeout', () => {
    for (const rel of SAMPLE) {
      const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      assert(src.includes('safeClearTimeout'), `${rel} must use safeClearTimeout`);
      assert(
        !/\bclearTimeout\(this\._appCommandTimeout\)/.test(src),
        `${rel} must not raw-clear _appCommandTimeout`
      );
      assert(
        !/\bclearTimeout\(this\._zclState\.timeout\[/.test(src),
        `${rel} must not raw-clear _zclState.timeout`
      );
    }
  });

  it('no driver device.js raw-clears appCommandTimeout or zclState.timeout', () => {
    const drivers = path.join(ROOT, 'drivers');
    const bad = [];
    for (const id of fs.readdirSync(drivers)) {
      const fp = path.join(drivers, id, 'device.js');
      if (!fs.existsSync(fp)) continue;
      const src = fs.readFileSync(fp, 'utf8');
      if (/\bclearTimeout\(this\._appCommandTimeout\)/.test(src)) {
        bad.push(`${id}:_appCommandTimeout`);
      }
      if (/\bclearTimeout\(this\._zclState\.timeout\[/.test(src)) {
        bad.push(`${id}:_zclState.timeout`);
      }
    }
    assert.deepStrictEqual(bad, [], `raw clears remain: ${bad.join(', ')}`);
  });
});
