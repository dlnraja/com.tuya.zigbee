'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  lookupCluster,
  parseClusterMentions,
  applyReportingJitter,
  CLUSTERS,
} = require('../../lib/zigbee/ZclClusterLexicon');
const { shouldProactivePowerCfgRead } = require('../../lib/zigbee/PowerClusterPolicy');
const { isSleepyRemote } = require('../../lib/zigbee/TimeClusterPolicy');
const { extractForumSignals } = require('../../tools/ci/forum-signal-extract');
const { isDeviceUnreachable, isTransientZigbeeError } = require('../../lib/utils/ZigbeeRetry');

describe('ZclClusterLexicon', () => {
  it('resolves 0x000A Time and 0x0001 Power Configuration', () => {
    assert.equal(lookupCluster('0x000A').key, 'TIME');
    assert.equal(lookupCluster(0x0001).key, 'POWER_CFG');
    assert.equal(lookupCluster('genOnOff').id, CLUSTERS.ON_OFF.id);
    assert.equal(lookupCluster('0xEF00').key, 'TUYA_EF00');
  });

  it('extracts cluster mentions from forum-style text', () => {
    const hits = parseClusterMentions('burst on 0x000A and genPowerCfg after power restore; leftover 0xEF00');
    const keys = hits.map((h) => h.key).sort();
    assert.ok(keys.includes('TIME'));
    assert.ok(keys.includes('POWER_CFG'));
    assert.ok(keys.includes('TUYA_EF00'));
  });

  it('applies reporting jitter without going below 1s', () => {
    const v = applyReportingJitter(300, 10);
    assert.ok(v >= 270 && v <= 330);
    assert.equal(applyReportingJitter(0, 10), 1);
  });
});

describe('forum-signal-extract', () => {
  it('captures gang bleed + clusters from a HomeSuite-style note', () => {
    const r = extractForumSignals(
      'Gabriel: TS0002 _TZ3000_w5xztuy7 gang1 bleed onto gang2; 0x0006 burst on reconnect, jitter+retry, no 0xEF00',
    );
    assert.ok(r.mfrs.includes('_TZ3000_W5XZTUY7') || r.mfrs.includes('_TZ3000_w5xztuy7') || r.mfrs.some((m) => /W5XZTUY7/i.test(m)));
    assert.ok(r.pids.includes('TS0002'));
    assert.ok(r.issues.includes('bleed') || r.issues.includes('gang') || r.issues.includes('burst'));
    assert.ok(r.clusters.some((c) => c.key === 'ON_OFF'));
  });

  it('ignores truncated manufacturer tokens from first-post templates', () => {
    const r = extractForumSignals('_TZ3000_KE and _TZ3000_12S are not real ids; _TZ3000_w5xztuy7 is');
    assert.equal(r.mfrs.some((m) => /_TZ3000_KE$/i.test(m)), false);
    assert.ok(r.mfrs.some((m) => /W5XZTUY7/i.test(m)));
  });
});

describe('PowerClusterPolicy 0x0001', () => {
  it('does not poll battery cluster on scene remotes', () => {
    const remote = {
      driver: { id: 'button_wireless_3', manifest: { class: 'button' } },
      getSettings: () => ({ zb_model_id: 'TS0043' }),
      getData: () => ({}),
      getStore: () => ({}),
    };
    assert.equal(isSleepyRemote(remote), true);
    assert.equal(shouldProactivePowerCfgRead(remote), false);
  });

  it('still allows 0x0001 reads on climate sensors', () => {
    const sensor = {
      driver: { id: 'climate_sensor', manifest: { class: 'sensor' } },
      getSettings: () => ({ zb_model_id: 'TS0201' }),
      getData: () => ({}),
      getStore: () => ({}),
    };
    assert.equal(shouldProactivePowerCfgRead(sensor), true);
  });
});

describe('ZigbeeRetry unreachable', () => {
  it('retries Could not reach device / no-ack', () => {
    assert.equal(isDeviceUnreachable(new Error('Could not reach device')), true);
    assert.equal(isTransientZigbeeError(new Error('MAC no ack')), true);
  });
});
