'use strict';

/**
 * tools/ci/anti-bot-regression-gate.js
 *
 * P94+: Fail CI if auto-fix-all / bot reintroduces known wrong Sacred Couple
 * routings. Complements re-inject-manual-fixes.js (repair) with a hard gate
 * (detect). Safe for master + stable.
 *
 * Usage:
 *   node tools/ci/anti-bot-regression-gate.js
 *   node tools/ci/anti-bot-regression-gate.js --root C:/Users/Dell/Documents/homey/stable
 *
 * Exit 0 = clean, Exit 1 = regression detected.
 */

const fs = require('fs');
const path = require('path');
const { includesCI } = require('../../lib/utils/TuyaNormalizer');

const args = process.argv.slice(2);
let ROOT = process.cwd();
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--root') ROOT = path.resolve(args[++i]);
}

function loadCompose(driverId) {
  const fp = path.join(ROOT, 'drivers', driverId, 'driver.compose.json');
  if (!fs.existsSync(fp)) return null;
  return JSON.parse(fs.readFileSync(fp, 'utf8'));
}

function hasMfr(compose, mfr) {
  const list = (compose && compose.zigbee && compose.zigbee.manufacturerName) || [];
  return includesCI(list, mfr);
}

function hasPid(compose, pid) {
  const list = (compose && compose.zigbee && compose.zigbee.productId) || [];
  return includesCI(list, pid);
}

