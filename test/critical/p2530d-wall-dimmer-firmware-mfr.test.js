'use strict';

/**
 * P2530d — wall_dimmer firmwareUpdates mfr must exact-match zigbee list (Athom publish)
 * Dual-app: BOTH
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));

describe('P2530d wall_dimmer firmwareUpdates mfr sync', () => {
  it('sync script exists', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'tools/ci/p2530d-wall-dimmer-firmware-mfr-sync.js')));
  });

  it('firmwareUpdates manufacturerName is exact member of zigbee.manufacturerName', () => {
    const c = readJson('drivers/wall_dimmer_tuya/driver.compose.json');
    const names = c.zigbee?.manufacturerName || [];
    const fw = c.firmwareUpdates?.updates?.[0]?.device?.manufacturerName || [];
    assert.ok(fw.length >= 1, 'firmwareUpdates must declare at least one mfr');
    for (const m of fw) {
      assert.ok(
        names.includes(m),
        `exact match required: firmwareUpdates mfr ${m} missing from zigbee.manufacturerName`,
      );
    }
  });

  it('ngqk6jia OTA target stays on wall_dimmer (case form present)', () => {
    const c = readJson('drivers/wall_dimmer_tuya/driver.compose.json');
    const names = c.zigbee?.manufacturerName || [];
    assert.ok(names.some((m) => String(m).toLowerCase() === '_tz3210_ngqk6jia'));
    const fw = c.firmwareUpdates?.updates?.[0]?.device?.manufacturerName || [];
    assert.ok(fw.some((m) => String(m).toLowerCase() === '_tz3210_ngqk6jia'));
  });
});
