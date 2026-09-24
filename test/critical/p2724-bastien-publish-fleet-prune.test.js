'use strict';

/**
 * P2724 — Bastien publish must prune to house fleet (Contre quoi Athom hang)
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.join(__dirname, '..', '..');
const SSOT = path.join(ROOT, 'config', 'architecture', 'bastien-publish-fleet-ssot.json');
const PRUNE = path.join(ROOT, 'scripts', 'maintenance', 'bastien-publish-fleet-prune.js');
const PREPARE = path.join(ROOT, 'scripts', 'prepare-publish.js');

describe('P2724 Bastien house-fleet publish prune', () => {
  it('SSOT keeps live remotes + HOBEIAN + climate + TS0004 drivers', () => {
    const ssot = JSON.parse(fs.readFileSync(SSOT, 'utf8'));
    assert.strictEqual(ssot.appId, 'com.dlnraja.tuya.zigbee.bastien');
    for (const id of [
      'button_wireless_1',
      'button_wireless_2',
      'button_wireless_3',
      'switch_1gang',
      'climate_sensor',
      'switch_4gang',
    ]) {
      assert.ok(ssot.keepDriverIds.includes(id), id);
    }
  });

  it('prepare-publish wires P2724 prune after matrix compact', () => {
    const src = fs.readFileSync(PREPARE, 'utf8');
    assert.match(src, /bastien-publish-fleet-prune/);
    assert.match(src, /\[P2724\] Bastien house-fleet prune/);
  });

  it('prune drops non-fleet drivers only for Bastien App ID', () => {
    const { pruneBastienPublishFleet } = require(PRUNE);
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'p2724-'));
    const appJson = path.join(tmp, 'app.json');
    const fat = {
      id: 'com.dlnraja.tuya.zigbee.bastien',
      version: '1.0.96',
      sdk: 3,
      drivers: [
        { id: 'button_wireless_1', zigbee: {} },
        { id: 'button_wireless_2', zigbee: {} },
        { id: 'button_wireless_3', zigbee: {} },
        { id: 'switch_1gang', zigbee: {} },
        { id: 'switch_4gang', zigbee: {} },
        { id: 'climate_sensor', zigbee: {} },
        { id: 'wall_switch_4gang_1way', zigbee: {} },
        { id: 'contact_sensor', zigbee: {} },
        { id: 'motion_sensor', zigbee: {} },
        { id: 'air_purifier', zigbee: {} },
        { id: 'irrigation_controller', zigbee: {} },
        { id: 'pet_feeder', zigbee: {} },
        { id: 'smoke_sensor', zigbee: {} },
      ],
      flow: {
        triggers: [
          { id: 'button_wireless_1_pressed' },
          { id: 'air_purifier_on' },
        ],
      },
    };
    fs.writeFileSync(appJson, JSON.stringify(fat));
    const r = pruneBastienPublishFleet(appJson);
    assert.strictEqual(r.skipped, false);
    assert.ok(r.after < r.before);
    assert.ok(r.removed.includes('air_purifier'));
    const out = JSON.parse(fs.readFileSync(appJson, 'utf8'));
    assert.ok(out.drivers.every((d) => !['air_purifier', 'pet_feeder'].includes(d.id)));
    assert.ok(out.flow.triggers.some((c) => c.id === 'button_wireless_1_pressed'));
    assert.ok(!out.flow.triggers.some((c) => c.id === 'air_purifier_on'));
    // WHY(P2726 / Athom #106): orphan fleet cards must not survive soft-keep
    assert.strictEqual(out.flow.triggers.length, 1);

    // Universal must be no-op
    fat.id = 'com.dlnraja.tuya.zigbee';
    fs.writeFileSync(appJson, JSON.stringify(fat));
    const u = pruneBastienPublishFleet(appJson);
    assert.strictEqual(u.skipped, true);
  });
});