/** Forbidden placements: driver must NOT contain these mfrs (case-insensitive). */
const FORBIDDEN = [
  // P90/P93: bot put metering/button mfrs on 4-button remote
  {
    id: 'p93-button4-bot-mfrs',
    driver: 'button_wireless_4',
    mfrs: ['_TZ3000_xabckq1v', '_TZ3000_czuyt8lz', '_TZ3000_b3mgfu0d', '_TZ3000_abrsvsou', '_TZ3000_4fjiwweb'],
  },
  // Forum #2131: relay fingerprint must not stay on switch_4gang
  {
    id: 'p94-imaccztn-not-switch4',
    driver: 'switch_4gang',
    mfrs: ['_TZ3210_imaccztn'],
  },
  // Forum silent-scan: BSEED dimmer family must not be climate sensor
  {
    id: 'p94-m1cvyneb-not-climate',
    driver: 'climate_sensor',
    mfrs: ['_TZE284_m1cvyneb', '_TZE204_m1cvyneb', '_TZE200_m1cvyneb'],
  },
  // Forum #2135: Avatto ZDMS16-2 must not be climate sensor
  {
    id: 'p96-jtbgusdc-not-climate',
    driver: 'climate_sensor',
    mfrs: ['_TZE204_jtbgusdc', '_TZE284_jtbgusdc', '_TZE28C1000000_jtbgusdc', '_TZE204_o9gyszw2'],
  },
  // Forum silent-scan: specific devices must not collide with generic_tuya catch-all
  {
    id: 'p94-m1cvyneb-not-generic',
    driver: 'generic_tuya',
    mfrs: ['_TZE284_m1cvyneb', '_TZE204_m1cvyneb', '_TZE200_m1cvyneb'],
  },
  {
    id: 'p94-imaccztn-not-generic',
    driver: 'generic_tuya',
    mfrs: ['_TZ3210_imaccztn'],
  },
  {
    id: 'p96-jtbgusdc-not-generic',
    driver: 'generic_tuya',
    mfrs: [
      '_TZE204_jtbgusdc', '_TZE284_jtbgusdc', '_TZE28C1000000_jtbgusdc',
      '_TZE204_o9gyszw2', '_TZE284_o9gyszw2', '_TZE28C1000000_o9gyszw2',
    ],
  },
  {
    id: 'p96-hlla45kx-not-button2',
    driver: 'button_wireless_2',
    mfrs: ['_TYZB01_hlla45kx'],
  },
  {
    id: 'p97-awepdiwi-not-climate',
    driver: 'climate_sensor',
    mfrs: ['_TZE284_awepdiwi'],
  },
  {
    id: 'p97-pcdmj88b-not-wall-thermostat',
    driver: 'wall_thermostat',
    mfrs: ['_TZE284_pcdmj88b', '_TZE204_pcdmj88b'],
  },
  {
    id: 'p96-hlla45kx-not-generic',
    driver: 'generic_tuya',
    mfrs: ['_TYZB01_hlla45kx'],
  },
  {
    id: 'p97-dhotiauw-not-generic',
    driver: 'generic_tuya',
    mfrs: ['_TZE204_dhotiauw', '_TZE284_dhotiauw'],
  },
  // P98 sacred-couple rehomes — never dump back into generic/wrong class
  {
    id: 'p98-pftj0i7z-not-generic',
    driver: 'generic_tuya',
    mfrs: ['_TZ3000_pftj0i7z'],
  },
  {
    id: 'p98-8utxxtzr-not-generic',
    driver: 'generic_tuya',
    mfrs: ['_TZ3000_8utxxtzr'],
  },
  {
    id: 'p98-jt50ea5d-not-irrigation',
    driver: 'valve_irrigation',
    mfrs: ['_TZE200_jt50ea5d'],
  },
  {
    id: 'p98-9p5xmj5r-not-wall-thermostat',
    driver: 'wall_thermostat',
    mfrs: ['_TZE200_9p5xmj5r'],
  },
  {
    id: 'p98-bgtzm4ny-not-switch1',
    driver: 'switch_1gang',
    mfrs: ['_TZ3000_bgtzm4ny', '_TZ3000_5tqxpine'],
  },
  // P101 lot2 — typed rehomes must never bounce back to generic_tuya
  {
    id: 'p101-lot2-not-generic',
    driver: 'generic_tuya',
    mfrs: [
      '_TZ3002_eda6eitk', '_TZ3002_vsom92pp',
      '_TZE200_0hb4rdnp', '_TZE200_gne0e6mk',
      '_TZE200_2imwyigp', '_TZE204_2imwyigp', '_TZE200_2hf7x9n3',
      '_TZE200_rqhnxkqu', '_TZE284_hyssaqjk',
      '_TZ3218_sgbsg6mr',
      '_TZE204_xu4a5rhj', '_TYST11_fzo2pocs',
      '_TZE284_d2zfgtij', '_TZE284_s4sa1mcx',
      '_TZE204_x8diwkqb', '_TZE284_x8diwkqb',
      '_TZE204_lawxy9e2', '_TZE204_2jnoy8dj',
      '_TZE200_xixlazkg',
    ],
  },
  {
    id: 'p101-2hf7x9n3-not-switch1',
    driver: 'switch_1gang',
    mfrs: ['_TZE200_2hf7x9n3'],
  },
  {
    id: 'p101-fzo2pocs-not-climate',
    driver: 'climate_sensor',
    mfrs: ['_TYST11_fzo2pocs'],
  },
  {
    id: 'p122-fzo2pocs-not-switch1',
    driver: 'switch_1gang',
    mfrs: ['_TZE200_fzo2pocs', '_TZE204_fzo2pocs', '_TYST11_fzo2pocs'],
  },
  {
    // P124: clrdrnya sacred couple stays on presence_sensor_radar only (not mmWave twin)
    id: 'p124-clrdrnya-not-mmwave',
    driver: 'motion_sensor_radar_mmwave',
    mfrs: ['_TZE200_clrdrnya', '_TZE204_clrdrnya', '_TZE284_clrdrnya'],
  },
  {
    id: 'p125-xu4a5rhj-not-climate',
    driver: 'climate_sensor',
    mfrs: ['_TZE200_xu4a5rhj', '_TZE204_xu4a5rhj', '_TZE284_xu4a5rhj'],
  },
  {
    id: 'p125-lawxy9e2-not-climate',
    driver: 'climate_sensor',
    mfrs: ['_TZE200_lawxy9e2', '_TZE204_lawxy9e2', '_TZE284_lawxy9e2'],
  },
  {
    id: 'p125-oxslv1c9-not-socket-strip',
    driver: 'socket_power_strip',
    mfrs: ['_TZ3000_oxslv1c9'],
  },
  {
    id: 'p126-iadro9bf-not-climate',
    driver: 'climate_sensor',
    mfrs: ['_TZE204_iadro9bf', '_TZE200_iadro9bf', '_TZE284_iadro9bf'],
  },
  // P102 lot3 — typed rehomes must never bounce back to generic / wrong class
  {
    id: 'p102-lot3-not-generic',
    driver: 'generic_tuya',
    mfrs: [
      '_TZE204_trwaxi57', '_TZE28C1000000_81yrt3lo', '_TZE20C_xbexmf8h',
      '_TYST11_udank5zs', '_TZE200_udank5zs', '_TZE284_udank5zs',
      '_TYST11_wv90ladg', '_TZE200_wv90ladg',
      '_TYST11_2dpplnsn', '_TZE200_2dpplnsn', '_TZE204_2dpplnsn',
      '_TYST11_pisltm67', '_TZE200_pisltm67', '_TZE204_pisltm67',
      '_TZ3000_l8fsgo6p',
      '_TZE200_byzdayie', '_TZE204_byzdayie', '_TZE200_fsb6zw01', '_TZE200_ewxhg6o9',
      '_TZE200_bkkmqmyo', '_TZE204_bkkmqmyo', '_TZE200_eaac7dkw',
      '_TZE200_lsanae15', '_TZE204_lsanae15', '_TZE200_nkjintbl',
      '_TZE204_muvkrjr5', '_TZE200_hkdl5fmv',
      '_TZ3000_fisb3ajo', '_TZ3000_aa5t61rh', '_TZ3000_rul9yxcc',
      '_TZ3000_ji4araar', '_TZ3000_prits6g4', '_TZ3000_tqlv4ug4', '_TZ3210_tqlv4ug4',
      '_TZ3000_qmi1cfuq', '_TZ3000_4o16jdca', '_TZ3000_lvhy15ix', '_TZ3000_odzoiovu',
      '_TZE200_44af8vyi', '_TZE200_bjawzodf', '_TZE200_bq5c8xfe',
      '_TZE200_d7lpruvi', '_TZE204_d7lpruvi', '_TZE284_d7lpruvi',
      // forum sacred couples
      '_TZ3000_u3nv1jwk', '_TZE284_aaeasoll', '_TZE284_fhvpaltk',
      '_TZ3000_mrduubod', '_TZE200_clrdrnya', '_TZE204_clrdrnya',
    ],
  },
  {
    id: 'p102-tyst11-not-climate',
    driver: 'climate_sensor',
    mfrs: [
      '_TYST11_udank5zs', '_TZE200_udank5zs', '_TZE284_udank5zs',
      '_TYST11_wv90ladg', '_TZE200_wv90ladg',
      '_TYST11_2dpplnsn', '_TZE200_2dpplnsn', '_TZE204_2dpplnsn',
      '_TYST11_pisltm67', '_TZ3000_l8fsgo6p',
    ],
  },
  {
    id: 'p102-pisltm67-not-thermostat-dp',
    driver: 'thermostat_tuya_dp',
    mfrs: ['_TYST11_pisltm67', '_TZE200_pisltm67', '_TZE204_pisltm67'],
  },
  {
    id: 'p102-din-not-btn-plug',
    driver: 'button_wireless_plug',
    mfrs: [
      '_TZE200_byzdayie', '_TZE204_byzdayie', '_TZE200_fsb6zw01', '_TZE200_ewxhg6o9',
      '_TZE200_bkkmqmyo', '_TZE204_bkkmqmyo', '_TZE200_eaac7dkw',
      '_TZE200_lsanae15', '_TZE204_lsanae15', '_TZE200_nkjintbl',
    ],
  },
  {
    id: 'p102-switches-not-btn2',
    driver: 'button_wireless_2',
    mfrs: [
      '_TZE204_muvkrjr5', '_TZE200_hkdl5fmv',
      '_TZ3000_fisb3ajo', '_TZ3000_aa5t61rh', '_TZ3000_rul9yxcc',
      '_TZ3000_ji4araar', '_TZ3000_prits6g4', '_TZ3000_tqlv4ug4', '_TZ3210_tqlv4ug4',
      '_TZ3000_qmi1cfuq', '_TZ3000_4o16jdca', '_TZ3000_lvhy15ix', '_TZ3000_odzoiovu',
      '_TZE200_44af8vyi', '_TZE200_bjawzodf', '_TZE200_bq5c8xfe',
      '_TZE200_d7lpruvi', '_TZE204_d7lpruvi', '_TZE284_d7lpruvi',
    ],
  },
];

