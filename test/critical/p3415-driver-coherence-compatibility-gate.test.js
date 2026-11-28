'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { describe, it } = require('../_support/dual-runner');

const ROOT = path.resolve(__dirname, '../..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

describe('P3415 driver coherence & compatibility gate', () => {
  const dirs = fs.readdirSync(DRIVERS_DIR)
    .filter((d) => fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory())
    .sort();

  it('every driver declares valid driver.compose.json with name.en, platforms, connectivity, and zigbee or pair', () => {
    const missingName = [];
    const missingPlatforms = [];
    const missingConn = [];
    const missingPairOrZigbee = [];
    const dupCaps = [];

    for (const d of dirs) {
      const f = path.join(DRIVERS_DIR, d, 'driver.compose.json');
      assert.ok(fs.existsSync(f), `${d} missing driver.compose.json`);
      const j = JSON.parse(fs.readFileSync(f, 'utf8'));
      if (!j.name || !j.name.en) { missingName.push(d); }
      if (!Array.isArray(j.platforms) || j.platforms.length === 0) { missingPlatforms.push(d); }
      if (!Array.isArray(j.connectivity)) { missingConn.push(d); }
      if (!j.zigbee && !j.pair && !d.startsWith('wifi_')) { missingPairOrZigbee.push(d); }
      const caps = Array.isArray(j.capabilities) ? j.capabilities : [];
      if (new Set(caps).size !== caps.length) { dupCaps.push(d); }
    }

    assert.deepStrictEqual(missingName, [], `drivers missing name.en: ${missingName.join(', ')}`);
    assert.deepStrictEqual(missingPlatforms, [], `drivers missing platforms: ${missingPlatforms.join(', ')}`);
    assert.deepStrictEqual(missingConn, [], `drivers missing connectivity: ${missingConn.join(', ')}`);
    assert.deepStrictEqual(missingPairOrZigbee, [], `drivers missing zigbee/pair: ${missingPairOrZigbee.join(', ')}`);
    assert.deepStrictEqual(dupCaps, [], `drivers with duplicate capabilities: ${dupCaps.join(', ')}`);
  });

  it('presence_detector declares list_devices/add_devices pair views and text-typed monitored_devices default', () => {
    const compose = JSON.parse(fs.readFileSync(path.join(DRIVERS_DIR, 'presence_detector/driver.compose.json'), 'utf8'));
    assert.ok(Array.isArray(compose.pair) && compose.pair.some((v) => v.id === 'list_devices'));
    assert.ok(compose.pair.some((v) => v.id === 'add_devices'));
    const drvSrc = fs.readFileSync(path.join(DRIVERS_DIR, 'presence_detector/driver.js'), 'utf8');
    assert.ok(!/monitored_devices:\s*\[\]/.test(drvSrc), 'monitored_devices default must be string, not []');
    assert.ok(drvSrc.includes('safeAction') && drvSrc.includes('safeCondition'));
  });

  it('UnifiedLightBase wires EstimatedEnergyCaps and capability-coherence Category A stays <= 15', () => {
    const lightSrc = fs.readFileSync(path.join(ROOT, 'lib/devices/UnifiedLightBase.js'), 'utf8');
    assert.ok(lightSrc.includes('EstimatedEnergyCaps'), 'UnifiedLightBase must wire EstimatedEnergyCaps');
    const audit = require('../../scripts/ci/capability-coherence-audit').run(ROOT);
    assert.ok(audit.A.length <= 15, `expected Category A <= 15, got ${audit.A.length}: ${audit.A.join(', ')}`);
  });
});
