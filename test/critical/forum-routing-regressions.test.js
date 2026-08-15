'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function includesCI(values = [], expected) {
  const target = String(expected).toLowerCase();
  return values.map(value => String(value).toLowerCase()).includes(target);
}

function appDriver(driverId) {
  const driver = readJson('app.json').drivers.find(item => item.id === driverId);
  assert(driver, `Missing app.json driver ${driverId}`);
  return driver;
}

function composeDriver(driverId) {
  return readJson(path.join('drivers', driverId, 'driver.compose.json'));
}

function assertDriverClaims(driverId, manufacturerName) {
  for (const source of [appDriver(driverId), composeDriver(driverId)]) {
    assert(includesCI(source.zigbee?.manufacturerName, manufacturerName), `${driverId} must claim ${manufacturerName}`);
  }
}

function assertDriverDoesNotClaim(driverId, manufacturerName) {
  for (const source of [appDriver(driverId), composeDriver(driverId)]) {
    assert(!includesCI(source.zigbee?.manufacturerName, manufacturerName), `${driverId} must not claim ${manufacturerName}`);
  }
}

function assertDriverHasNoProductId(driverId, productId) {
  for (const source of [appDriver(driverId), composeDriver(driverId)]) {
    assert(!includesCI(source.zigbee?.productId, productId), `${driverId} must not claim ${productId} without an exact manufacturer`);
  }
}

function assertDriverHasProductId(driverId, productId) {
  for (const source of [appDriver(driverId), composeDriver(driverId)]) {
    assert(includesCI(source.zigbee?.productId, productId), `${driverId} must claim productId ${productId}`);
  }
}

function assertFingerprint(file, manufacturerName, driverId) {
  const fingerprints = readJson(file);
  const entry = fingerprints[manufacturerName] ||
    Object.entries(fingerprints).find(([key]) => key.toLowerCase() === manufacturerName.toLowerCase())?.[1];
  assert(entry, `${file} missing ${manufacturerName}`);
  assert.strictEqual(entry.driverId, driverId, `${file} must route ${manufacturerName} to ${driverId}`);
}