/** Forbidden productIds on a driver. */
const FORBIDDEN_PIDS = [
  {
    id: 'p93-zg222z-not-gas',
    driver: 'gas_sensor_switch',
    pids: ['ZG-222Z'],
  },
  {
    // P126: dual-home 2imwyigp — contact owns TS0203 only; switch_3gang owns TS0601
    id: 'p126-contact-no-TS0601',
    driver: 'contact_sensor',
    pids: ['TS0601'],
  },
];

/** Required placements (must be present). */
const REQUIRED = [
  {
    id: 'p93-sacred-switch1',
    driver: 'switch_1gang',
    mfrs: ['_TZ3000_xabckq1v', '_TZ3000_czuyt8lz'],
  },
  {
    id: 'p94-w5xztuy7-switch2',
    driver: 'switch_2gang',
    mfrs: ['_TZ3000_w5xztuy7'],
  },
  {
    id: 'p94-m1cvyneb-dimmer',
    driver: 'wall_dimmer_tuya',
    mfrs: ['_TZE284_m1cvyneb', '_TZE204_m1cvyneb', '_TZE200_m1cvyneb'],
  },
  {
    id: 'p108-wkr3jqmr-switch4',
    driver: 'switch_4gang',
    mfrs: ['_TZ3000_wkr3jqmr'],
  },
  {
    id: 'p94-imaccztn-relay',
    driver: 'relay_board_4_channel',
    mfrs: ['_TZ3210_imaccztn'],
  },
  {
    id: 'p96-jtbgusdc-dimmer2',
    driver: 'dimmer_2_gang_tuya',
    mfrs: [
      '_TZE204_jtbgusdc', '_TZE284_jtbgusdc', '_TZE200_jtbgusdc', '_TZE28C1000000_jtbgusdc',
      '_TZE204_o9gyszw2', '_TZE284_o9gyszw2', '_TZE28C1000000_o9gyszw2',
    ],
  },
  {
    id: 'p96-hlla45kx-socket',
    driver: 'double_power_point_2',
    mfrs: ['_TYZB01_hlla45kx'],
  },
  {
    id: 'p97-awepdiwi-soil',
    driver: 'soil_sensor',
    mfrs: ['_TZE284_awepdiwi'],
  },
  {
    id: 'p98-pftj0i7z-btn4',
    driver: 'button_wireless_4',
    mfrs: ['_TZ3000_pftj0i7z'],
  },
  {
    id: 'p98-8utxxtzr-sos',
    driver: 'button_emergency_sos',
    mfrs: ['_TZ3000_8utxxtzr'],
  },
  {
    id: 'p98-jt50ea5d-heat',
    driver: 'ultrasonic_heat_meter',
    mfrs: ['_TZE200_jt50ea5d'],
  },
  {
    id: 'p98-9p5xmj5r-curtain',
    driver: 'curtain_motor',
    mfrs: ['_TZE200_9p5xmj5r'],
  },
  {
    id: 'p101-fzo2pocs-curtain',
    driver: 'curtain_motor',
    mfrs: ['_TYST11_fzo2pocs'],
  },
  {
    id: 'p101-2hf7x9n3-switch3',
    driver: 'switch_3gang',
    mfrs: ['_TZE200_2hf7x9n3'],
  },
  {
    id: 'p101-forum-u3nv1jwk-btn4',
    driver: 'button_wireless_4',
    mfrs: ['_TZ3000_u3nv1jwk'],
  },
  {
    id: 'p101-forum-aaeasoll-lux',
    driver: 'light_sensor_outdoor',
    mfrs: ['_TZE284_aaeasoll'],
  },
  {
    id: 'p101-forum-fhvpaltk-valve',
    driver: 'valve_dual_irrigation',
    mfrs: ['_TZE284_fhvpaltk'],
  },
  {
    id: 'p101-forum-mrduubod-sw4',
    driver: 'wall_switch_4gang_1way',
    mfrs: ['_TZ3000_mrduubod'],
  },
  {
    id: 'p102-forum-clrdrnya-radar',
    driver: 'presence_sensor_radar',
    mfrs: ['_TZE200_clrdrnya', '_TZE204_clrdrnya'],
  },
  {
    id: 'p126-iadro9bf-presence',
    driver: 'presence_sensor_radar',
    mfrs: ['_TZE204_iadro9bf'],
  },
  {
    id: 'p102-trwaxi57-curtain',
    driver: 'curtain_motor',
    mfrs: ['_TZE204_trwaxi57'],
  },
  {
    id: 'p102-81yrt3lo-clamp',
    driver: 'power_clamp_meter',
    mfrs: ['_TZE28C1000000_81yrt3lo'],
  },
  {
    id: 'p102-xbexmf8h-wall-curtain',
    driver: 'wall_curtain_switch',
    mfrs: ['_TZE20C_xbexmf8h'],
  },
  {
    id: 'p102-udank5zs-curtain',
    driver: 'curtain_motor',
    mfrs: ['_TYST11_udank5zs', '_TZE200_udank5zs'],
  },
  {
    id: 'p102-wv90ladg-thermostat',
    driver: 'wall_thermostat',
    mfrs: ['_TYST11_wv90ladg', '_TZE200_wv90ladg'],
  },
  {
    id: 'p102-2dpplnsn-trv',
    driver: 'radiator_valve',
    mfrs: ['_TYST11_2dpplnsn', '_TZE200_2dpplnsn'],
  },
  {
    id: 'p102-pisltm67-lux',
    driver: 'light_sensor_outdoor',
    mfrs: ['_TYST11_pisltm67', '_TZE200_pisltm67'],
  },
  {
    id: 'p102-byzdayie-din',
    driver: 'energy_meter_din',
    mfrs: ['_TZE200_byzdayie'],
  },
  {
    id: 'p102-muvkrjr5-radar',
    driver: 'presence_sensor_radar',
    mfrs: ['_TZE204_muvkrjr5'],
  },
  {
    id: 'p102-fisb3ajo-sw2',
    driver: 'switch_2gang',
    mfrs: ['_TZ3000_fisb3ajo', '_TZ3000_aa5t61rh'],
  },
  {
    id: 'p102-ji4araar-sw1',
    driver: 'switch_1gang',
    mfrs: ['_TZ3000_ji4araar', '_TZ3000_l8fsgo6p'],
  },
  {
    id: 'p102-4o16jdca-sw3',
    driver: 'switch_3gang',
    mfrs: ['_TZ3000_4o16jdca', '_TZ3000_lvhy15ix'],
  },
];

