'use strict';
/**
 * APPLY PR IMPROVEMENTS SCRIPT v5.5.780
 * 
 * Integrates all closed PRs and issues from JohanBendz/com.tuya.zigbee
 * into the dlnraja fork.
 * 
 * Sources:
 * - GitHub closed PRs: https://github.com/JohanBendz/com.tuya.zigbee/pulls?q=is%3Apr+is%3Aclosed
 * - GitHub issues: https://github.com/JohanBendz/com.tuya.zigbee/issues
 * - Forum analysis: docs/FORUM_ISSUES_ANALYSIS.md
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '../drivers');

// Manufacturer IDs from closed PRs to add
const PR_IMPROVEMENTS = {
  // PR #1085 - TS0201 humidity sensor
  'climate_sensor': {
    manufacturerNames: ['_TZ3000_akqdg6g7', '_TZE204_yjjdcqsq', 'HOBEIAN', 'eWeLink'],
    productIds: ['TS0201', 'ZG-227Z', 'CK-TLSR8656-SS5-01(7014)']
  },
  
  // PR #1074, #1073, #1195, #729 - Curtain motors
  'curtain_motor': {
    manufacturerNames: ['_TZE204_xu4a5rhj', '_TZE204_bjzrowv2', '_TZ3210_dwytrmda', '_TZE200_j1xl73iw'],
    productIds: ['TS0601']
  },
  
  // PR #1072, #898 - 2 gang switch
  'switch_2gang': {
    manufacturerNames: ['_TZ3000_ruldv5dt', '_TZ3000_qaa59zqd'],
    productIds: ['TS0002']
  },
  
  // PR #1027, #735, #740, #724 - Motion/PIR sensors
  'motion_sensor': {
    manufacturerNames: ['_TZE200_3towulqd', '_TZ3000_fa9mlvja', '_TZ3000_rcuyhwe3', '_TZ3000_c8ozah8n', '_TZE200_y8jijhba'],
    productIds: ['TS0601', 'TS0202']
  },
  
  // PR #983 - Rain sensor
  'water_leak_sensor': {
    manufacturerNames: ['_TZ3210_tgvtvdoc'],
    productIds: ['TS0207']
  },
  
  // PR #981, #833 - Dimmers
  'dimmer_wall_1gang': {
    manufacturerNames: ['_TZE204_5cuocqty', '_TZE204_bxoo2swd'],
    productIds: ['TS0601']
  },
  
  // PR #930 - Smart knob (added to switch_dimmer_1gang)
  'switch_dimmer_1gang': {
    manufacturerNames: ['_TZ3000_abrsvsou', '_TZE204_hlx9tnzb'],
    productIds: ['TS004F', 'TS0601']
  },
  
  // PR #835 - 1 gang switch
  'switch_1gang': {
    manufacturerNames: ['_TZ3000_8rppvwda'],
    productIds: ['TS0001']
  },
  
  // PR #829 - Air quality
  'air_quality_comprehensive': {
    manufacturerNames: ['_TZE200_yvx5lh6k'],
    productIds: ['TS0601']
  },
  
  // PR #882, #948 - Smoke detector
  'smoke_detector_advanced': {
    manufacturerNames: ['_TZ3210_up3pngle', '_TZE284_gyzlwu5q', '_TZE200_ux8dlkev'],
    productIds: ['TS0205', 'TS0601']
  },
  
  // PR #1333 - Siren
  'siren': {
    manufacturerNames: ['_TZE200_t1blo2bj'],
    productIds: ['TS0601']
  },
  
  // PR #1306, #774, #1122 - Radar sensors
  'presence_sensor_radar': {
    manufacturerNames: ['_TZE200_rhgsbacq', '_TZE200_2aaelwxk', '_TZE200_kb5noeto', '_TZE284_iadro9bf', '_TZE204_gkfbdvyx'],
    productIds: ['TS0601']
  },
  
  // PR #1209, #1118 - Smart plugs
  'plug_smart': {
    manufacturerNames: ['_TZ3000_kfu8zapd', '_TZ3000_ww6drja5'],
    productIds: ['TS011F']
  },
  
  // PR #1162, #876 - Contact sensors
  'contact_sensor': {
    manufacturerNames: ['_TZ3000_o4mkahkc', 'HOBEIAN', 'eWeLink'],
    productIds: ['TS0203', 'ZG-102Z', 'SNZB-04']
  },
  
  // PR #1128 - Smart buttons
  'button_wireless_1': {
    manufacturerNames: ['_TZ3000_an5rjiwd'],
    productIds: ['TS0041']
  },
  
  // PR #1075 - LED strip
  'led_strip': {
    manufacturerNames: ['_TZ3210_eejm8dcr'],
    productIds: ['TS0505B']
  },
  
  // PR #904 - Door/window sensor eWeLink
  'contact_sensor': {
    manufacturerNames: ['eWeLink'],
    productIds: ['SNZB-04']
  },
  
  // Fingerbot support
  'fingerbot': {
    manufacturerNames: ['_TZ3210_j4pdtz9v', '_TZ3210_dse8ogfy', '_TZ3210_232nryqh', '_TZ3210_okbss9dy'],
    productIds: ['TS0001', 'TS0001_fingerbot']
  },
  
  // Additional PRs - 4 gang relay boards
  'switch_4gang': {
    manufacturerNames: ['_TZ3000_cfnprab5', '_TZ3000_hdopuwv6', '_TZ3000_aqsjyh1h'],
    productIds: ['TS0004']
  },
  
  // Additional PRs - 1CH/2CH relay boards
  'relay_1ch': {
    manufacturerNames: ['_TZ3000_mx3vgyea', '_TZ3000_qewo8dlz', '_TZ3000_v7chgqso'],
    productIds: ['TS0001']
  },
  
  // Additional thermostat support (006 series)
  'thermostat_heating': {
    manufacturerNames: ['_TZE200_bvu2wnxz', '_TZE200_kds22l0t', '_TZE200_husqqvux', '_TZE200_kfvq6avy'],
    productIds: ['TS0601']
  },
  
  // Additional door/window sensor
  'contact_sensor_2': {
    manufacturerNames: ['_TZ3000_oxslv1c9', '_TZ3000_2mbfxlzr', '_TZ3000_402jjyro'],
    productIds: ['TS0203']
  },
  
  // Additional button wireless
  'button_wireless_4': {
    manufacturerNames: ['_TZ3000_wkai4ga5', '_TZ3000_5tqxpine', '_TZ3000_rrjr1q0u'],
    productIds: ['TS0044']
  },
  
  // Additional scene switches
  'scene_switch_4': {
    manufacturerNames: ['_TZ3000_wkai4ga5', '_TZ3000_5tqxpine', '_TZ3000_xabckq1v'],
    productIds: ['ERS-10TZBVK-AA']
  }
};

// Statistics
let stats = {
  driversUpdated: 0,
  manufacturerNamesAdded: 0,
  productIdsAdded: 0,
  errors: []
};

console.log('=== APPLY PR IMPROVEMENTS v5.5.780 ===\n');

// Process each driver
Object.entries(PR_IMPROVEMENTS).forEach(([driverName, improvements]) => {
  const driverPath = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
  
  if (!fs.existsSync(driverPath)) {
    console.log(`⚠️ Driver not found: ${driverName}`);
    stats.errors.push(`Driver not found: ${driverName}`);
    return;
  }
  
  try {
    const config = JSON.parse(fs.readFileSync(driverPath, 'utf8'));
    let updated = false;
    
    // Get current lists
    const currentMfrs = config.zigbee?.manufacturerName || [];
    const currentPids = config.zigbee?.productId || [];
    
    // Add missing manufacturerNames
    improvements.manufacturerNames.forEach(mfr => {
      // Case-insensitive check
      const exists = currentMfrs.some(m => m.toLowerCase() === mfr.toLowerCase());
      if (!exists) {
        currentMfrs.push(mfr);
        stats.manufacturerNamesAdded++;
        updated = true;
        console.log(`✅ ${driverName}: Added manufacturerName "${mfr}"`);
      }
    });
    
    // Add missing productIds
    improvements.productIds.forEach(pid => {
      const exists = currentPids.some(p => p.toLowerCase() === pid.toLowerCase());
      if (!exists) {
        currentPids.push(pid);
        stats.productIdsAdded++;
        updated = true;
        console.log(`✅ ${driverName}: Added productId "${pid}"`);
      }
    });
    
    // Save if updated
    if (updated) {
      config.zigbee.manufacturerName = currentMfrs;
      config.zigbee.productId = currentPids;
      fs.writeFileSync(driverPath, JSON.stringify(config, null, 2));
      stats.driversUpdated++;
    }
    
  } catch (err) {
    console.log(`❌ Error processing ${driverName}: ${err.message}`);
    stats.errors.push(`${driverName}: ${err.message}`);
  }
});

// Summary
console.log('\n=== SUMMARY ===');
console.log(`Drivers Updated: ${stats.driversUpdated}`);
console.log(`ManufacturerNames Added: ${stats.manufacturerNamesAdded}`);
console.log(`ProductIds Added: ${stats.productIdsAdded}`);
console.log(`Errors: ${stats.errors.length}`);

if (stats.errors.length > 0) {
  console.log('\nErrors:');
  stats.errors.forEach(e => console.log(`  - ${e}`));
}

console.log('\n✅ PR improvements applied successfully!');
