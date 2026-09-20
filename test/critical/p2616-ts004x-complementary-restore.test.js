'use strict';

/**
 * P2616 — TS0043/44 complementary restore Contre quoi
 *
 * Contre quoi:
 * - Fleet hybrid install wipes dedicated E000/LevelControl/DP/raw hotfix stacks (P2520)
 * - scene_switch_4 / button_wireless_4 missing UNION (hybrid AND dedicated)
 * - TS0043 drivers missing dedicated complement (LevelControl + P2328 parseZclHeader)
 * - Hybrid raw path loses parseZclHeader precise 0xFD decode
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2616 TS0044 hybrid UNION dedicated', () => {
  for (const driverId of ['scene_switch_4', 'button_wireless_4']) {
    it(`${driverId}: hybrid AND dedicated stacks co-exist`, () => {
      const src = fs.readFileSync(path.join(ROOT, `drivers/${driverId}/device.js`), 'utf8');
      assert.ok(src.includes('await installWallSceneRemoteHybrid'), `${driverId} missing hybrid call`);
      assert.ok(src.includes('_setupE000Detection'), `${driverId} missing E000 dedicated`);
      assert.ok(src.includes('_setupRawFrameInterceptor'), `${driverId} missing raw dedicated`);
      assert.ok(src.includes('_setupTuyaDPButtonDetection'), `${driverId} missing DP dedicated`);
      assert.ok(/P2616|complementary|UNION|P2520/i.test(src), `${driverId} missing P2616 marker`);
    });
  }

  it('button_wireless_4 keeps LevelControl + unrecognized + onDeleted', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/button_wireless_4/device.js'), 'utf8');
    assert.ok(src.includes('_setupLevelControlDetection'));
    assert.ok(src.includes('_logUnrecognizedFrame'));
    assert.ok(src.includes('async onDeleted'));
    assert.ok(src.includes('parseZclHeader'));
  });

  it('scene_switch_4 keeps OnOffFd gap-fill + P2312 mixin guard', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/scene_switch_4/device.js'), 'utf8');
    assert.ok(src.includes('_setupOnOffFdBoundCluster') || src.includes('_onOffFdBoundClusterInitialized'));
    assert.ok(src.includes('P2312'));
  });
});

describe('P2616 TS0043 complementary dedicated', () => {
  for (const driverId of ['scene_switch_3', 'button_wireless_3', 'wall_remote_3_gang']) {
    it(`${driverId}: hybrid + Ts004xDedicatedComplement`, () => {
      const src = fs.readFileSync(path.join(ROOT, `drivers/${driverId}/device.js`), 'utf8');
      assert.ok(src.includes('installWallSceneRemoteHybrid'));
      assert.ok(src.includes('installTs004xDedicatedComplement'));
      assert.ok(src.includes('maxButtons: 3'));
    });
  }
});

describe('P2616 fleet modules', () => {
  it('WallSceneRemoteHybridInit uses parseZclHeader complementary', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'lib/devices/WallSceneRemoteHybridInit.js'),
      'utf8',
    );
    assert.ok(src.includes('parseZclHeader'));
    assert.ok(src.includes('raw-0xFD-hdr') || src.includes('P2328'));
  });

  it('Ts004xDedicatedComplement exports LevelControl + P2328 raw', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'lib/devices/Ts004xDedicatedComplement.js'),
      'utf8',
    );
    assert.ok(src.includes('levelControl') || src.includes('LevelControl'));
    assert.ok(src.includes('parseZclHeader'));
    assert.ok(src.includes('installTs004xDedicatedComplement'));
    const mod = require('../../lib/devices/Ts004xDedicatedComplement');
    assert.equal(typeof mod.installTs004xDedicatedComplement, 'function');
  });

  it('npm check:p2616 wired', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts['check:p2616']);
  });
});
