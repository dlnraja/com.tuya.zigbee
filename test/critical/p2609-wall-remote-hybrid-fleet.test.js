'use strict';

/**
 * P2609 — Fleet wall/scene remotes 1–6 btn hybrid RX Contre quoi (stable backport)
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

const FLEET = [
  ['button_wireless_1', 1],
  ['button_wireless_2', 2],
  ['button_wireless_3', 3],
  ['button_wireless_6', 6],
  ['wall_remote_1_gang', 1],
  ['wall_remote_2_gang', 2],
  ['wall_remote_3_gang', 3],
  ['wall_remote_4_gang', 4],
  ['wall_remote_6_gang', 6],
  ['scene_switch_1', 1],
  ['scene_switch_2', 2],
  ['scene_switch_3', 3],
  ['scene_switch_6', 6],
  ['remote_button_wireless', 3],
  ['remote_button_wireless_handheld', 4],
];

describe('P2609 wall/scene remote hybrid fleet (1–6 btn)', () => {
  it('WallSceneRemoteHybridInit exports installer + power policy', () => {
    const mod = require('../../lib/devices/WallSceneRemoteHybridInit.js');
    assert.equal(typeof mod.installWallSceneRemoteHybrid, 'function');
    assert.equal(typeof mod.applyRemotePowerPolicy, 'function');
  });

  for (const [driverId, n] of FLEET) {
    it(`${driverId} installs hybrid with maxButtons ${n}`, () => {
      const src = fs.readFileSync(path.join(ROOT, `drivers/${driverId}/device.js`), 'utf8');
      assert.ok(src.includes('installWallSceneRemoteHybrid'), `${driverId} missing hybrid`);
      assert.ok(src.includes(`maxButtons: ${n}`) || src.includes(`maxButtons:${n}`), `${driverId} wrong maxButtons`);
    });
  }

  it('button_wireless_4 / scene_switch_4 keep dedicated hybrid stacks', () => {
    const b4 = fs.readFileSync(path.join(ROOT, 'drivers/button_wireless_4/device.js'), 'utf8');
    const s4 = fs.readFileSync(path.join(ROOT, 'drivers/scene_switch_4/device.js'), 'utf8');
    assert.ok(/E000|_setupTuyaDP|_setupRawFrame/i.test(b4));
    assert.ok(/0xFD|OnOffBound|_setupTuyaDP|_setupRawFrame/i.test(s4));
  });

  it('npm check:p2609 wired', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts['check:p2609']);
    assert.ok(pkg.scripts['check:p2608'] || pkg.scripts['check:p260x']);
  });
});
