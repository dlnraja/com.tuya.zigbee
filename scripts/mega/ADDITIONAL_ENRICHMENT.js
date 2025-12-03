#!/usr/bin/env node
/**
 * ADDITIONAL ENRICHMENT SCRIPT
 *
 * Enrichissement supplémentaire pour catégories manquantes:
 * - TS0215A (SOS/Panic buttons)
 * - TS0201 (Temperature sensors)
 * - TS011F (Smart plugs)
 * - TS0001/TS0002/TS0003 (Switches)
 * - TS004F (Remote buttons)
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '..', '..', 'drivers');

// Additional manufacturer IDs by driver
const ADDITIONAL_IDS = {
  'button_emergency_sos': [
    '_TZ3000_4fsgukof', '_TZ3000_wr2ucaj9', '_TZ3000_zsh6uat3', '_TZ3000_tj4pwzzm',
    '_TZ3000_2izubafb', '_TZ3000_pkfazisv', '_TZ3000_0dumfk2z', '_TZ3000_ssp0maqm',
    '_TZ3000_p3fph1go', '_TZ3000_9r5jaajv', '_TZ3000_p6ju8myv', '_TZ3000_0zrccfgx',
    '_TZ3000_fsiepnrh', '_TZ3000_ug1vtuzn', '_TZ3000_eo3dttwe', '_TZ3000_jwcixnrz',
    '_TZ3000_u2bbagu4'
  ],
  'climate_sensor': [
    '_TZ3000_bguser20', '_TZ3000_yd2e749y', '_TZ3000_6uzkisv2', '_TZ3000_xr3htd96',
    '_TZ3000_fllyghyj', '_TZ3000_saiqcn0y', '_TZ3000_bjawzodf', '_TZE200_oisqyl4o',
    '_TZE200_js3mgbjb', '_TZE200_7deq70b8', '_TZE204_ptaqh9tk', '_TZE200_aqnazj70',
    '_TZE200_di3tfv5b', '_TZE200_mexisfik', '_TZE200_jwsjbxjs', '_TZE200_leaqthqq',
    '_TZE200_mwvfvw8g', '_TZE200_cduqh1l0', '_TZE200_emxxanvi', '_TZE200_raz9qavg',
    '_TZE200_nkjintbl', '_TZE200_ji1gn7rw', '_TZE200_3t91nb6k', '_TZE204_3t91nb6k',
    '_TZE200_wvovwe9h', '_TZE204_wvovwe9h', '_TZE200_nh9m9emk', '_TZE200_kyfqmmyl',
    '_TZE200_2hf7x9n3', '_TZE204_atpwqgml', '_TZE200_bynnczcb', '_TZE200_atpwqgml',
    '_TZE204_2imwyigp', '_TZE200_2imwyigp', '_TZE200_go3tvswy', '_TZE200_oyti2ums'
  ],
  'plug_smart': [
    '_TZ3000_3zofvcaa', '_TZ3000_pvlvoxvt', '_TZ3000_bep7ccew', '_TZ3000_gazjngjl'
  ],
  'plug_energy_monitor': [
    '_TZ3000_3zofvcaa', '_TZ3000_pvlvoxvt', '_TZ3000_bep7ccew', '_TZ3000_gazjngjl'
  ],
  'button_wireless_4': [
    '_TZ3000_nuombroo', '_TZ3000_xabckq1v', '_TZ3000_czuyt8lz', '_TZ3000_0ht8dnxj',
    '_TZ3000_b3mgfu0d', '_TZ3000_r0o2dahu', '_TZ3000_11pg3ima', '_TZ3000_et7afzxz'
  ],
  'switch_1gang': [
    '_TZ3000_qnejhcsu', '_TZ3000_x3ewpzyr', '_TZ3000_mkhkxx1p', '_TZ3000_tgddllx4',
    '_TZ3000_kqvb5akv', '_TZ3000_q8r0bbvy', '_TZ3000_g92baclx', '_TZ3000_qlai3277',
    '_TZ3000_qaabwu5c', '_TZ3000_qorepo2x', '_TZ3000_ikuxinvo', '_TZ3000_hzlsaltw',
    '_TZ3000_jsfzkftc', '_TZ3000_0ghwhypc', '_TZ3000_1adss9de', '_TZ3000_x8mbwtsz',
    '_TZ3000_aaifmpuq', '_TZ3000_irrmjcgi', '_TZ3000_myaaknbq', '_TZ3000_cpozgbrx',
    '_TZ3000_drc9tuqb', '_TZ3000_gbshwgag', '_TZ3000_ruxexjfz', '_TZ3210_fhx7lk3d',
    '_TZE204_mexisfik', '_TZE204_iik0pquw', '_TZE204_aagrxlbd', '_TZE204_f5efvtbv',
    '_TZE284_f5efvtbv', '_TZE204_lbhh5o6z', '_TZE284_lbhh5o6z', '_TZE200_wnp4d4va',
    '_TZE204_g4au0afs', '_TZE204_w1wwxoja', '_TZE204_lmgrbuwf', '_TZE284_tdhnhhiy',
    '_TZE204_wskr3up8', '_TZE204_gxbdnfrh', '_TZE204_ojtqawav', '_TZE204_gbagoilo',
    '_TZE200_ojtqawav', '_TZE200_gbagoilo', '_TZ3000_lqb7lcq9', '_TZ3210_urjf5u18',
    '_TZ3210_8n4dn1ne'
  ],
  'switch_2gang': [
    '_TZ3000_huvxrx4i', '_TZ3000_01gpyda5', '_TZ3000_bvrlqyj7', '_TZ3000_7ed9cqgi',
    '_TZ3000_zmy4lslw', '_TZ3000_biakwrag'
  ],
  'thermostat_tuya_dp': [
    '_TZE200_dzuqwsyg', '_TZE204_dzuqwsyg', '_TZE200_qq9mpfhw', '_TZE200_jthf7vb6'
  ],
  'usb_outlet_advanced': [
    '_TZ3000_lqb7lcq9', '_TZ3210_urjf5u18', '_TZ3210_8n4dn1ne'
  ],
  'led_controller_rgb': [
    '_TZB210_lmqquxus', '_TZ3000_obacbukl', '_TZ3000_sosdczdl'
  ],
  'motion_sensor': [
    '_TZ3000_uim07oem'
  ]
};

console.log('🔧 ADDITIONAL ENRICHMENT SCRIPT');
console.log('================================\n');

function enrichDriver(driverId, newIds) {
  const driverPath = path.join(DRIVERS_DIR, driverId, 'driver.compose.json');

  if (!fs.existsSync(driverPath)) {
    console.log(`  ⚠️ ${driverId} non trouvé`);
    return false;
  }

  try {
    const driver = JSON.parse(fs.readFileSync(driverPath, 'utf8'));

    let existingNames = [];
    if (driver.zigbee?.manufacturerName) {
      existingNames = Array.isArray(driver.zigbee.manufacturerName)
        ? driver.zigbee.manufacturerName
        : [driver.zigbee.manufacturerName];
    }

    const allNames = [...new Set([...existingNames, ...newIds])].sort();

    if (allNames.length === existingNames.length) {
      console.log(`  ⏭️ ${driverId}: pas de nouveaux IDs`);
      return false;
    }

    if (!driver.zigbee) driver.zigbee = {};
    driver.zigbee.manufacturerName = allNames;

    fs.writeFileSync(driverPath, JSON.stringify(driver, null, 2) + '\n');
    console.log(`  ✅ ${driverId}: +${allNames.length - existingNames.length} IDs (total: ${allNames.length})`);
    return true;
  } catch (e) {
    console.log(`  ❌ ${driverId}: ${e.message}`);
    return false;
  }
}

let enriched = 0;
for (const [driverId, ids] of Object.entries(ADDITIONAL_IDS)) {
  if (enrichDriver(driverId, ids)) {
    enriched++;
  }
}

console.log(`\n✅ ${enriched} drivers enrichis supplémentaires`);
