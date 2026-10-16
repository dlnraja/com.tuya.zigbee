'use strict';

/**
 * P2835 Contre quoi: official Zemismart Homey app / ZHA quirks couples
 * must not live on climate_sensor / TRV / air_purifier; screen+dimmer+cover UNION.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function compose(driver) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', driver, 'driver.compose.json'), 'utf8'));
}

function hasSuffix(driver, suffix) {
  const mfrs = compose(driver).zigbee?.manufacturerName || [];
  return mfrs.some((m) => String(m).toLowerCase().includes(String(suffix).toLowerCase()));
}

function hasPid(driver, pid) {
  const pids = compose(driver).zigbee?.productId || [];
  return pids.some((p) => String(p).toUpperCase() === String(pid).toUpperCase());
}

describe('P2835 Zemismart official complementary', () => {
  it('script + report exist', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'tools/ci/p2835-zemismart-official-complementary.js')));
    assert.ok(fs.existsSync(path.join(ROOT, 'reports/zemismart-official-2026-10-16/drivers-public.json')));
  });

  it('Contre quoi: ZMS-206/208 screen mfrs not on climate_sensor', () => {
    for (const s of ['3ctwoaip', 'y4jqpry8', 'e4pf6l87', 'xvywzhmi', 'lnyz4a6v']) {
      assert.equal(hasSuffix('climate_sensor', s), false, `${s} must leave climate_sensor`);
    }
  });

  it('Contre quoi: lnyz4a6v not on air_purifier_plug; o409r73p not curtain; zm8zpwas not TRV', () => {
    assert.equal(hasSuffix('device_air_purifier_plug', 'lnyz4a6v'), false);
    assert.equal(hasSuffix('curtain_motor', 'o409r73p'), false);
    assert.equal(hasSuffix('device_radiator_valve', 'zm8zpwas'), false);
  });

  it('UNION: ZMD-206 dimmers + ZMS screen + ZM16B/ZPS-Z1 on correct drivers', () => {
    assert.ok(hasSuffix('dimmer_1_gang_tuya', '5aico93l'));
    assert.ok(hasSuffix('dimmer_2_gang_tuya', 'pyh4zt7w'));
    assert.ok(hasSuffix('dimmer_3gang', 'k9e7ihec'));
    assert.ok(hasSuffix('wall_switch_1_gang_tuya', 'lnyz4a6v'));
    assert.ok(hasSuffix('switch_2gang', 'a2teqi5u') || hasSuffix('switch_2gang', 'dmckrsxg'));
    assert.ok(hasSuffix('switch_2gang', 'o409r73p'));
    assert.ok(hasSuffix('switch_3gang', 'e4pf6l87'));
    assert.ok(hasSuffix('switch_4gang', 'y4jqpry8') || hasSuffix('switch_4gang', 'xibaabmu'));
    assert.ok(hasSuffix('curtain_motor', '3mzb0sdz'));
    assert.ok(hasSuffix('curtain_motor', 'cirjrpxe'));
    assert.ok(hasPid('curtain_motor', 'TS0301'));
    assert.ok(hasSuffix('presence_sensor_radar', 'ft7qqpx3'));
    assert.ok(hasSuffix('water_valve_smart', 'vuwtqx0t') || hasSuffix('water_valve_smart', 'zm8zpwas'));
  });

  it('P2834 brand merge knows official Zemismart suffixes', () => {
    const { detectBrand } = require(path.join(ROOT, 'lib/protocol/MoesZemismartActionMerge.js'));
    assert.equal(detectBrand('_TZE284_5aico93l'), 'zemismart');
    assert.equal(detectBrand('_TZE284_ft7qqpx3'), 'zemismart');
    assert.equal(detectBrand('_TZE200_cirjrpxe'), 'zemismart');
  });
});
