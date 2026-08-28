'use strict';

/**
 * P2285 — Deep lock for _TZ3000_mrpevh8p+TS0041 (SH-SC07 / Johan #1120 / Z2M).
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('P2285 mrpevh8p+TS0041 SH-SC07 deep lock', () => {
  it('fingerprints.json never routes MRPEVH8P to switch_1gang', () => {
    const j = JSON.parse(read('lib/tuya/fingerprints.json'));
    for (const k of Object.keys(j).filter((x) => /mrpevh8p/i.test(x))) {
      assert.strictEqual(j[k].driverId, 'button_wireless_1', k);
      assert.deepStrictEqual(j[k].modelIds, ['TS0041'], k);
    }
    for (const k of ['_TZ3000_b4awzgct', '_TZ3000_5bpeda8u']) {
      assert.strictEqual(j[k].driverId, 'button_wireless_1', k);
    }
  });

  it('DeviceFingerprintDB compounds → button_wireless_1', () => {
    delete require.cache[require.resolve('../../lib/DeviceFingerprintDB')];
    const DB = require('../../lib/DeviceFingerprintDB');
    assert.strictEqual(DB.lookup('_TZ3000_mrpevh8p', 'TS0041').driver, 'button_wireless_1');
    assert.strictEqual(DB.lookup('_TZ3000_5bpeda8u', 'TS0041').driver, 'button_wireless_1');
    assert.strictEqual(DB.lookup('_TZ3000_b4awzgct', 'TS0041').driver, 'button_wireless_1');
  });

  it('PhysicalButtonMixin profile collapses phantom EPs + skip8004 + noEf00Tx', () => {
    const src = read('lib/mixins/PhysicalButtonMixin.js');
    assert(src.includes("'_TZ3000_mrpevh8p'"));
    assert(src.includes('collapsePhantomEndpoints: true'));
    assert(src.includes('mapAllEndpointsToButton1: true'));
    assert(src.includes('skipBatteryReporting: true'));
    assert(src.includes('noEf00Tx: true'));
    assert(src.includes('batteryEpOnly: 1'));
    assert(src.includes("'_TZ3000_5bpeda8u'"));
    assert(src.includes("'_TZ3000_b4awzgct'"));
  });

  it('button_wireless_1 compose lists mrpevh8p + siblings', () => {
    const c = read('drivers/button_wireless_1/driver.compose.json');
    assert(/_TZ3000_mrpevh8p/i.test(c));
    assert(/_TZ3000_5bpeda8u/i.test(c));
    assert(/_TZ3000_b4awzgct/i.test(c));
    assert(c.includes('TS0041'));
  });

  it('registry forbidMode couple + forbids switch_1gang / 4_ts0041', () => {
    const reg = JSON.parse(read('data/user-misattribution-registry.json'));
    const hit = reg.cases.find((c) => c.id === 'p2282-mrpevh8p-ts0041-button');
    assert(hit);
    assert.strictEqual(hit.forbidMode, 'couple');
    assert.strictEqual(hit.canonicalDriver, 'button_wireless_1');
    assert(hit.forbiddenDrivers.includes('switch_1gang'));
    assert(hit.forbiddenDrivers.includes('button_wireless_4_ts0041'));
    const sib = reg.cases.find((c) => c.id === 'p2285-sh-sc07-siblings-ts0041');
    assert(sib);
  });

  it('ButtonDevice battery prefers batteryEpOnly from profile', () => {
    const src = read('lib/devices/ButtonDevice.js');
    assert(src.includes('batteryEpOnly'));
    assert(src.includes('Johan #1120'));
  });

  it('raw 0xFD maps phantom EPs to button 1', () => {
    const src = read('lib/mixins/PhysicalButtonMixin.js');
    assert(src.includes('mapAllEndpointsToButton1'));
    assert(src.includes('EP${epId}→btn${gang}'));
  });

  it('P2290 getDeviceProfile uses MfrHelper + button_wireless_1/TS0041 fallback', () => {
    const src = read('lib/mixins/PhysicalButtonMixin.js');
    assert(src.includes('ManufacturerNameHelper'));
    assert(src.includes('P2290_button_wireless_1_ts0041'));
    assert(src.includes('resolveGangCount(this)'));
    assert(src.includes('collapsePhantomEndpoints'));
  });

  it('P2290 OnOffBoundCluster resolves nested command.id like raw catcher', () => {
    const OnOffBoundCluster = require('../../lib/clusters/OnOffBoundCluster');
    const seen = [];
    const bc = new OnOffBoundCluster({
      onSetOn: (p) => seen.push(p),
    });
    bc._device = { log() {} };
    return bc.handleFrame({ command: { id: 0xFD }, data: Buffer.from([0]) }, null, null).then(() => {
      assert.strictEqual(seen.length, 1);
      assert.strictEqual(seen[0].cmdId, 0xFD);
      assert.strictEqual(seen[0].press, 'single');
    });
  });

  it('P2290 mfs_db MRPEVH8P pid is TS0041 not 01MINIZB', () => {
    const j = JSON.parse(read('data/mfs_db.json'));
    const e = j._TZ3000_MRPEVH8P;
    assert(e);
    assert.strictEqual(e.driverId, 'button_wireless_1');
    assert.deepStrictEqual(e.modelIds, ['TS0041']);
    assert.strictEqual(e.pid, 'TS0041');
    assert.strictEqual(e.modelIdsCount, 1);
  });

  it('P2290 setupStandardBatteryMonitoring honors skipBatteryReporting', () => {
    const src = read('lib/devices/BaseUnifiedDevice.js');
    assert(src.includes('skipBatteryReporting'));
    assert(src.includes('Skipping configureReporting (profile.skipBatteryReporting)'));
  });
});
