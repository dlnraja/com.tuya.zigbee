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
  // P129: TS004F remotes must NOT live on 1-gang switch catch-all
  {
    id: 'p129-ts004f-not-switch1',
    driver: 'switch_1gang',
    mfrs: ['_TZ3000_xabckq1v', '_TZ3000_czuyt8lz', '_TZ3000_b3mgfu0d', '_TZ3000_abrsvsou', '_TZ3000_4fjiwweb'],
  },
  // P133 / GH #513: ZT08 LCD climate uses thin dedicated driver
  {
    id: 'p133-hodyryli-not-climate',
    driver: 'climate_sensor',
    mfrs: ['_TZE284_hodyryli'],
  },
  // Forum #2131: relay fingerprint must not stay on switch_4gang
  {
    id: 'p94-imaccztn-not-switch4',
    driver: 'switch_4gang',
    mfrs: ['_TZ3210_imaccztn'],
  },
  // Forum #2133: BSEED dimmer must not be climate sensor
  {
    id: 'p94-m1cvyneb-not-climate',
    driver: 'climate_sensor',
    mfrs: ['_TZE284_m1cvyneb'],
  },
  // Forum #2135: Avatto ZDMS16-2 must not be climate sensor
  {
    id: 'p96-jtbgusdc-not-climate',
    driver: 'climate_sensor',
    mfrs: ['_TZE204_jtbgusdc', '_TZE284_jtbgusdc', '_TZE28C1000000_jtbgusdc', '_TZE204_o9gyszw2'],
  },
  // Forum #2133/#2131: specific devices must not collide with generic_tuya catch-all
  {
    id: 'p94-m1cvyneb-not-generic',
    driver: 'generic_tuya',
    mfrs: ['_TZE284_m1cvyneb'],
  },
  {
    id: 'p94-imaccztn-not-generic',
    driver: 'generic_tuya',
    mfrs: ['_TZ3210_imaccztn'],
  },
  {
    id: 'p96-jtbgusdc-not-generic',
    driver: 'generic_tuya',
    mfrs: ['_TZE204_jtbgusdc', '_TZE28C1000000_jtbgusdc', '_TZE204_o9gyszw2'],
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
];

/** Forbidden productIds on a driver. */
const FORBIDDEN_PIDS = [
  {
    id: 'p93-zg222z-not-gas',
    driver: 'gas_sensor_switch',
    pids: ['ZG-222Z'],
  },
];

/** Required placements (must be present). */
const REQUIRED = [
  // P129: sacred couples are mfr+TS004F → button_wireless_4
  {
    id: 'p129-ts004f-btn4',
    driver: 'button_wireless_4',
    mfrs: [
      '_TZ3000_xabckq1v',
      '_TZ3000_czuyt8lz',
      '_TZ3000_b3mgfu0d',
      '_TZ3000_abrsvsou',
      '_TZ3000_4fjiwweb',
    ],
  },
  // P133 / GH #513
  {
    id: 'p133-hodyryli-zt08',
    driver: 'climate_sensor_zt08',
    mfrs: ['_TZE284_hodyryli'],
  },
  {
    id: 'p94-w5xztuy7-switch2',
    driver: 'switch_2gang',
    mfrs: ['_TZ3000_w5xztuy7'],
  },
  {
    id: 'p94-m1cvyneb-dimmer',
    driver: 'wall_dimmer_tuya',
    mfrs: ['_TZE284_m1cvyneb'],
  },
  {
    id: 'p94-imaccztn-relay',
    driver: 'relay_board_4_channel',
    mfrs: ['_TZ3210_imaccztn'],
  },
  {
    id: 'p96-jtbgusdc-dimmer2',
    driver: 'dimmer_2_gang_tuya',
    mfrs: ['_TZE204_jtbgusdc', '_TZE28C1000000_jtbgusdc'],
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
