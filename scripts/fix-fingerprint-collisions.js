/**
 * Fix Fingerprinting Collisions
 * Based on the 11 rules for manufacturerName/productId management
 */
const fs = require('fs');
const path = require('path');

const driversDir = 'drivers';

// Define which manufacturerName belongs to which driver (based on device function)
const FIXES = {
  // Button wireless IDs that DON'T belong in switch drivers
  'switch_1gang': {
    remove: [
      '_TZ3000_yj6k7vfo', // button
      '_TZ3000_a4xycprs', // button
      '_TZ3000_5tqxpine', // button
      '_TZ3000_nuombroo', // button
      '_TZ3000_xabckq1v', // button
      '_TZ3000_11pg3ima', // button
      '_TZ3000_et7afzxz', // button
      '_TZ3000_iy2c3n6p', // button
    ]
  },
  'switch_2gang': {
    remove: [
      '_TZ3000_a7ouggvs', // button
      '_TZ3000_dziaict4', // button
      '_TZ3000_ee8nrt2l', // button
      '_TZ3000_kfu8zapd', // button
      '_TZ3000_b3mgfu0d', // button
    ]
  },
  'switch_3gang': {
    remove: [
      '_TZ3000_mh9px7cq', // button
      '_TZ3000_u3nv1jwk', // button
    ]
  },

  // Button IDs - clean up duplicates between button drivers
  'button_wireless': {
    remove: [
      '_TZ3000_fkvaniuu', // keep in button_wireless_3
    ]
  },
  'button_wireless_1': {
    remove: [
      '_TZ3000_czuyt8lz', // keep in button_wireless_4
      '_TZ3000_w8jwkczz', // keep in button_wireless_3
    ]
  },
  'button_wireless_3': {
    remove: [
      '_TZ3000_gjrubzje', // this is a plug, not button
      '_TZ3000_qzjcsmar', // this is a dimmer
    ]
  },
  'button_wireless_4': {
    remove: [
      '_TZ3000_0ht8dnxj', // this is air quality sensor
    ]
  },

  // Climate sensor has many IDs that don't belong
  'climate_sensor': {
    remove: [
      '_TZ3000_4ugnzsli', // contact sensor
      '_TZ3000_6zvw8ham', // scene switch
      '_TZ3000_gntwytxo', // contact sensor
      '_TZ3000_n2egfsli', // contact sensor
      '_TZ3290_7v1k4vufotpowp9z', // IR blaster
      '_TZ3290_acv1iuslxi3shaaj', // IR blaster
      '_TZ3290_j37rooaxrcdcqo5n', // IR blaster
      '_TZ3290_u9xac5rv', // IR blaster
      '_TZE200_locansqn', // radiator controller
      '_TZE204_gkfbdvyx', // motion sensor radar
      '_TZE284_aao6qtcs', // gas detector
    ]
  },

  // Contact sensor cleanup
  'contact_sensor': {
    remove: [
      '_TZE204_nklqjk62', // door controller (actuator)
      '_TZE204_r0jdjrvi', // presence sensor radar
    ]
  },

  // Radiator controller - remove switch IDs (these are relays, not radiator-specific)
  'radiator_controller': {
    remove: [
      '_TZ3000_4whigl8i',
      '_TZ3000_lupfd8zu',
      '_TZ3000_zmy4lslw',
      '_TZ3000_egvb1p2g',
      '_TZ3000_zgtbi4oy',
      '_TZ3000_8ybe88nf',
      '_TZ3000_4rbqgcuv',
      '_TZ3000_drc9tuqb',
      '_TZ3000_lbtpiody',
      '_TZ3000_qgwcxxws',
      '_TZ3000_rgpqqmbj',
      '_TZ3000_veu2v775',
      '_TZ3000_wqcbzbae',
      '_TZ3000_xrqsdxq6',
      '_TZ3000_zsh6uat3',
      '_TZE200_bkkmqmyo',
      '_TZE204_bkkmqmyo',
      '_TZE200_cowvfni3', // curtain motor
    ]
  },

  // Rain sensor - remove water leak sensor IDs
  'rain_sensor': {
    remove: [
      '_TZ3000_0s9gukzt',
      '_TZ3000_k4ej3ww2',
      '_TZ3000_kstbkt6a',
      '_TZ3000_kyb656no',
      '_TZ3000_mugyhz0q',
      '_TZ3000_ocjlo4ea',
      '_TZ3000_t6jriawg',
      '_TZ3000_upgcbody',
      '_TZ3000_tvuarksa', // plug energy monitor
    ]
  },

  // Motion sensor cleanup
  'motion_sensor': {
    remove: [
      '_TZ3000_lf56vpxj', // vibration sensor
    ]
  },

  // Motion sensor radar - keep only radar-specific IDs
  'motion_sensor_radar_mmwave': {
    remove: [
      '_TZE204_gkfbdvyx', // already in motion_sensor
    ]
  },

  // Plug energy monitor
  'plug_energy_monitor': {
    remove: [
      '_TZ3000_gjrubzje', // button wireless
    ]
  },

  // Dimmer
  'dimmer_wall_1gang': {
    remove: [
      '_TZ3000_qzjcsmar', // button wireless
    ]
  },

  // Scene switch
  'scene_switch_1': {
    remove: [
      '_TZ3000_6zvw8ham', // climate sensor ID incorrectly added
    ]
  },
  'scene_switch_4': {
    remove: [
      '_TZ3000_zgyzgdua', // switch_1gang
    ]
  },
};

let totalFixed = 0;

Object.entries(FIXES).forEach(([driverName, config]) => {
  const configPath = path.join(driversDir, driverName, 'driver.compose.json');

  if (!fs.existsSync(configPath)) {
    console.log(`⚠️ Driver not found: ${driverName}`);
    return;
  }

  try {
    const driverConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const mfrs = driverConfig.zigbee?.manufacturerName || [];

    const toRemove = config.remove || [];
    const originalCount = mfrs.length;

    // Filter out the IDs to remove
    const filtered = mfrs.filter(mfr => !toRemove.includes(mfr));

    if (filtered.length < originalCount) {
      driverConfig.zigbee.manufacturerName = filtered;
      fs.writeFileSync(configPath, JSON.stringify(driverConfig, null, 2));

      const removed = originalCount - filtered.length;
      console.log(`✅ ${driverName}: removed ${removed} IDs`);
      totalFixed += removed;
    }
  } catch (err) {
    console.error(`❌ Error processing ${driverName}: ${err.message}`);
  }
});

console.log(`\n📊 Total IDs removed: ${totalFixed}`);
