'use strict';

/**
 * P2615 — TS0043 / 3-btn scene remotes: Homey UI + hybrid RX Contre quoi
 *
 * Contre quoi:
 * - Button N stuck in Maintenance (compose maintenanceAction:true)
 * - Missing fleet hybrid installer on 3-btn drivers
 * - Blind genOnOff 0x8004 write on TS0043
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const { classifyOperatingFamily } = require('../../lib/zigbee/DeviceOperatingMode');
const { resolveUiRole } = require('../../lib/utils/HomeyButtonUiCharter');

const DRIVERS = [
  ['scene_switch_3', 3, 'button'],
  ['button_wireless_3', 3, 'button'],
  ['wall_remote_3_gang', 3, 'remote'],
];

describe('P2615 TS0043 Homey UI compose', () => {
  for (const [driverId, n, cls] of DRIVERS) {
    it(`${driverId}: Button 1–${n} maintenanceAction false (device view)`, () => {
      const compose = JSON.parse(fs.readFileSync(
        path.join(ROOT, `drivers/${driverId}/driver.compose.json`),
        'utf8',
      ));
      assert.equal(compose.class, cls);
      assert.ok((compose.zigbee?.productId || []).some((p) => /TS0043/i.test(p)));
      for (let i = 1; i <= n; i++) {
        const opts = compose.capabilitiesOptions?.[`button.${i}`];
        assert.ok(opts, `${driverId} missing button.${i}`);
        assert.equal(opts.maintenanceAction, false, `${driverId} button.${i} device_view`);
        assert.equal(opts.getable, false);
        assert.equal(opts.setable, false);
      }
      assert.ok(!(compose.capabilities || []).includes('onoff'));
    });
  }
});

describe('P2615 hybrid fleet wiring', () => {
  for (const [driverId, n] of DRIVERS) {
    it(`${driverId} installs WallSceneRemoteHybrid maxButtons ${n}`, () => {
      const src = fs.readFileSync(path.join(ROOT, `drivers/${driverId}/device.js`), 'utf8');
      assert.ok(src.includes('installWallSceneRemoteHybrid'));
      assert.ok(src.includes(`maxButtons: ${n}`) || src.includes(`maxButtons:${n}`));
      // P2616: complementary dedicated must stay (P2520)
      assert.ok(src.includes('installTs004xDedicatedComplement'), `${driverId} missing dedicated complement`);
    });
  }
});

describe('P2615 DeviceOperatingMode TS0043 skip 0x8004', () => {
  it('TS0043 model → writeSceneAttr false', () => {
    const mode = classifyOperatingFamily({
      getSetting: (k) => (k === 'zb_model_id' ? 'TS0043' : null),
      driver: { id: 'button_wireless_3' },
    });
    assert.equal(mode.writeSceneAttr, false);
  });

  it('a7ouggvs mfr locks skip even without model', () => {
    const mode = classifyOperatingFamily({
      getSetting: (k) => (k === 'zb_manufacturer_name' ? '_TZ3000_a7ouggvs' : null),
      driver: { id: 'button_wireless_3' },
    });
    assert.equal(mode.writeSceneAttr, false);
  });
});

describe('P2615 SSOT + charter + npm', () => {
  it('SSOT lists TS0043 sacred couples as scene', () => {
    const ssot = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'config/architecture/homey-button-ui-charter-ssot.json'),
      'utf8',
    ));
    const couples = (ssot.identityRule?.examples || []).map((e) => String(e.couple || '').toLowerCase());
    assert.ok(couples.some((c) => c.includes('a7ouggvs') && c.includes('ts0043')));
    assert.ok(couples.some((c) => c.includes('bczr4e10') && c.includes('ts0043')));
    assert.equal(resolveUiRole({
      driver: { id: 'button_wireless_3', manifest: { class: 'button' } },
    }), 'scene');
    assert.equal(resolveUiRole({
      driver: { id: 'wall_remote_3_gang', manifest: { class: 'remote' } },
    }), 'scene');
  });

  it('npm check:p2615 wired; voice gate allows class remote', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts['check:p2615']);
    const voice = fs.readFileSync(
      path.join(ROOT, 'scripts/validation/check-google-assistant-voice-safety.js'),
      'utf8',
    );
    assert.ok(voice.includes("compose.class === 'remote'") || voice.includes('class === "remote"'));
  });
});
