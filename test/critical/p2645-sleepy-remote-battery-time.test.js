'use strict';

/**
 * P2645 — Bastien 4d4e1684 complementary reflection
 * Contre quoi: sleepy remotes get battery configureReporting / getOnStart while asleep
 * → "Impossible de joindre" + mute buttons; Time 0x000A L0 spam in diags.
 * SSOT docs must stay complementary (union) — never degrade / wipe.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2645 sleepy remote pairing / time cluster', () => {
  it('BaseUnifiedDevice forces skip battery cfg for button drivers + getOnStart false', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/devices/BaseUnifiedDevice.js'), 'utf8');
    assert.ok(src.includes('P2470'));
    assert.ok(src.includes('P2645'));
    assert.ok(src.includes('P2470 skip battery configureAttributeReporting'));
    assert.ok(src.includes('getOnStart: false'));
    assert.ok(src.includes('getOnOnline: false'));
    assert.ok(src.includes('isSleepyRemote'));
    assert.ok(src.includes('isButtonDriver'));
  });

  it('TuyaZigbeeDevice quiets Time 0x000A L0 spam', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/tuya/TuyaZigbeeDevice.js'), 'utf8');
    assert.ok(src.includes('quietCluster'));
    assert.ok(/0x000a/i.test(src));
    assert.ok(src.includes('P2645'));
  });

  it('button_wireless_1/3 profiles set skipBatteryReporting', () => {
    for (const id of ['button_wireless_1', 'button_wireless_3']) {
      const src = fs.readFileSync(path.join(ROOT, `drivers/${id}/device.js`), 'utf8');
      assert.ok(src.includes('skipBatteryReporting: true'), id);
    }
  });

  it('PhysicalButtonMixin unknown fallback skips battery reporting', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/mixins/PhysicalButtonMixin.js'), 'utf8');
    assert.ok(src.includes('P2645'));
    assert.ok(/unknown[\s\S]{0,200}skipBatteryReporting:\s*true/.test(src));
  });

  it('SSOT machine + human exist and lock skipBattCfg + wake UX (no degrade)', () => {
    const ssotPath = path.join(ROOT, 'config/architecture/sleepy-remote-pairing-ssot.json');
    const humanPath = path.join(ROOT, 'docs/architecture/SLEEPY_REMOTE_PAIRING_SSOT.md');
    assert.ok(fs.existsSync(ssotPath), 'machine SSOT');
    assert.ok(fs.existsSync(humanPath), 'human SSOT');
    const ssot = JSON.parse(fs.readFileSync(ssotPath, 'utf8'));
    assert.equal(ssot._meta.id, 'P2645-sleepy-remote-pairing-ssot');
    assert.equal(ssot.mandate.unionNotReplace, true);
    assert.equal(ssot.mandate.neverStripMeasureBatteryOnButtons, true);
    assert.ok(ssot.runtime?.skipBatteryConfigureReporting);
    assert.ok(ssot.userUx?.wakeDuringPair?.fr);
    assert.deepEqual(ssot.driverRouting.forbid.remote_button_wireless_wall.productIdMustBe, ['TS0041']);
    assert.ok(ssot.runtime.quietUnhandledClusters.clusters.includes('0x000a'));
    const human = fs.readFileSync(humanPath, 'utf8');
    assert.ok(human.includes('Skip ≠ strip') || human.includes('never wipe'));
    assert.ok(human.includes('wake-tap') || human.includes('2–3'));
  });

  it('pairing + battery + smart-map point at sleepy SSOT (complementary completeness)', () => {
    const pairing = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/architecture/pairing-discovery-ssot.json'), 'utf8'));
    assert.ok(pairing.athomOfficial?.zigbee?.sleepyRemoteComplementary?.ssot?.includes('sleepy-remote'));
    const map = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/architecture/project-smart-map.json'), 'utf8'));
    assert.ok(map.pairing?.sleepyRemoteSsot?.includes('sleepy-remote-pairing-ssot'));
    const batt = fs.readFileSync(path.join(ROOT, 'docs/architecture/BATTERY_SSOT.md'), 'utf8');
    assert.ok(batt.includes('P2645'));
    assert.ok(batt.includes('Skip ≠ strip'));
  });

  it('wall remote compose stays TS0041-only (P2644b complementary lock)', () => {
    const compose = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/remote_button_wireless_wall/driver.compose.json'),
      'utf8'
    ));
    const pids = compose.zigbee?.productId || [];
    assert.ok(pids.includes('TS0041'));
    assert.ok(!pids.includes('TS0043'), 'must not claim TS0043');
    assert.ok(!pids.includes('TS0042'), 'must not claim TS0042');
    assert.ok(!pids.includes('TS0044'), 'must not claim TS0044');
  });
});
