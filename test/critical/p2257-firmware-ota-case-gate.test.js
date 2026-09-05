'use strict';

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

/**
 * P2257 — firmwareUpdates manufacturerName must match zigbee list exactly after compact
 * Root cause: Auto-Publish #32893708358 failed homey app publish validation on
 * thermostatic_radiator_valve OTA case drift (_TZE200_ckud7u2l vs _tze200_ckud7u2l).
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.join(__dirname, '..', '..');
const { compactManifestFile } = require('../../scripts/maintenance/compact-zigbee-identifiers.cjs');

describe('P2257 firmware OTA case gate', function () {
  this.timeout?.(60000);

  it('compact canonicalizes firmwareUpdates mfr to surviving zigbee case', () => {
    const tmp = path.join(os.tmpdir(), `p2257-fw-case-${Date.now()}.json`);
    fs.copyFileSync(path.join(ROOT, 'app.json'), tmp);
    compactManifestFile(tmp, { maxTotalCombos: 20000, maxDriverCombos: 2000 });
    const app = JSON.parse(fs.readFileSync(tmp, 'utf8'));
    const driver = (app.drivers || []).find((d) => d.id === 'thermostatic_radiator_valve');
    assert.ok(driver, 'thermostatic_radiator_valve in manifest');
    const fwMfrs = (((driver.firmwareUpdates || {}).updates || [])[0] || {}).device?.manufacturerName || [];
    const zigbeeMfrs = driver.zigbee?.manufacturerName || [];
    const zigbeeSet = new Set(zigbeeMfrs);
    for (const m of fwMfrs) {
      assert.ok(zigbeeSet.has(m), `OTA mfr ${m} must exist exactly in zigbee.manufacturerName after compact`);
    }
    fs.unlinkSync(tmp);
  });
});
