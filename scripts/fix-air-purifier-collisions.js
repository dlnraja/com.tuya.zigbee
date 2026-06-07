/**
 * fix-air-purifier-collisions.js
 * 
 * Removes manufacturerNames from air_purifier that are duplicated in more specific drivers.
 * These MFRs with TS0601 exist in both air_purifier AND a specific driver —
 * the specific driver should win (it knows the device type better).
 * 
 * Strategy:
 * - Keep in air_purifier ONLY MFRs that are not present in ANY other driver
 * - Remove from air_purifier MFRs that appear in more specific drivers (climate, dimmer, etc.)
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

// MFR+PID true collisions found by validate-drivers.js — MFRs to REMOVE from air_purifier
// (they belong to more specific drivers)
const MFRS_TO_REMOVE_FROM_AIR_PURIFIER = [
  // Climate/Temp sensors
  '_TZ3000_0s1izerx',
  '_TZ3000_6uzkisv2',
  '_TZ3000_akqdg6g7',
  '_TZ3000_bguser20',
  '_TZ3000_bjawzodf',
  '_TZ3000_dowj6gyi',
  '_TZ3000_fllyghyj',
  '_TZ3000_i8jfiezr',
  '_TZ3000_saiqcn0y',
  '_TZ3000_xr3htd96',
  '_TZ3000_yd2e749y',
  '_TZE200_8ygsuhe1',
  '_TZE200_a8sdabtg',
  '_TZE200_c2fmom5z',
  '_TZE200_cirvgep4',
  '_TZE200_mja3fuja',
  '_TZE200_qyflbnbj',
  '_TZE200_ryfmq5rl',
  '_TZE200_utkemkbs',
  '_TZE200_vs0skpuc',
  '_TZE200_yvx5lh6k',
  '_TZE204_9yapgbuv',
  '_TZE204_cirvgep4',
  '_TZE204_utkemkbs',

  // Dimmers
  '_TZE200_0nauxa0p',
  '_TZE200_3p5ydos3',
  '_TZE200_9cxuhakf',
  '_TZE200_a0syesf5',
  '_TZE200_e3oitdyu',
  '_TZE200_la2c2uo9',
  '_TZE200_p0gzbqct',
  '_TZE200_whpb9yts',
  '_TZE204_hlx9tnzb',

  // Plugs / Smart switches
  '_TZE200_2se8efxh',
  '_TZE200_9cqcpkgb',
  '_TZE200_ga1maeof',
  '_TZE200_gbagoilo',
  '_TZE200_jwsjbxjs',
  '_TZE200_myd45weu',
  '_TZE204_myd45weu',

  // Dimmer 2gang + soil
  '_TZE200_9i9dt8is',
  '_TZE200_dfxkcots',

  // Soil sensors
  '_TZE200_ctq0k47x',
  '_TZE200_ebwgzdqq',
  '_TZE200_ojzhk75b',
  '_TZE200_swaamsoy',
  '_TZE200_w4cryh2i',

  // Smoke detectors
  '_TZE200_m9skfctm',
  '_TZE200_ntcy3xu1',
  '_TZE200_rccxox8p',
  '_TZE200_t5p1vj8r',
  '_TZE200_uebojraa',
  '_TZE200_vzekyi4c',
  '_TZE200_yh7aoahi',

  // Buttons
  '_TZE200_44af8vyi',
  '_tze200_44af8vyi',
  '_TZE200_44AF8VYI',
  '_TZE200_bjawzodf',
  '_tze200_bjawzodf',
  '_TZE200_BJAWZODF',
  '_TZE200_bq5c8xfe',
  '_tze200_bq5c8xfe',
  '_TZE200_BQ5C8XFE',
  '_TZ3000_itnrsufe',

  // Buttons / Scene remotes
  '_TZE200_zl1kmjqx',
  '_tze200_zl1kmjqx',
  '_TZE200_ZL1KMJQX',

  // Water/Valve
  '_TZE200_jthf7vb6',
  '_TZE200_qq9mpfhw',

  // Contact sensor
  '_TZ3000_qaaysllp',

  // Doorbell / Siren
  '_TZ3000_ywagc4rj',
  '_TZE200_d0yu2xgi',

  // Wall switch 4gang
  '_TZE200_shkxsgis',

  // Dimmer 1gang switch
  // already covered above

  // Air purifier sensor (keep in air_purifier_sensor, remove from here)
  '_TZE200_QPN5Q17M',

  // device_air_purifier_climate
  '_TZE204_7BZTMFM1',
  '_tze200_7bztmfm1',
  '_TZE200_7BZTMFM1',

  // Air purifier switch
  '_TYST11_d0yu2xgi',

  // Generic tuya (too broad)
  // keeping only confirmed air purifier MFRs

  // Wall thermostat
  // '_TZE200_...' — check below

  // Switch 1gang
  // handled above

  // Water tank monitor
  // handled by ojzhk75b above
];

function fixAirPurifierCollisions() {
  const composePath = path.join(DRIVERS_DIR, 'air_purifier', 'driver.compose.json');
  
  if (!fs.existsSync(composePath)) {
    console.error('❌ air_purifier/driver.compose.json not found!');
    process.exit(1);
  }

  const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
  const originalMfrs = compose.zigbee?.manufacturerName || [];
  
  console.log(`📋 air_purifier: ${originalMfrs.length} manufacturerNames before fix`);
  
  // Create set of MFRs to remove (case-insensitive comparison for safety)
  const toRemoveSet = new Set(MFRS_TO_REMOVE_FROM_AIR_PURIFIER.map(m => m.toLowerCase()));
  
  const filtered = originalMfrs.filter(mfr => {
    const shouldRemove = toRemoveSet.has(mfr.toLowerCase());
    if (shouldRemove) {
      console.log(`  🗑️  Removing: ${mfr} (belongs to more specific driver)`);
    }
    return !shouldRemove;
  });
  
  const removedCount = originalMfrs.length - filtered.length;
  
  compose.zigbee.manufacturerName = filtered;
  
  // Write back
  fs.writeFileSync(composePath, JSON.stringify(compose, null, 2) + '\n', 'utf8');
  
  console.log(`\n✅ air_purifier fixed:`);
  console.log(`   Before: ${originalMfrs.length} MFRs`);
  console.log(`   Removed: ${removedCount} MFRs (cross-driver collisions)`);
  console.log(`   After:  ${filtered.length} MFRs (confirmed air purifiers only)`);
  
  // Validate JSON
  try {
    JSON.parse(fs.readFileSync(composePath, 'utf8'));
    console.log(`✅ JSON valid`);
  } catch (e) {
    console.error(`❌ JSON validation failed: ${e.message}`);
    process.exit(1);
  }
}

fixAirPurifierCollisions();
