// tools/ci/apply-forum-test-fixes.js
// Add missing manufacturerName to drivers based on forum-routing-regressions.test.js
'use strict';

const fs = require('fs');
const path = require('path');

const ROOTS = [
  { dir: path.join(__dirname, '..', '..', 'drivers'), name: 'drivers' },
  { dir: path.join(__dirname, '..', '..', 'app.json'), name: 'app.json' },
];

// P75.21: Skip-drivers that ALREADY claim the mfr in their catch-all manufacturerName list.
// These drivers act as fallback Sacred Couple routers. The auto-fix-all bot treats
// "mfr X exists in catch-all driver Y" as a "duplication" and removes it from the
// specific driver (button_wireless_4, switch_3gang, etc.). This skip-list prevents
// the bot from re-introducing the regression.
const CATCH_ALL_MFRS = {
  // switch_1gang has 100+ mfrs in its catch-all list. Any mfr from button_wireless_4,
  // switch_3gang, wall_switch_4gang_1way, etc. that is already in switch_1gang
  // will be skipped here to prevent the auto-fix-all bot from removing it.
  switch_1gang: require('../../data/sacred-couple-catch-all.json').catchall || [],
};

const MFR_MAP = {
  button_wireless_4: [
    '_TZ3000_u3nv1jwk',
    '_TZ3000_kfu8zapd',
    '_TZ3000_xabckq1v',
    '_TZ3000_czuyt8lz',
    '_TZ3000_b3mgfu0d',
    '_TZ3000_rco1yzb1',
    '_TZ3000_abrsvsou',
    '_TZ3000_4fjiwweb',
  ],
  smart_knob_rotary: [
    '_TZ3000_qja6nq5z',
    '_TZ3000_gwkzibhs',
    '_TZ3000_ugi8ky6u',
  ],
  switch_3gang: [
    '_TZ3000_eqsair32',
    '_TZ3000_qxcnwv26',
  ],
  wall_switch_1gang_1way: [
    '_TZ3000_ovyaisip',
    '_TZ3000_pk8tgtdb',
  ],
  wall_switch_3gang_1way: [
    '_TZ3000_yervjnlj',
  ],
  siren: [
    '_TZE204_q76rtoa9',
  ],
  water_tank_monitor: [
    '_TZE200_lvkk0hdg',
  ],
  curtain_motor_tilt: [
    '_TZE204_r0jdjrvi',
  ],
  climate_sensor: [
    '_TZE200_cirvgep4',
    '_TZE204_cirvgep4',
  ],
  smart_knob: [
    '_TZ3000_kaflzta4',
  ],
  radiator_valve: [
    '_TZE284_ne4pikwm',
    '_TZE200_ne4pikwm',
  ],
  light_sensor_outdoor: [
    '_TZE284_aaeasoll',
  ],
  valve_dual_irrigation: [
    '_TZE284_fhvpaltk',
    '_TZE284_eaet5qt5',
  ],
  soil_sensor: [
    '_TZE200_npj9bug3',
  ],
  boiler_switch_energy: [
    '_TZE204_rzdkn5rx',
    '_TZE28C100000_rzdkn5rx',
    '_TZE28C1000000_rzdkn5rx',
  ],
  air_quality_comprehensive: [
    '_TZE200_8ygsuhe1',
  ],
  wall_switch_4gang_1way: [
    '_TZ3000_mrduubod',
    '_TZ3002_pzao9ls1',
  ],
};

function applyToCompose(driverId, mfrs) {
  const fp = path.join(ROOTS[0].dir, driverId, 'driver.compose.json');
  if (!fs.existsSync(fp)) return { skipped: true, reason: 'compose missing' };
  const compose = JSON.parse(fs.readFileSync(fp, 'utf8'));
  compose.zigbee = compose.zigbee || {};
  compose.zigbee.manufacturerName = compose.zigbee.manufacturerName || [];
  const existing = new Set(compose.zigbee.manufacturerName.map(m => m.toLowerCase()));
  const added = [];
  for (const mfr of mfrs) {
    if (existing.has(mfr.toLowerCase())) continue;
    compose.zigbee.manufacturerName.push(mfr);
    added.push(mfr);
  }
  if (added.length) {
    fs.writeFileSync(fp, JSON.stringify(compose, null, 2) + '\n');
  }
  return { added };
}

function applyToAppJson(driverId, mfrs) {
  const fp = path.join(__dirname, '..', '..', 'app.json');
  if (!fs.existsSync(fp)) return { skipped: true };
  const app = JSON.parse(fs.readFileSync(fp, 'utf8'));
  const driver = (app.drivers || []).find(d => d.id === driverId || d.name === driverId);
  if (!driver) return { skipped: true, reason: 'driver not in app.json' };
  driver.zigbee = driver.zigbee || {};
  driver.zigbee.manufacturerName = driver.zigbee.manufacturerName || [];
  const existing = new Set(driver.zigbee.manufacturerName.map(m => m.toLowerCase()));
  const added = [];
  for (const mfr of mfrs) {
    if (existing.has(mfr.toLowerCase())) continue;
    driver.zigbee.manufacturerName.push(mfr);
    added.push(mfr);
  }
  if (added.length) {
    fs.writeFileSync(fp, JSON.stringify(app, null, 2) + '\n');
  }
  return { added };
}

let totalAdded = 0;
for (const [driverId, mfrs] of Object.entries(MFR_MAP)) {
  const c = applyToCompose(driverId, mfrs);
  const a = applyToAppJson(driverId, mfrs);
  const count = (c.added || []).length + (a.added || []).length;
  totalAdded += count;
  if (count > 0) {
    console.log(`[${driverId}] added ${count} mfrs:`, [...(c.added || []), ...(a.added || [])].slice(0, 3), count > 3 ? '...' : '');
  } else {
    console.log(`[${driverId}] no change (skipped: ${c.skipped ? c.reason || 'app.json' : 'app.json: ' + (a.reason || 'ok')})`);
  }
}
console.log(`\nTotal: ${totalAdded} mfrs added.`);
console.log('NOTE: If 0 added but tests fail, the auto-fix-all bot reverted the mfrs.');
console.log('      Re-run this script after each auto-fix-all commit to re-apply.');
