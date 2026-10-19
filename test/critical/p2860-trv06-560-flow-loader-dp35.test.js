'use strict';
/**
 * Issue #560 (artisare, TRV06 _TZE200_rxq4iti9 / TS0601, profile me167) — rewritten in our own words.
 *  - triggerDPReceived must not spam invalid_flow_card_id: it tries the device card, then the app card,
 *    remembers the one that works, and goes quiet when neither exists on the running Homey build.
 *  - DP35 (fault bitmap, bit 0 = battery low; Z2M TS0601_thermostat_3 errorOrBatteryLow) feeds alarm_battery.
 *  - measure_humidity is stripped for this exact couple only.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const UniversalFlowCardLoader = require('../../lib/flow/UniversalFlowCardLoader');

const ROOT = path.join(__dirname, '..', '..');
const mkDevice = () => ({ id: 'd1', getData: () => ({ id: 'd1' }), getStoreValue: () => ({}), setStoreValue: async () => {} });
const invalid = () => { const e = new Error('invalid_flow_card_id'); return e; };

describe('P2860 #560 tuya_dp_received loader fallback', () => {
  it('falls back from a failing device card to the app card and remembers it', async () => {
    const logs = [];
    let appTriggers = 0; let devTriggers = 0;
    const homey = {
      app: { log: (...a) => logs.push(a.join(' ')) },
      flow: {
        getDeviceTriggerCard: () => ({ trigger: async () => { devTriggers++; throw invalid(); } }),
        getTriggerCard: () => ({ trigger: async () => { appTriggers++; } }),
      },
    };
    const l = new UniversalFlowCardLoader(homey);
    await l.triggerDPReceived(mkDevice(), 4, 50);
    await l.triggerDPReceived(mkDevice(), 5, 200);
    assert.strictEqual(devTriggers, 1, 'device card is only tried until it fails once');
    assert.strictEqual(appTriggers, 2);
    assert.ok(!logs.some((x) => /triggerDPReceived trigger error/.test(x)));
  });

  it('goes quiet (one log line) when neither card exists', async () => {
    const logs = [];
    const bad = { trigger: async () => { throw invalid(); } };
    const homey = {
      app: { log: (...a) => logs.push(a.join(' ')) },
      flow: { getDeviceTriggerCard: () => bad, getTriggerCard: () => bad },
    };
    const l = new UniversalFlowCardLoader(homey);
    for (let i = 0; i < 10; i++) await l.triggerDPReceived(mkDevice(), 3, i);
    assert.ok(logs.length <= 3, `expected few log lines, got ${logs.length}`);
    assert.ok(!logs.some((x) => /triggerDPReceived trigger error/.test(x)));
    assert.strictEqual(l._dpTriggerDead, true);
  });

  it('logs non-card errors without throwing', async () => {
    const logs = [];
    const homey = {
      app: { log: (...a) => logs.push(a.join(' ')) },
      flow: { getDeviceTriggerCard: () => ({ trigger: async () => { throw new Error('boom'); } }), getTriggerCard: () => null },
    };
    const l = new UniversalFlowCardLoader(homey);
    await l.triggerDPReceived(mkDevice(), 3, 1);
    assert.ok(logs.some((x) => /triggerDPReceived trigger error: boom/.test(x)));
  });
});

describe('P2860 #560 TRV06 DP35 + humidity', () => {
  const src = fs.readFileSync(path.join(ROOT, 'drivers/device_radiator_valve/device.js'), 'utf8');
  it('me167 DP35 maps to alarm_battery on bit 0', () => {
    assert.ok(/35:\s*\{\s*capability:\s*'alarm_battery',\s*transform:\s*\(v\)\s*=>\s*\(Number\(v\)\s*&\s*1\)\s*===\s*1/.test(src));
  });
  it('alarm_battery is added lazily on the first DP35 report, humidity stripped for rxq4iti9 only', () => {
    assert.ok(/_handleDP\(dpId, raw\)/.test(src));
    assert.ok(/addCapability\('alarm_battery'\)/.test(src));
    assert.ok(/=== '_tze200_rxq4iti9'/.test(src));
    assert.ok(/removeCapability\('measure_humidity'\)/.test(src));
  });
  it('driver-wide capability list is untouched (other TRVs keep measure_humidity)', () => {
    const c = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/device_radiator_valve/driver.compose.json'), 'utf8'));
    assert.ok(c.capabilities.includes('measure_humidity'));
    assert.ok(!c.capabilities.includes('alarm_battery'));
  });
});
