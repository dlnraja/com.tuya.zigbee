'use strict';

/**
 * Tests — P92.72 anti-flood protections (z2m flood lessons: BHT-006,
 * TS0601 200-msg/min, MCU ping-pong, ZS06 IR blaster, ESPHome time-query leak)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

describe('P92.72 — anti-flood protections', () => {

  it('RX flood: sheds non-safety frames when rxPerMinute exceeded, never IAS', () => {
    const src = read('lib/tuya/TuyaZigbeeDevice.js');
    assert.ok(src.includes('[RX-SHED]'), 'shedding present');
    assert.ok(src.includes('clusterId !== 0x0500') && src.includes('clusterId !== 0x0501'),
      'IAS 0x0500/0x0501 exempt from shedding (SOS/tamper never dropped)');
    assert.ok(src.includes('rxResult.exceeded'), 'RX exceedance gates shed');
  });

  it('MCU ping-pong impossible: no auto-response to mcuVersion commands', () => {
    const bc = read('lib/clusters/TuyaBoundCluster.js');
    // handlers must only log/forward — never send mcuVersionRequest back
    const rspHandler = bc.slice(bc.indexOf('mcuVersionResponse(p)'), bc.indexOf('mcuVersionResponse(p)') + 300);
    assert.ok(!rspHandler.includes('mcuVersionRequest('), 'no response-to-response');
    const reqHandler = bc.slice(bc.indexOf('mcuVersionRequest(p)'), bc.indexOf('mcuVersionRequest(p)') + 200);
    assert.ok(reqHandler.includes('_rawDP'), 'request handler is passive');
  });

  it('time sync (0x24) is stateless — no listener registration per query', () => {
    const handler = read('lib/clusters/TuyaBoundCluster.js');
    const sync = handler.slice(handler.indexOf('mcuSyncTime(payload)'), handler.indexOf('mcuSyncTime(payload)') + 1500);
    assert.ok(!sync.includes('.on(') && !sync.includes('addListener'), 'no listener added per time query (ESPHome leak pattern)');
  });

  it('IR blaster: sends throttled to 1/500ms and serialized', () => {
    const src = read('drivers/blaster_remote/device.js');
    assert.ok(src.includes('_lastIRSend'), 'throttle timestamp');
    assert.ok(src.includes('< 500'), '500ms window (z2m ZS06 lesson)');
    assert.ok(src.includes('already in progress'), 'concurrent sends rejected');
  });

  it('RX tracking is wired and reports exceedances', () => {
    const src = read('lib/tuya/TuyaZigbeeDevice.js');
    assert.ok(src.includes('trackIncomingReport()'), 'RX tracking called');
    const throttle = read('lib/utils/UniversalThrottleManager.js');
    assert.ok(throttle.includes('rxPerMinute'), 'RX limits defined per device type');
    assert.ok(throttle.includes('battery: { txPerMinute: 10, rxPerMinute: 30 }'), 'battery devices capped at 30 rx/min');
  });
});
