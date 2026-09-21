'use strict';
/**
 * P2661 — Contre quoi: Time/OTA quiet clusters must not call trackIncomingReport
 * (Bastien diags be119f76 / 52ef684a looked like RX flood while 3ch was on Homey Virtual).
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const DEVICE = path.join(ROOT, 'lib', 'tuya', 'TuyaZigbeeDevice.js');

describe('P2661 quiet RX clusters skip flood counter', () => {
  it('TuyaZigbeeDevice skips trackIncomingReport for Time/OTA', () => {
    const src = fs.readFileSync(DEVICE, 'utf8');
    assert.match(src, /P2661/);
    assert.match(src, /quietRx/);
    assert.match(src, /cidForRx === 0x000a/);
    assert.match(src, /cidForRx === 0x0019/);
    assert.ok(
      src.includes('quietRx') && src.includes('trackIncomingReport()'),
      'quietRx must gate trackIncomingReport',
    );
    // Contre quoi: must not always track before quiet check
    const idxQuiet = src.indexOf('const quietRx');
    const idxTrack = src.indexOf('self.trackIncomingReport()', idxQuiet);
    assert.ok(idxQuiet > 0 && idxTrack > idxQuiet, 'quietRx declared before trackIncomingReport call');
  });
});
