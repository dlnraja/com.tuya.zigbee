'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeSacredCouple,
  extractCouplesFromText,
  toClassicOem,
} = require('../../tools/ci/sacred-couple-pair');
const { inferFromZ2mText, resolveMarketDriver } = require('../../tools/ci/market-driver-infer');
const { lookup, isForbiddenDriver } = require('../../lib/pairing/UserMisattributionRegistry');

describe('sacred-couple-pair (P2231)', () => {
  it('accepts Blakadder-style Tongou couple with classic OEM casing', () => {
    const c = normalizeSacredCouple('_TZE284_6OCNQLHN', 'TS0601');
    assert.ok(c);
    assert.equal(c.mfr, '_TZE284_6ocnqlhn');
    assert.equal(c.pid, 'TS0601');
  });

  it('rejects invented pid ts0601_rcbo', () => {
    assert.equal(normalizeSacredCouple('_TZE284_6ocnqlhn', 'ts0601_rcbo'), null);
  });

  it('rejects ZHA truncated non-TS pid', () => {
    assert.equal(normalizeSacredCouple('_TYST11_jeaxp72v', 'eaxp72v'), null);
  });

  it('extracts Manufacturer/Model and plus-form couples', () => {
    const text = 'Manufacturer: _TZE284_6ocnqlhn Model: TS0601\nAlso _TZ3000_zgyzgdua+TS0044';
    const pairs = extractCouplesFromText(text);
    assert.ok(pairs.some((p) => p.mfr === '_TZE284_6ocnqlhn' && p.pid === 'TS0601'));
    assert.ok(pairs.some((p) => p.mfr === '_TZ3000_zgyzgdua' && p.pid === 'TS0044'));
  });

  it('Tongou registry forbids smart_rcbo route hint', () => {
    const reg = lookup('_TZE284_6ocnqlhn', 'TS0601');
    assert.ok(reg);
    assert.equal(reg.canonicalDriver, 'din_rail_meter');
    assert.ok(isForbiddenDriver('_TZE284_6ocnqlhn', 'TS0601', 'smart_rcbo'));
  });

  it('toClassicOem lowers suffix', () => {
    assert.equal(toClassicOem('_TZ3000_B7BXOJRG'), '_TZ3000_b7bxojrg');
  });

  it('accepts exotic HOBEIAN + ZG modelId', () => {
    const c = normalizeSacredCouple('HOBEIAN', 'ZG-204ZL');
    assert.ok(c);
    assert.equal(c.mfr, 'HOBEIAN');
    assert.equal(c.pid, 'ZG-204ZL');
  });
});

describe('market-driver-infer (P2231)', () => {
  it('does not map water valve TS0202 to motion_sensor', () => {
    const d = inferFromZ2mText('Zigbee smart water valve', 'ZVG1', 'TS0202');
    assert.equal(d, 'smart_irrigation_valve');
  });

  it('maps NEO water leak from Z2M description', () => {
    const d = inferFromZ2mText('Water leak sensor', 'TS0601_water_sensor', 'TS0601');
    assert.equal(d, 'water_leak_sensor');
  });

  it('does not treat Floodlight as flood sensor', () => {
    const d = inferFromZ2mText('Ridley Floodlight', 'SMFL20W-ZB', 'TS0501B');
    assert.equal(d, 'bulb_dimmable');
  });

  it('maps LED controller to bulb_dimmable', () => {
    const d = inferFromZ2mText('Single color LED controller', 'FUT036Z', 'TS0501B');
    assert.equal(d, 'bulb_dimmable');
  });

  it('prefers gang switch over socket when both present', () => {
    const d = inferFromZ2mText('4 gang switch module with neutral wire and socket', 'TS0006_1', 'TS0006');
    assert.equal(d, 'switch_4gang');
  });

  it('maps 1 gang switch module — not 4gang from TS0004 alone', () => {
    const d = inferFromZ2mText('1 gang switch module', '_TZ3000_pgq7ormg', 'TS0004');
    assert.equal(d, 'switch_1gang');
  });

  it('resolveMarketDriver: Tongou is apply-safe din_rail_meter', () => {
    const r = resolveMarketDriver('_TZE284_6ocnqlhn', 'TS0601');
    assert.equal(r.driver, 'din_rail_meter');
    assert.equal(r.applySafe, true);
  });

  it('resolveMarketDriver: productId_default alone is NOT apply-safe', () => {
    const r = resolveMarketDriver('_TZ3000_B7BXOJRG', 'TS0044');
    // May get z2m_desc if in index, or pid_default — pid_default must not be applySafe
    if (r.tier === 'pid_default') {
      assert.equal(r.applySafe, false);
    }
  });

  it('resolveMarketDriver: Z2M water valve overrides motion default', () => {
    const r = resolveMarketDriver('_TZ3000_mwd3c2at', 'TS0202');
    assert.equal(r.driver, 'smart_irrigation_valve');
    assert.equal(r.applySafe, true);
    assert.equal(r.tier, 'z2m_desc');
  });

  it('resolveMarketDriver: device-truth lock is apply-safe', () => {
    const r = resolveMarketDriver('_TZE284_hodyryli', 'TS0601');
    assert.equal(r.driver, 'climate_sensor_zt08');
    assert.equal(r.applySafe, true);
    assert.ok(['device_truth', 'registry', 'exact'].includes(r.tier));
  });

  it('soft heuristic never marks applySafe', () => {
    const r = resolveMarketDriver('_TZ3000_zzheuristicxx', 'TS0601');
    if (/heuristic_/.test(r.tier)) {
      assert.equal(r.applySafe, false);
      assert.ok(r.driver);
    } else {
      assert.equal(r.applySafe, false);
    }
  });

  it('TUYA_FP_HEURISTIC=0 disables soft matcher', () => {
    const prev = process.env.TUYA_FP_HEURISTIC;
    process.env.TUYA_FP_HEURISTIC = '0';
    try {
      const { softHeuristicHint } = require('../../tools/ci/market-driver-infer');
      const noop = () => false;
      assert.equal(softHeuristicHint('_TZ3000_zzheuristicxx', 'TS0601', noop), null);
    } finally {
      if (prev === undefined) delete process.env.TUYA_FP_HEURISTIC;
      else process.env.TUYA_FP_HEURISTIC = prev;
    }
  });
});
