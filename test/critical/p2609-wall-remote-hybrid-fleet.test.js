'use strict';

/**
 * P2609 — Fleet wall/scene remotes 1–6 btn hybrid RX Contre quoi
 * Battery + mains stickies / panels: ZCL + 0xFD + E000 + EF00 + raw
 * Never invent pid; never force 0x8004 on TS0041–44.
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
  ['scene_switch_4', 4],
  ['scene_switch_6', 6],
  ['button_wireless_4', 4],
  ['remote_button_wireless', 3],
  ['remote_button_wireless_handheld', 4],
];

describe('P2609 wall/scene remote hybrid fleet (1–6 btn)', () => {
  it('WallSceneRemoteHybridInit exports installer + power policy', () => {
    const mod = require('../../lib/devices/WallSceneRemoteHybridInit.js');
    assert.equal(typeof mod.installWallSceneRemoteHybrid, 'function');
    assert.equal(typeof mod.applyRemotePowerPolicy, 'function');
    const src = fs.readFileSync(
      path.join(ROOT, 'lib/devices/WallSceneRemoteHybridInit.js'),
      'utf8',
    );
    assert.ok(src.includes('_wallSceneRemoteHybridInstalled'));
    assert.ok(src.includes('never 0x8004') || src.includes('0x8004'));
    assert.ok(src.includes('applyRemotePowerPolicy'));
  });

  for (const [driverId, n] of FLEET) {
    it(`${driverId} installs hybrid with maxButtons ${n}`, () => {
      const src = fs.readFileSync(
        path.join(ROOT, `drivers/${driverId}/device.js`),
        'utf8',
      );
      assert.ok(src.includes('installWallSceneRemoteHybrid'), `${driverId} missing hybrid`);
      assert.ok(
        src.includes(`maxButtons: ${n}`) || src.includes(`maxButtons:${n}`),
        `${driverId} wrong maxButtons`,
      );
    });
  }

  it('button_wireless_4 / scene_switch_4 use fleet hybrid (P2614) + LevelControl on wireless', () => {
    const b4 = fs.readFileSync(path.join(ROOT, 'drivers/button_wireless_4/device.js'), 'utf8');
    const s4 = fs.readFileSync(path.join(ROOT, 'drivers/scene_switch_4/device.js'), 'utf8');
    assert.ok(b4.includes('installWallSceneRemoteHybrid'));
    assert.ok(s4.includes('installWallSceneRemoteHybrid'));
    assert.ok(/_setupLevelControlDetection|levelControl/i.test(b4));
  });

  it('button_wireless_3 does not steal button_wireless_4-only mfrs (dziaict4/ygvf9xzp)', () => {
    const compose = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/button_wireless_3/driver.compose.json'),
      'utf8',
    ));
    const mfrs = compose.zigbee?.manufacturerName || [];
    assert.ok(!mfrs.some((m) => /dziaict4/i.test(m)), 'dziaict4 belongs to 4-btn');
    assert.ok(!mfrs.some((m) => /ygvf9xzp/i.test(m)), 'ygvf9xzp belongs to 4-btn');
    assert.ok(mfrs.some((m) => /a7ouggvs/i.test(m)), 'Zemismart sticky stays on 3-btn');
  });

  it('npm check:p2609 wired; publish workflows run p260x family', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts['check:p2609']);
    assert.ok(pkg.scripts['check:p260x']);
    const paths = [
      '.github/workflows/auto-publish-on-push.yml',
      '.github/workflows/bastien-publish.yml',
      '.github/workflows/bastien-promote-upstream.yml',
    ];
    const blob = paths
      .filter((p) => fs.existsSync(path.join(ROOT, p)))
      .map((p) => fs.readFileSync(path.join(ROOT, p), 'utf8'))
      .join('\n');
    assert.ok(blob.includes('check:p260x') || blob.includes('check:p2609'));
  });
});
