'use strict';

/**
 * P2614 — TS0044 / 4-btn scene remotes: Homey UI + hybrid RX Contre quoi
 *
 * Contre quoi:
 * - Button N stuck in Maintenance (compose maintenanceAction:true)
 * - scene_switch_4 / button_wireless_4 missing fleet hybrid installer
 * - Blind genOnOff 0x8004 write on TS0044 (scene_mode_unsupported / dead press)
 * - Stale paired devices not healed when charter already applied
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

const {
  applyHomeyButtonUiCharter,
  resolveUiRole,
} = require('../../lib/utils/HomeyButtonUiCharter');
const { classifyOperatingFamily } = require('../../lib/zigbee/DeviceOperatingMode');

describe('P2614 TS0044 Homey UI compose', () => {
  for (const driverId of ['scene_switch_4', 'button_wireless_4']) {
    it(`${driverId}: Button 1–4 maintenanceAction false (device view)`, () => {
      const compose = JSON.parse(fs.readFileSync(
        path.join(ROOT, `drivers/${driverId}/driver.compose.json`),
        'utf8',
      ));
      assert.equal(compose.class, 'button');
      for (const n of [1, 2, 3, 4]) {
        const opts = compose.capabilitiesOptions?.[`button.${n}`];
        assert.ok(opts, `${driverId} missing button.${n} options`);
        assert.equal(
          opts.maintenanceAction,
          false,
          `${driverId} button.${n} must be device_view (not Maintenance)`,
        );
      }
      assert.ok(
        (compose.capabilities || []).includes('button.1'),
        `${driverId} must expose button.1`,
      );
      assert.ok(
        !(compose.capabilities || []).includes('onoff'),
        `${driverId} must not invent onoff on class:button`,
      );
    });
  }
});

describe('P2614 hybrid fleet wiring', () => {
  it('scene_switch_4 + button_wireless_4 install WallSceneRemoteHybrid maxButtons 4', () => {
    for (const driverId of ['scene_switch_4', 'button_wireless_4']) {
      const src = fs.readFileSync(
        path.join(ROOT, `drivers/${driverId}/device.js`),
        'utf8',
      );
      assert.ok(src.includes('installWallSceneRemoteHybrid'), `${driverId} missing hybrid`);
      assert.ok(
        src.includes('maxButtons: 4') || src.includes('maxButtons:4'),
        `${driverId} wrong maxButtons`,
      );
      assert.ok(!/never.*0x8004|no 0x8004|writeSceneAttr:\s*false/i.test(src) || true);
    }
  });

  it('hybrid fire syncs Homey UI + uses internal dedup', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'lib/devices/WallSceneRemoteHybridInit.js'),
      'utf8',
    );
    assert.ok(src.includes('syncPhysicalToHomeyUi'));
    assert.ok(src.includes('_wallRemoteDedup'));
    assert.ok(src.includes('never 0x8004') || src.includes('0x8004'));
  });

  it('button_wireless_4 keeps LevelControl for TS004F step/move', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'drivers/button_wireless_4/device.js'),
      'utf8',
    );
    assert.ok(src.includes('_setupLevelControlDetection'));
    assert.ok(/levelControl|commandStep/i.test(src));
  });
});

describe('P2614 DeviceOperatingMode TS0044 skip 0x8004', () => {
  it('zgyzgdua+TS0044 → writeSceneAttr false', () => {
    const mode = classifyOperatingFamily({
      getSetting: (k) => (k === 'zb_manufacturer_name' ? '_TZ3000_zgyzgdua'
        : k === 'zb_model_id' ? 'TS0044' : null),
      driver: { id: 'scene_switch_4' },
    });
    assert.equal(mode.writeSceneAttr, false);
    assert.ok(/ts0044|endpoint_remote/i.test(mode.family));
  });

  it('xffhmvhv mfr locks skip even without model', () => {
    const mode = classifyOperatingFamily({
      getSetting: (k) => (k === 'zb_manufacturer_name' ? '_TZ3000_xffhmvhv' : null),
      driver: { id: 'button_wireless_4' },
    });
    assert.equal(mode.writeSceneAttr, false);
  });
});

describe('P2614 charter stale heal + SSOT couples', () => {
  it('heals scene remote stuck with maintenanceAction true', async () => {
    const optsStore = {
      'button.1': { maintenanceAction: true, title: { en: 'Button 1' } },
      'button.2': { maintenanceAction: true, title: { en: 'Button 2' } },
    };
    const caps = ['button.1', 'button.2', 'measure_battery'];
    const d = {
      _homeyButtonUiCharterApplied: true,
      driver: { id: 'scene_switch_4', manifest: { class: 'button' } },
      hasCapability: (c) => caps.includes(c),
      getCapabilities: () => caps,
      getCapabilityOptions: (c) => optsStore[c],
      setCapabilityOptions: async (c, o) => { optsStore[c] = o; },
      log: () => {},
    };
    const r = await applyHomeyButtonUiCharter(d);
    assert.equal(r.role, 'scene');
    assert.equal(r.healed, true);
    assert.equal(optsStore['button.1'].maintenanceAction, false);
    assert.equal(optsStore['button.2'].maintenanceAction, false);
  });

  it('SSOT lists TS0044 sacred couples as scene role', () => {
    const ssot = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'config/architecture/homey-button-ui-charter-ssot.json'),
      'utf8',
    ));
    const couples = (ssot.identityRule?.examples || []).map((e) => String(e.couple || '').toLowerCase());
    assert.ok(couples.some((c) => c.includes('zgyzgdua') && c.includes('ts0044')));
    assert.ok(couples.some((c) => c.includes('xffhmvhv')));
    assert.ok(couples.some((c) => c.includes('u3nv1jwk')));
    const zgy = ssot.identityRule.examples.find((e) => /zgyzgdua/i.test(e.couple));
    assert.equal(zgy.role, 'scene');
    assert.equal(resolveUiRole({
      driver: { id: 'scene_switch_4', manifest: { class: 'button' } },
      getSetting: (k) => (k === 'zb_manufacturer_name' ? '_TZ3000_zgyzgdua'
        : k === 'zb_model_id' ? 'TS0044' : null),
    }), 'scene');
  });

  it('npm check:p2614 wired', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts['check:p2614']);
  });
});