const failures = [];
const notes = [];

for (const rule of FORBIDDEN) {
  const compose = loadCompose(rule.driver);
  if (!compose) {
    notes.push(`skip ${rule.id}: missing driver ${rule.driver}`);
    continue;
  }
  for (const mfr of rule.mfrs) {
    if (hasMfr(compose, mfr)) {
      failures.push(`FORBIDDEN ${rule.id}: ${mfr} still in drivers/${rule.driver}`);
    }
  }
}

for (const rule of FORBIDDEN_PIDS) {
  const compose = loadCompose(rule.driver);
  if (!compose) {
    notes.push(`skip ${rule.id}: missing driver ${rule.driver}`);
    continue;
  }
  for (const pid of rule.pids) {
    if (hasPid(compose, pid)) {
      failures.push(`FORBIDDEN ${rule.id}: productId ${pid} still in drivers/${rule.driver}`);
    }
  }
}

for (const rule of REQUIRED) {
  const compose = loadCompose(rule.driver);
  if (!compose) {
    // Stable may lack some master-only drivers — soft note, not fail
    notes.push(`skip required ${rule.id}: missing driver ${rule.driver}`);
    continue;
  }
  for (const mfr of rule.mfrs) {
    if (!hasMfr(compose, mfr)) {
      failures.push(`REQUIRED ${rule.id}: ${mfr} missing from drivers/${rule.driver}`);
    }
  }
}

console.log('═══════════════════════════════════════════════');
console.log('  Anti-bot regression gate (P94+)');
console.log(`  root: ${ROOT}`);
console.log('═══════════════════════════════════════════════');
for (const n of notes) console.log(`  ~ ${n}`);
if (failures.length) {
  for (const f of failures) console.log(`  ❌ ${f}`);
  console.log(`\nFAILED: ${failures.length} regression(s)`);
  process.exit(1);
}
console.log('  ✅ No known bot regressions detected');
process.exit(0);
