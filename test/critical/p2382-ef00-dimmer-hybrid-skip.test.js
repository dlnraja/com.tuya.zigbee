'use strict';

/**
 * P2382 — PresentSky #2206/#2221 EF00 wall dimmer: never HYBRID-optimize-disable
 * tuya_cluster after 15 min (trackDataReceived rarely wired; MCU-only RX via listeners).
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

describe('P2382 EF00 wall dimmer HYBRID skip', () => {
  it('HybridProtocolManager skips optimize-disable for wall_dimmer / EF00 dim', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../../lib/protocol/HybridProtocolManager.js'),
      'utf8',
    );
    assert.match(src, /isEf00Dimmer/);
    assert.match(src, /P2382/);
    assert.match(src, /wall_dimmer\|light_dimmer/);
    assert.match(src, /Skip protocol disable on sleepy\/IAS-only\/button\/cover\/EF00-dimmer device/);
  });

  it('wall_dimmer_tuya still locks m1cvyneb + TS0601 and brightness scale', () => {
    const compose = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../../drivers/wall_dimmer_tuya/driver.compose.json'), 'utf8'),
    );
    const mfrs = (compose.zigbee.manufacturerName || []).map((m) => String(m).toLowerCase());
    assert.ok(mfrs.includes('_tze284_m1cvyneb'), 'missing _TZE284_m1cvyneb');
    assert.ok((compose.zigbee.productId || []).includes('TS0601'));
    const deviceSrc = fs.readFileSync(
      path.join(__dirname, '../../drivers/wall_dimmer_tuya/device.js'),
      'utf8',
    );
    assert.match(deviceSrc, /toTuyaBrightness/);
    assert.match(deviceSrc, /healZigbeeNodeIdentity/);
  });
});
