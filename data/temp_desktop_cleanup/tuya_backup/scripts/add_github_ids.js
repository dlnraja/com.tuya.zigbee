/**
 * Script to add manufacturer IDs from Johan Bendz GitHub Issues & PRs
 * Sources: https://github.com/JohanBendz/com.tuya.zigbee/issues
 *          https://github.com/JohanBendz/com.tuya.zigbee/pulls
 */

const fs = require('fs');
const path = require('path');

const driversDir = path.join(__dirname, '..', 'drivers');

// New IDs from GitHub Issues & PRs (Jan 2026)
const newDevices = {
  // Issue #1328: RSH-HS03 - _TZE284_9ern5sfh | TS0601 (soil/climate sensor)
  'climate_sensor': ['_TZE284_9ern5sfh', '_tze284_9ern5sfh'],

  // Issue #1326: Bseed Wall socket - _TZ3210_4ux0ondb / TS011F
  'plug_energy_monitor': ['_TZ3210_4ux0ondb', '_tz3210_4ux0ondb'],

  // Issue #1325: E14 LED color bulb - _TZ3210_s8lvbbu / TS0505B
  'bulb_rgb': ['_TZ3210_s8lvbbu', '_tz3210_s8lvbbu'],

  // Issue #1321: Tuya PIR - _TZE200_ghynnvos / TS0601
  'motion_sensor': ['_TZE200_ghynnvos', '_tze200_ghynnvos'],

  // Issue #1320: Smart Light sensor - _TZ3000_hy6ncvmw / TS0222
  'motion_sensor': ['_TZ3000_hy6ncvmw', '_tz3000_hy6ncvmw'],

  // PR #1118: Smartplug _TZ3000_ww6drja5
  'plug_smart': ['_TZ3000_ww6drja5', '_tz3000_ww6drja5'],

  // PR #1075: RGB LED Strip Controller - _TZ3210_eejm8dcr / TS0505B
  'led_strip': ['_TZ3210_eejm8dcr', '_tz3210_eejm8dcr'],

  // PR #774: radar_sensor TZE200_2aaelwxk
  'presence_sensor_radar': ['_TZE200_2aaelwxk', '_tze200_2aaelwxk'],

  // Additional from recent commits
  'rain_sensor': ['_TZ3210_tgvtvdoc', '_tz3210_tgvtvdoc'],

  // PR #1065: Fingerbot _TZ3210_j4pdtz9v
  'curtain_motor': ['_TZ3210_j4pdtz9v', '_tz3210_j4pdtz9v'],

  // Issue #1322: WenzhiIoT 24GHz mmWave _TZE204_gkfbdvyx (already in presence_sensor_radar)
  // Issue #1327: MOES Scene Switch 4 gang _TZ3000_zgyzgdua (already in scene_switch_4)

  // Additional IDs from forks analysis
  'switch_1gang': ['_TZ3000_txpirhfq', '_tz3000_txpirhfq', '_TZ3000_zmy4lslw', '_tz3000_zmy4lslw'],
  'switch_2gang': ['_TZ3000_18ejxno0', '_tz3000_18ejxno0'],
  'contact_sensor': ['_TZ3000_decxrtwa', '_tz3000_decxrtwa'],
  'smoke_detector_advanced': ['_TZE204_ntcy3xu1', '_tze204_ntcy3xu1'],
  'thermostat_tuya_dp': ['_TZE200_b6wax7g0', '_tze200_b6wax7g0'],
};

function addIdsToDriver(driverName, newIds) {
  const filePath = path.join(driversDir, driverName, 'driver.compose.json');
  if (!fs.existsSync(filePath)) {
    console.log(`  ❌ Driver not found: ${driverName}`);
    return 0;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let data;
  try {
    data = JSON.parse(content);
  } catch (e) {
    console.log(`  ❌ Parse error: ${driverName}`);
    return 0;
  }

  if (!data.zigbee || !data.zigbee.manufacturerName) {
    console.log(`  ❌ No manufacturerName array: ${driverName}`);
    return 0;
  }

  const existing = data.zigbee.manufacturerName;
  let added = 0;

  newIds.forEach(id => {
    if (!existing.includes(id)) {
      existing.push(id);
      added++;
    }
  });

  if (added > 0) {
    // Sort alphabetically
    data.zigbee.manufacturerName = existing.sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    );
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`  ✅ ${driverName}: +${added} IDs`);
  } else {
    console.log(`  ⚪ ${driverName}: Already has all IDs`);
  }

  return added;
}

console.log('\n=== ADDING GITHUB IDs ===\n');

let totalAdded = 0;
for (const [driver, ids] of Object.entries(newDevices)) {
  totalAdded += addIdsToDriver(driver, ids);
}

console.log(`\n=== TOTAL: +${totalAdded} IDs ===\n`);
