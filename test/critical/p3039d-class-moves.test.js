'use strict';
// P3039d: one couple, one driver. Wrong-class hosts give their exact couple to the driver of the
// device's real class (source: zigbee-herdsman-converters tuya.ts). Moves only: every couple stays
// recognised, P3024b baseline keeps 0 missing (simulated on the compacted publish manifest).
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { decode } = require('../../lib/tuya/TuyaDpProfileCodec');

const ROOT = path.resolve(__dirname, '../..');
const compose = (id) => JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', id, 'driver.compose.json'), 'utf8'));
const has = (c, mfr) => c.zigbee.manufacturerName.some((m) => m.toLowerCase() === mfr.toLowerCase());

describe('P3039d class moves', () => {
  it('ME168 AVATTO TRV _TZE200_cxakecfo lives on device_radiator_valve, not on sensor_climate_contact', () => {
    const trv = compose('device_radiator_valve');
    assert.ok(trv.zigbee.manufacturerName.includes('_TZE200_cxakecfo'));
    assert.ok(trv.zigbee.productId.includes('TS0601'));
    assert.ok(!has(compose('sensor_climate_contact'), '_TZE200_cxakecfo'));
  });
  it('DCR-CO _TZE200/_TZE204_7bztmfm1 + TS0601 lives on co_sensor_dcr_co', () => {
    const co = compose('co_sensor_dcr_co');
    for (const m of ['_TZE200_7bztmfm1', '_TZE204_7bztmfm1']) assert.ok(co.zigbee.manufacturerName.includes(m), m);
    assert.deepStrictEqual(co.zigbee.productId, ['TS0601']);
    assert.ok(/zigbee-herdsman-converters/.test(co.metadata.source));
    for (const ep of Object.values(co.zigbee.endpoints || {})) {
      assert.ok(!(ep.clusters || []).includes(61184));
      assert.ok(!(ep.bindings || []).includes(61184));
    }
  });
  it('device_air_purifier_plug keeps its manufacturers (other couples) but no longer claims TS0601', () => {
    const p = compose('device_air_purifier_plug');
    assert.ok(has(p, '_TZE200_7bztmfm1'));
    assert.ok(!p.zigbee.productId.includes('TS0601'));
  });
  it('DCR-CO DP1 raw 0 means CO detected, DP2 is ppm/100', () => {
    assert.strictEqual(decode({ kind: 'inSet', set: [0] }, 0), true);
    assert.strictEqual(decode({ kind: 'inSet', set: [0] }, 1), false);
    assert.strictEqual(decode({ kind: 'value', divisor: 100 }, 1250), 12.5);
  });
});
