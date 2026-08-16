'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('P199 Homey timer clears', () => {
  it('sensor_presence_radar uses safe interval clears', () => {
    const src = read('drivers/sensor_presence_radar/device.js');
    assert(src.includes('safeSetInterval'), 'must create Homey intervals via safeSetInterval');
    assert(src.includes('safeClearInterval'), 'must clear via safeClearInterval');
    assert(!/\bclearInterval\(this\._pollingInterval\)/.test(src), 'no raw clearInterval on polling');
    assert(!/\bclearInterval\(this\._enrollmentCheckInterval\)/.test(src), 'no raw clearInterval on enrollment');
  });

  it('sensor_contact_motion uses safe timer clears', () => {
    const src = read('drivers/sensor_contact_motion/device.js');
    assert(src.includes('safeSetInterval'), 'must create Homey intervals via safeSetInterval');
    assert(src.includes('safeClearInterval'), 'must clear via safeClearInterval');
    assert(!/\bclearInterval\(this\._dpPollingInterval\)/.test(src), 'no raw clearInterval on dp poll');
    assert(!/\bclearTimeout\(this\._sleepTimer\)/.test(src), 'no raw clearTimeout on sleep timer');
  });

  it('PROJECT_INDEX documents shared App ID', () => {
    const src = read('PROJECT_INDEX.md');
    assert(src.includes('same App ID'), 'PROJECT_INDEX must state shared App ID');
    assert(!src.includes('| **Stable** | `com.dlnraja.tuya.zigbee.stable` |'), 'stale separate App ID row must be gone');
  });
});
