'use strict';
/**
 * P2335 — Salvagr #533 residual + diag-resolver couple lock + MVM TZE284
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');

describe('P2335 salvagr curtain + resolver couple lock', () => {
  it('curtain_motor compose still Moes EF00 clusters (P2329)', () => {
    const c = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/curtain_motor/driver.compose.json'), 'utf8'));
    const clusters = c.zigbee.endpoints['1'].clusters.map(Number).sort((a, b) => a - b);
    assert.deepEqual(clusters, [0, 4, 5, 61184]);
  });

  it('MVM TZE204/TZE284 curtain uses interview clusters (not legacy ZCL 6/258)', () => {
    const MVM = require(path.join(ROOT, 'lib/ManufacturerVariationManager'));
    const cfg204 = MVM._getCurtainMotorConfig('_TZE204_5slehgeo', 'TS0601');
    const cfg284 = MVM._getCurtainMotorConfig('_TZE284_5slehgeo', 'TS0601');
    assert.deepEqual(cfg204.endpoints[1].clusters.slice().sort((a, b) => a - b), [0, 4, 5, 61184]);
    assert.deepEqual(cfg284.endpoints[1].clusters.slice().sort((a, b) => a - b), [0, 4, 5, 61184]);
    assert.strictEqual(cfg204.protocol, 'tuya_dp');
    assert.strictEqual(cfg284.protocol, 'tuya_dp');
  });

  it('diag-resolver prefers DeviceFingerprintDB couple over mfr spray', () => {
    const { resolveDriversForFp, buildIdx } = require(path.join(ROOT, '.github/scripts/diagnostic-auto-resolver.js'));
    const idx = buildIdx();
    const drivers = resolveDriversForFp('_TZE204_5slehgeo', ['TS0601'], idx);
    assert.deepEqual(drivers, ['curtain_motor']);
  });

  it('radiator valve compose does not steal 5slehgeo', () => {
    const c = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/device_radiator_valve/driver.compose.json'), 'utf8'));
    assert.ok(!(c.zigbee.manufacturerName || []).some((m) => /5slehgeo/i.test(m)));
  });
});