describe('forum routing regressions', () => {
  it('routes TS0044 _TZ3000_u3nv1jwk to the E000-capable 4-button driver only', () => {
    assertDriverClaims('button_wireless_4', '_TZ3000_u3nv1jwk');
    assertDriverDoesNotClaim('switch_1gang', '_TZ3000_u3nv1jwk');
    assertDriverDoesNotClaim('remote_button_wireless_handheld', '_TZ3000_u3nv1jwk');
    assertDriverHasNoProductId('remote_button_wireless_handheld', 'TS0044');

    assertFingerprint('data/fingerprints.json', '_TZ3000_u3nv1jwk', 'button_wireless_4');
    assertFingerprint('lib/tuya/fingerprints.json', '_TZ3000_u3nv1jwk', 'button_wireless_4');

    const source = read('drivers/button_wireless_4/device.js');
    assert.match(source, /_setupE000Detection/);
    assert.match(source, /_setupTuyaDPButtonDetection/);
    assert.match(source, /_decodeRawFrameArgs/);
    assert.match(source, /orig\(\.\.\.args\)/);
  });

  it('routes Moes/Lidl TS004F physical button variants to transport-aware drivers', () => {
    const fourButtonManufacturers = [
      '_TZ3000_kfu8zapd',
      '_TZ3000_xabckq1v',
      '_TZ3000_czuyt8lz',
      '_TZ3000_b3mgfu0d',
      '_TZ3000_rco1yzb1',
      '_TZ3000_abrsvsou',
      '_TZ3000_4fjiwweb',
    ];
    const rotaryManufacturers = [
      '_TZ3000_qja6nq5z',
      '_TZ3000_gwkzibhs',
      '_TZ3000_ugi8ky6u',
    ];

    for (const manufacturer of fourButtonManufacturers) {
      assertDriverClaims('button_wireless_4', manufacturer);
      const DeviceFingerprintDB = require('../../lib/DeviceFingerprintDB');
      const profile = DeviceFingerprintDB.lookup(manufacturer, 'TS004F');
      assert.strictEqual(profile.driver, 'button_wireless_4', `${manufacturer} must use button_wireless_4 for TS004F`);
    }
    assertDriverDoesNotClaim('button_wireless_2', '_TZ3000_b3mgfu0d');
    assertDriverDoesNotClaim('smart_remote_1_button', '_TZ3000_rco1yzb1');

    for (const manufacturer of rotaryManufacturers) {
      assertDriverClaims('smart_knob_rotary', manufacturer);
      assertDriverDoesNotClaim('button_wireless_4', manufacturer);
      assertDriverDoesNotClaim('button_wireless', manufacturer);
      const DeviceFingerprintDB = require('../../lib/DeviceFingerprintDB');
      const profile = DeviceFingerprintDB.lookup(manufacturer, 'TS004F');
      assert.strictEqual(profile.driver, 'smart_knob_rotary', `${manufacturer} must use smart_knob_rotary for TS004F`);
    }

    const compose = composeDriver('button_wireless_4');
    for (const [endpointId, endpoint] of Object.entries(compose.zigbee.endpoints)) {
      assert(endpoint.clusters.includes(8), `endpoint ${endpointId} must include LevelControl cluster 0x0008`);
    }

    const source = read('drivers/button_wireless_4/device.js');
    assert.match(source, /_setupLevelControlDetection/);
    assert.match(source, /commandStep/);
    assert.match(source, /commandMove/);
    assert.match(source, /commandStop/);

    const UnifiedBatteryHandler = require('../../lib/battery/UnifiedBatteryHandler');
    for (const manufacturer of [...fourButtonManufacturers, ...rotaryManufacturers]) {
      const profile = UnifiedBatteryHandler.lookupBatteryProfile(manufacturer, 'TS004F');
      assert.strictEqual(profile.zcl200IsPercent, true, `${manufacturer} should treat ZCL 200 as 100%`);
      assert.strictEqual(
        UnifiedBatteryHandler.normalizeZigbeeValue(200, {
          manufacturer,
          batteryType: profile.chemistry,
          treat200AsSentinel: !profile.zcl200IsPercent,
        }),
        100
      );
    }
  });

  it('routes recent Johan activity fingerprints to their functional drivers', () => {
    const routes = [
      ['_TZ3000_ovyaisip', 'TS0001', 'wall_switch_1gang_1way'],
      ['_TZ3000_pk8tgtdb', 'TS0001', 'wall_switch_1gang_1way'],
      ['_TZ3000_yervjnlj', 'TS0003', 'wall_switch_3gang_1way'],
      ['_TZ3000_eqsair32', 'TS0003', 'switch_3gang'],
      ['_TZ3000_qxcnwv26', 'TS0003', 'switch_3gang'],
      ['_TZE204_q76rtoa9', 'TS0601', 'siren'],
      ['_TZE200_lvkk0hdg', 'TS0601', 'water_tank_monitor'],
      ['_TZE204_r0jdjrvi', 'TS0601', 'curtain_motor_tilt'],
      ['_TZE200_cirvgep4', 'TS0601', 'climate_sensor'],
      ['_TZE204_cirvgep4', 'TS0601', 'climate_sensor'],
      ['_TZ3000_kaflzta4', 'TS004F', 'smart_knob'],
    ];

    const RuntimeFingerprintDB = require('../../lib/tuya/DeviceFingerprintDB');
    const CompoundFingerprintDB = require('../../lib/DeviceFingerprintDB');

    for (const [manufacturer, modelId, driverId] of routes) {
      assertDriverClaims(driverId, manufacturer);
      assert.strictEqual(
        CompoundFingerprintDB.lookup(manufacturer, modelId)?.driver,
        driverId,
        `${manufacturer}+${modelId} must have an exact compound route`
      );
      assert.strictEqual(
        RuntimeFingerprintDB.getDriverId(manufacturer, modelId),
        driverId,
        `${manufacturer}+${modelId} must resolve to ${driverId}`
      );
    }

    for (const manufacturer of ['_TZ3000_ovyaisip', '_TZ3000_pk8tgtdb', '_TZ3000_yervjnlj', '_TZ3000_kaflzta4']) {
      assertDriverDoesNotClaim('climate_sensor', manufacturer);
    }
    assertDriverDoesNotClaim('air_purifier', '_TZE200_cirvgep4');
    assertDriverDoesNotClaim('air_purifier', '_TZE204_cirvgep4');
    assertDriverDoesNotClaim('generic_diy', '_TZE200_lvkk0hdg');
    assertDriverDoesNotClaim('presence_sensor_radar', '_TZE204_r0jdjrvi');
    assertDriverDoesNotClaim('button_wireless_4', '_TZ3000_kaflzta4');
  });

  it('routes Nedis ne4pikwm radiator valves to TRV handling, not climate fallback', () => {
    for (const manufacturer of ['_TZE284_ne4pikwm', '_TZE200_ne4pikwm']) {
      assertDriverClaims('radiator_valve', manufacturer);
      assertDriverDoesNotClaim('climate_sensor', manufacturer);
      assertFingerprint('data/fingerprints.json', manufacturer, 'radiator_valve');
      assertFingerprint('lib/tuya/fingerprints.json', manufacturer, 'radiator_valve');

      const DeviceFingerprintDB = require('../../lib/DeviceFingerprintDB');
      const profile = DeviceFingerprintDB.lookup(manufacturer, 'TS0601');
      assert(profile, `${manufacturer} must have a compound fingerprint`);
      assert.strictEqual(profile.driver, 'radiator_valve');
      assert.strictEqual(DeviceFingerprintDB.getDPMeaning(manufacturer, 'TS0601', 16).capability, 'target_temperature');
    }

    const source = read('drivers/radiator_valve/device.js');
    assert(source.indexOf('const nedisIds') < source.indexOf('const me167Ids'), 'Nedis must be matched before ME167');
    assert.doesNotMatch(source, /includesCI\(me167Ids, id\)/);
  });

  it('routes latest Homey forum reports away from stale generated fallbacks', () => {
    const RuntimeFingerprintDB = require('../../lib/tuya/DeviceFingerprintDB');
    const CompoundFingerprintDB = require('../../lib/DeviceFingerprintDB');

    assertDriverClaims('light_sensor_outdoor', '_TZE284_aaeasoll');
    assertDriverDoesNotClaim('climate_sensor', '_TZE284_aaeasoll');
    assertFingerprint('data/fingerprints.json', '_TZE284_aaeasoll', 'light_sensor_outdoor');
    assertFingerprint('lib/tuya/fingerprints.json', '_TZE284_aaeasoll', 'light_sensor_outdoor');
    assert.strictEqual(CompoundFingerprintDB.lookup('_TZE284_aaeasoll', 'TS0601')?.driver, 'light_sensor_outdoor');
    assert.strictEqual(RuntimeFingerprintDB.getDriverId('_TZE284_aaeasoll', 'TS0601'), 'light_sensor_outdoor');

    for (const manufacturer of ['_TZE284_fhvpaltk', '_TZE284_eaet5qt5']) {
      assertDriverClaims('valve_dual_irrigation', manufacturer);
      assertDriverDoesNotClaim('valve_irrigation', manufacturer);
      assertDriverDoesNotClaim('curtain_motor', manufacturer);
      assertFingerprint('data/fingerprints.json', manufacturer, 'valve_dual_irrigation');
      assertFingerprint('lib/tuya/fingerprints.json', manufacturer, 'valve_dual_irrigation');
      assert.strictEqual(CompoundFingerprintDB.lookup(manufacturer, 'TS0601')?.driver, 'valve_dual_irrigation');
      assert.strictEqual(RuntimeFingerprintDB.getDriverId(manufacturer, 'TS0601'), 'valve_dual_irrigation');
    }

    assertDriverClaims('soil_sensor', '_TZE200_npj9bug3');
    assertDriverDoesNotClaim('climate_sensor', '_TZE200_npj9bug3');
    assertDriverDoesNotClaim('curtain_motor', '_TZE200_npj9bug3');
    assertFingerprint('data/fingerprints.json', '_TZE200_npj9bug3', 'soil_sensor');
    assertFingerprint('lib/tuya/fingerprints.json', '_TZE200_npj9bug3', 'soil_sensor');
    assert.strictEqual(CompoundFingerprintDB.lookup('_TZE200_npj9bug3', 'TS0601')?.driver, 'soil_sensor');
    assert.strictEqual(CompoundFingerprintDB.getDPMeaning('_TZE200_npj9bug3', 'TS0601', 111).capability, 'measure_humidity.soil');
    assert.strictEqual(RuntimeFingerprintDB.getDriverId('_TZE200_npj9bug3', 'TS0601'), 'soil_sensor');

    assertDriverHasProductId('water_leak_sensor', 'ZG-222Z');
    assertDriverHasNoProductId('rain_sensor', 'ZG-222Z');
    assert.strictEqual(CompoundFingerprintDB.lookup('HOBEIAN', 'ZG-222Z')?.driver, 'water_leak_sensor');
    assert.strictEqual(RuntimeFingerprintDB.getDriverId('HOBEIAN', 'ZG-222Z'), 'water_leak_sensor');

    for (const manufacturer of ['_TZE204_rzdkn5rx', '_TZE28C100000_rzdkn5rx', '_TZE28C1000000_rzdkn5rx']) {
      assertDriverClaims('boiler_switch_energy', manufacturer);
      assertDriverDoesNotClaim('switch_1gang', manufacturer);
      assertDriverDoesNotClaim('generic_tuya', manufacturer);
      assertFingerprint('data/fingerprints.json', manufacturer, 'boiler_switch_energy');
      assertFingerprint('lib/tuya/fingerprints.json', manufacturer, 'boiler_switch_energy');
      assert.strictEqual(CompoundFingerprintDB.lookup(manufacturer, 'TS0601')?.driver, 'boiler_switch_energy');
      assert.strictEqual(RuntimeFingerprintDB.getDriverId(manufacturer, 'TS0601'), 'boiler_switch_energy');
      assert.strictEqual(CompoundFingerprintDB.getDPMeaning(manufacturer, 'TS0601', 1).capability, 'onoff');
    }
    const boilerCompose = composeDriver('boiler_switch_energy');
    assert(!boilerCompose.capabilities.includes('measure_battery'), 'boiler switch must not expose a phantom battery');
    assert(!boilerCompose.energy?.batteries, 'boiler switch must not publish static battery metadata');
    assert.match(read('drivers/boiler_switch_energy/device.js'), /initVirtualButtons/);
    assert.match(read('drivers/boiler_switch_energy/device.js'), /this\._initializing = true[\s\S]+this\._initialized = true[\s\S]+finally/);

    assertDriverHasProductId('motion_sensor', 'SNZB-03');
    assert.strictEqual(CompoundFingerprintDB.lookup('eWeLink', 'SNZB-03')?.driver, 'motion_sensor');
    assert.strictEqual(RuntimeFingerprintDB.getDriverId('eWeLink', 'SNZB-03'), 'motion_sensor');
  });

  it('uses the ZCL illuminance conversion formula consistently', () => {
    const { zclMeasuredValueToLux } = require('../../lib/utils/tuyaUtils');

    assert.strictEqual(zclMeasuredValueToLux(0), 0);
    assert.strictEqual(zclMeasuredValueToLux(1), 1); // linear Tuya quirk
    assert.strictEqual(zclMeasuredValueToLux(155), 155); // #2134 linear lux
    assert.strictEqual(zclMeasuredValueToLux(10001), 10);
    assert.strictEqual(zclMeasuredValueToLux(20001), 100);
    assert.strictEqual(zclMeasuredValueToLux(30001), 1000);
    assert.strictEqual(zclMeasuredValueToLux(0xFFFF), 0);

    assert.match(read('drivers/light_sensor_outdoor/device.js'), /zclMeasuredValueToLux/);
    assert.match(read('lib/adapters/ZclToHomeyMap.js'), /zclMeasuredValueToLux/);
    assert.match(read('.github/scripts/athom-build-error-diag.js'), /createCDPSession/);
    assert.doesNotMatch(read('drivers/light_sensor_outdoor/device.js'), /val - 1 \* 10000/);
  });

  it('routes forum #2135 Avatto ZDMS16-2 away from climate and clamps MCU brightness', () => {
    const { toTuyaBrightness, fromTuyaBrightness } = require('../../lib/tuya/TuyaBrightnessScale');
    const compose = composeDriver('dimmer_2_gang_tuya');

    for (const manufacturer of ['_TZE28C1000000_jtbgusdc', '_TZE204_jtbgusdc', '_TZE204_fjms2pi9']) {
      assert(includesCI(compose.zigbee?.manufacturerName, manufacturer), `dimmer_2_gang_tuya must claim ${manufacturer}`);
    }
    assertDriverDoesNotClaim('climate_sensor', '_TZE28C1000000_jtbgusdc');
    assertDriverDoesNotClaim('climate_sensor', '_TZE204_fjms2pi9');
    // Switch wall 6gang ownership — auto-fix-all/Blakadder must NOT rehome into climate
    assertDriverDoesNotClaim('climate_sensor', '_TZE200_8eazvzo6');
    assertDriverDoesNotClaim('climate_sensor', '_tze200_8eazvzo6');
    assert(includesCI(composeDriver('switch_wall_6gang').zigbee?.manufacturerName, '_TZE200_8eazvzo6'),
      'switch_wall_6gang must own _TZE200_8eazvzo6');
    // Forum #2133 PresentSky BSEED dimmer — must stay on wall_dimmer_tuya
    assert(includesCI(composeDriver('wall_dimmer_tuya').zigbee?.manufacturerName, '_TZE284_m1cvyneb'),
      'wall_dimmer_tuya must own _TZE284_m1cvyneb');
    assertDriverDoesNotClaim('climate_sensor', '_TZE284_m1cvyneb');
    // Forum T26439 #5491 / Z2M SGS02Z soil — must not stay on climate catch-all
    assert(includesCI(composeDriver('soil_sensor').zigbee?.manufacturerName, '_TZE284_nt4pquef'),
      'soil_sensor must own _TZE284_nt4pquef');
    assertDriverDoesNotClaim('climate_sensor', '_TZE284_nt4pquef');
    // Forum #2130 Kanbros BSEED TS0002 — ZCL-only so both gangs work
    assert.match(read('drivers/switch_2gang/device.js'), /_TZ3000_w5xztuy7/);
    assert(includesCI(composeDriver('switch_2gang').zigbee?.manufacturerName, '_TZ3000_w5xztuy7'),
      'switch_2gang must own _TZ3000_w5xztuy7');
    // Forum #2129 Welshsmarthome Scolmore — image OCR: _TYZB01_hlla45kx + TS011F
    assert(includesCI(composeDriver('double_power_point_2').zigbee?.manufacturerName, '_TYZB01_hlla45kx'),
      'double_power_point_2 must own _TYZB01_hlla45kx');
    assert(!compose.capabilities.includes('measure_battery'), 'Avatto 2ch dimmer is mains — no phantom battery');
    assert(!compose.energy?.batteries, 'Avatto 2ch dimmer must not publish CR2032 metadata');
    // Forum #2069: UNSUPPORTED_CLUSTER when Homey binds ZCL levelControl (8) on Tuya EF00 dimmers
    const clusters = compose.zigbee?.endpoints?.['1']?.clusters || [];
    assert.ok(clusters.includes(61184), 'EF00 required');
    assert.ok(!clusters.includes(6) && !clusters.includes(8), 'no ZCL onOff/levelControl on EF00-only dimmer');
    assert.match(read('lib/zigbee/CapabilityCommandRouter.js'), /writeCapabilityWithFallbacks/);
    assert.match(read('lib/zigbee/CapabilityCommandRouter.js'), /parallelDiscover/);

    assert.strictEqual(toTuyaBrightness(1), 1000);
    assert.strictEqual(toTuyaBrightness(1.2), 1000);
    assert.strictEqual(toTuyaBrightness(-1), 0);
    assert.ok(toTuyaBrightness(1) <= 1000, 'Z2M #32305 MCU reboot if brightness > 1000');
    assert.strictEqual(fromTuyaBrightness(1000), 1);
    assert.strictEqual(fromTuyaBrightness(2000), 1);

    const source = read('drivers/dimmer_2_gang_tuya/device.js');
    assert.match(source, /toTuyaBrightness/);
    assert.match(source, /fromTuyaBrightness/);
    assert.match(source, /get mainsPowered\(\) \{ return true; \}/);
  });

  it('routes forum rain/contact sacred couples without collisions', () => {
    // compose is source of truth before app.json regenerate
    assert(includesCI(composeDriver('rain_sensor').zigbee?.manufacturerName, '_TZE200_u6x1zyv2'));
    assert(!includesCI(composeDriver('contact_sensor').zigbee?.manufacturerName, '_TZE200_u6x1zyv2'));
    assert(!includesCI(composeDriver('sensor_contact_rain').zigbee?.manufacturerName, '_TZE200_u6x1zyv2'));
    assert(includesCI(composeDriver('contact_sensor').zigbee?.manufacturerName, '_TZE200_pay2byax'));
    assert(!includesCI(composeDriver('soil_sensor').zigbee?.manufacturerName, '_TZE200_pay2byax'));
  });

  it('uses exact manufacturerName+deviceId routes before mfr-only fingerprint catalogs', () => {
    const runtimeDb = require('../../lib/tuya/DeviceFingerprintDB');

    assert.strictEqual(runtimeDb.getDriverId('_TZ3000_kfu8zapd', 'TS004F'), 'button_wireless_4');
    assert.strictEqual(runtimeDb.getDriverId('_TZ3000_mrduubod', 'TS0014'), 'wall_switch_4gang_1way');
    assert.strictEqual(runtimeDb.getDriverId('_TZ3002_pzao9ls1', 'TS0726'), 'wall_switch_4gang_1way');
    assert.strictEqual(runtimeDb.getDriverId('_TZE200_8ygsuhe1', 'TS0601'), 'air_quality_comprehensive');

    const switchProfile = runtimeDb.getFingerprint('_TZ3000_mrduubod', 'TS0014');
    assert.strictEqual(switchProfile.driverId, 'wall_switch_4gang_1way');
    assert.strictEqual(switchProfile.powerSource, 'mains');
    assert.deepStrictEqual(switchProfile.modelIds, ['TS0014']);

    const profile = runtimeDb.getFingerprint('_TZE200_8ygsuhe1', 'TS0601');
    assert.strictEqual(profile.driverId, 'air_quality_comprehensive');
    assert.deepStrictEqual(profile.modelIds, ['TS0601']);
  });

  it('guards delayed DCM audit and IAS zoneId 10 (Gmail/Peter #2134)', () => {
    const base = read('lib/devices/BaseUnifiedDevice.js');
    assert.match(base, /typeof dcm\.auditCapabilities === 'function'/);

    const dynDcm = read('lib/dynamic/DynamicCapabilityManager.js');
    assert.match(dynDcm, /async auditCapabilities\s*\(/);

    const sos = read('drivers/button_emergency_sos/device.js');
    assert.match(sos, /zoneId:\s*10/);
    assert.match(sos, /Ignoring non-alarm zoneStatus/);
    assert.match(sos, /isZero/);
    assert.doesNotMatch(sos, /return this\.homey\?\.zigbee\?\.ieeeAddress \|\| '00:00:00:00:00:00:00:00'/);

    const sensor = read('lib/devices/UnifiedSensorBase.js');
    assert.match(sensor, /zoneId:\s*10/);
    assert.doesNotMatch(sensor, /fullEnrollmentFlow\(\{\s*zoneId:\s*1\b/);
    assert.doesNotMatch(sensor, /zoneId:\s*0\b/);
    assert.match(sensor, /_decodeIlluminanceRaw/);

    const retry = read('lib/tuya/TuyaZigbeeDevice.js');
    assert.match(retry, /iasCIEAddress:\s*cie/);
    assert.match(retry, /zoneId:\s*10/);
    assert.doesNotMatch(retry, /iasCieAddr:\s*cie/);
    assert.doesNotMatch(retry, /enrollResponse\(\{\s*enrollResponseCode:\s*0,\s*zoneId:\s*1\s*\}/);

    const sdk3 = read('lib/SDK3BestPractices.js');
    assert.match(sdk3, /zoneEnrollResponse\(\{\s*enrollResponseCode:\s*0,\s*zoneId:\s*10\s*\}\)/);
    assert.doesNotMatch(sdk3, /zoneEnrollResponse\(\{[^}]*zoneId:\s*0\b/);
    assert.doesNotMatch(sdk3, /return\s*\{\s*enrollResponseCode:\s*0,\s*zoneId:\s*0\s*\}/);

    const iasMgr = read('lib/managers/IASZoneManager.js');
    assert.match(iasMgr, /_iasOriginatedWaterAlarm\s*=\s*true/);
    assert.match(iasMgr, /alarm_tamper',\s*!!status\.tamper/);
    assert.match(iasMgr, /safeSetTimeout/);
    assert.doesNotMatch(iasMgr, /this\.homey\.setTimeout\(/);
    assert.doesNotMatch(iasMgr, /device\.homey\.setTimeout\(/);

    // Peter #2137 / UUID 634f7b19 — SOS sync no-op + .catch on undefined aborted init
    assert.match(sos, /async _registerButtonCapabilityListeners\(\)/);
    assert.match(retry, /Promise\.resolve\(this\._registerButtonCapabilityListeners\(\)\)/);

    // Alarm polarity — curated lists + setting + smart learn (SOS/contact/water)
    const polarity = read('lib/managers/AlarmPolarityManager.js');
    assert.match(polarity, /INVERTED_POLARITY/);
    assert.match(polarity, /NORMAL_POLARITY/);
    assert.match(polarity, /observeRaw/);
    assert.match(polarity, /alarm_polarity/);
    assert.match(sos, /applyPolarity\(this, rawAlarm, 'sos'\)/);
    assert.match(read('drivers/button_emergency_sos/driver.compose.json'), /"id": "alarm_polarity"/);
    assert.match(read('drivers/contact_sensor/driver.compose.json'), /"id": "alarm_polarity"/);
    assert.match(read('drivers/water_leak_sensor/driver.compose.json'), /"id": "alarm_polarity"/);

    const energy = read('lib/managers/SmartEnergyManager.js');
    assert.match(energy, /safeSetTimeout\(this\.device/);
    assert.match(energy, /safeClearTimeout\(this\.device/);
    assert.doesNotMatch(energy, /homey\?\.clearTimeout\s*\|\|\s*clearTimeout/);

    const contact = read('drivers/contact_sensor/device.js');
    // pay2byax inverted polarity lives in AlarmPolarityManager — not hardcoded here
    assert.match(polarity, /_TZE200_pay2byax/);
    assert.doesNotMatch(contact, /'_TZE200_pay2byax',\s*\/\/ DP1/);
    assert.doesNotMatch(contact, /debounce_time'\) \|\| safeParse.*,\s*1000\)/);
    assert.match(contact, /resolvePolarity\(this, 'contact'\)/);

    const btn = read('lib/devices/ButtonDevice.js');
    assert.match(btn, /_universalSceneModeSwitch\(zclNode\)/);
    assert.match(btn, /_reapplySceneModeOnWake/);

    const sleepy = read('lib/utils/SleepyDeviceInit.js');
    assert.match(sleepy, /zoneId:\s*10/);
    assert.doesNotMatch(sleepy, /zoneId:\s*23/);

    const diag = read('lib/diagnostics/DiagnosticLogsCollector.js');
    assert.match(diag, /typeof desc\.get === 'function'/);

    // Forum #2131 TBoy — relay must expose gang caps + gang flow actions (not multi-tile only)
    const relayCompose = read('drivers/relay_board_4_channel/driver.compose.json');
    assert.match(relayCompose, /"onoff\.gang2"/);
    assert.match(relayCompose, /_TZ3210_imaccztn/);
    assert.doesNotMatch(relayCompose, /"secondSwitch"/);
    const relayFlows = read('drivers/relay_board_4_channel/driver.flow.compose.json');
    assert.match(relayFlows, /relay_board_4_channel_turn_on_gang2/);
    assert.match(relayFlows, /relay_board_4_channel_turn_on_gang4/);
    const relayDev = read('drivers/relay_board_4_channel/device.js');
    assert.match(relayDev, /get gangCount\(\) \{ return 4; \}/);
  });
});
