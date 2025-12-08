/**
 * INTELLIGENT CONFLICT FIXER v5.5.105
 * Fixes manufacturerName+productId conflicts while respecting RULE 4 (non-regression)
 *
 * RULES APPLIED:
 * - RULE 2: manufacturerName must be exact (not generic brands)
 * - RULE 4: Don't remove existing IDs unless clear error
 * - RULE 5: Same mfr in multiple drivers OK only if productId different
 * - RULE 8: No fingerprint collisions allowed
 */

const fs = require('fs');
const path = require('path');

const driversDir = path.join(__dirname, '../../drivers');

// GENERIC BRANDS TO REMOVE (violate RULE 2)
// These are brand names, not actual Zigbee manufacturerNames
const GENERIC_BRANDS = [
  'SLS', 'Moes', 'Avatto', 'Zemismart', 'LoraTap', 'Haozee', 'Nedis',
  'MOES', 'AVATTO', 'ZEMISMART', 'LORATAP', 'HAOZEE', 'NEDIS',
  'Tuya', 'TUYA', 'Generic', 'Unknown'
];

// CONFLICT RESOLUTION MAP
// For each manufacturerName+productId combo that's in multiple drivers,
// define which driver should keep it
const CONFLICT_RESOLUTIONS = {
  // TRV/Thermostat conflicts - keep in most specific driver
  '_TZE200_kds0pmmv/TS0601': 'radiator_valve',
  '_TZE200_mudxchsu/TS0601': 'radiator_valve',
  '_TZE200_lnbfnyxd/TS0601': 'radiator_valve',
  '_TZE200_hue3yfsn/TS0601': 'radiator_valve',
  '_TZE200_g9a3awaj/TS0601': 'radiator_valve',
  '_TZE200_husqqvux/TS0601': 'radiator_valve',
  '_TZE200_b6wax7g0/TS0601': 'radiator_valve',
  '_TZE204_g9a3awaj/TS0601': 'radiator_valve',
  '_tze200_kds0pmmv/TS0601': 'radiator_valve',
  '_TZE200_c88teujp/TS0601': 'radiator_valve',
  '_TZE200_fhn3negr/TS0601': 'radiator_valve',

  // Button conflicts - based on actual button count
  '_TZ3290_8xzb2ghn/TS0601': 'button_wireless_4',

  // Curtain vs Switch - curtain motors use TS0601 with specific DPs
  '_TZ3000_vw8pawxa/TS0601': 'curtain_motor',
  '_TZ3000_l6iqph4f/TS0601': 'curtain_motor',
  '_TZ3210_dxroobu3/TS0601': 'curtain_motor',
  '_tze200_icka1clh/TS0601': 'curtain_motor',

  // Curtain vs Universal - keep in curtain (more specific)
  '_TZb210_yatkpuha/TS0601': 'curtain_motor',
  '_TZb210_eiwanbeb/TS0601': 'curtain_motor',
  '_TZb210_w9hcix2r/TS0601': 'curtain_motor',
  '_TZb210_wxazcmsh/TS0601': 'curtain_motor',

  // Climate vs Radar - radar sensors are specific
  '_TZE200_sgpeacqp/TS0601': 'motion_sensor_radar_mmwave',
  '_TZE204_ztc6ggyl/TS0225': 'motion_sensor_radar_mmwave',
  '_TZE204_uxllnywp/TS0225': 'motion_sensor_radar_mmwave',
  '_tze200_clrdrnya/TS0601': 'motion_sensor_radar_mmwave',
  '_TZE200_3towulqd/TS0225': 'motion_sensor_radar_mmwave',
  '_TZE200_lyetpprm/TS0225': 'motion_sensor_radar_mmwave',
  '_tze200_s6hzw8g2/TS0601': 'motion_sensor',

  // Climate vs Soil - soil sensors
  '_TZE284_g2e6cpnw/TS0601': 'soil_sensor',
  '_TZE284_sgabhwa6/TS0601': 'soil_sensor',

  // Switch gang conflicts
  '_TZ3002_ymv5vytn/TS0601': 'switch_2gang',
  '_TZ3002_1s0vfmtv/TS0003': 'switch_2gang',

  // Dimmer conflicts
  '_tze284_znvwzxkq/TS0601': 'dimmer_wall_1gang',
  '_tz3210_a04acm9s/TS0601': 'dimmer_wall_1gang',
  '_TZb210_rkgngb5o/TS110E': 'dimmer_dual_channel',

  // Plug vs USB
  '_TZ3000_rdtixbnu/TS0121': 'plug_energy_monitor',
  '_TZ3000_cphmq0q7/TS0601': 'plug_energy_monitor',

  // Climate vs Switch
  '_tze200_hewlydpz/TS0601': 'climate_sensor',

  // Module vs Switch
  '_TZ3000_ji4araar/TS0011': 'switch_1gang',

  // Motion/Radar/Vibration conflicts
  '_TZE200_bh3n6gk8/TS0601': 'motion_sensor_radar_mmwave',
  '_TZE200_xpq2rzhq/TS0601': 'motion_sensor_radar_mmwave',
  '_TZE200_wukb7rhc/TS0601': 'motion_sensor_radar_mmwave',
  '_TZE204_ijxvkhd0/TS0601': 'motion_sensor_radar_mmwave',
  '_tze204_lbbg34rj/TS0601': 'motion_sensor_radar_mmwave',
  '_tze204_pfayrzcw/TS0225': 'motion_sensor_radar_mmwave',
  '_TZ3000_lf56vpxj/TS0601': 'vibration_sensor',
  '_TZ3000_osu834un/TS0601': 'vibration_sensor',
  '_TZ3000_osu834un/TS0210': 'vibration_sensor',

  // Switch/Module conflicts - keep in switch_1gang (more common)
  '_TZ3000_fdxihpp7/BASICZBR3': 'switch_1gang',
  '_TZ3000_fdxihpp7/TS0011': 'switch_1gang',
  '_TZ3000_txpirhfq/BASICZBR3': 'switch_1gang',
  '_TZ3000_npzfdcof/TS0011': 'switch_1gang',

  // Plug/USB conflicts - keep based on device type
  '_TZ3000_typdpbpg/TS011F': 'plug_energy_monitor',
  '_TZ3000_cehuw1lw/TS011F': 'usb_outlet_advanced',
  '_TZ3000_w0qqde0g/TS011F': 'plug_energy_monitor',
  '_TZ3000_okaz9tjs/TS011F': 'usb_outlet_advanced',
  '_TZ3000_ksw8qtmt/TS0601': 'plug_energy_monitor',

  // Dimmer/Plug conflicts
  '_tz3210_i680rtja/TS0601': 'dimmer_wall_1gang',
  '_tz3210_9q49basr/TS0601': 'dimmer_wall_1gang',
  '_tz3210_ttkgurpb/TS0601': 'dimmer_wall_1gang',
  '_tz3210_ysfo0wla/TS0601': 'dimmer_wall_1gang',
  '_tz3210_lzqq3u4r/TS0601': 'dimmer_wall_1gang',
  '_tze204_hlx9tnzb/TS0601': 'dimmer_wall_1gang',

  // Contact/Switch conflicts
  '_TZ3000_q50zhdsc/TS0601': 'contact_sensor',

  // Climate/Soil conflicts
  '_TZE200_2se8efxh/TS0601': 'soil_sensor',

  // Climate/Smoke conflicts
  '_TZE200_m9skfctm/TS0601': 'smoke_detector_advanced',

  // Curtain/Switch conflicts
  '_TZ3000_ctbafvhm/TS0601': 'curtain_motor',

  // Switch 1gang vs 2gang conflicts
  '_TZ3002_6ahhkwyh/TS0601': 'switch_2gang',
  '_TZ3002_iedhxgyi/TS0601': 'switch_2gang',
  '_TZ3002_gdwja9a7/TS0601': 'switch_2gang',

  // Plug vs Switch conflicts
  '_TZ3000_2uollq9d/TS0001': 'switch_1gang',
  '_TZ3000_cicwjqth/TS0001': 'switch_1gang',
  '_TZ3000_gazjngjl/TS0601': 'switch_1gang',
  '_TZ3000_iy2c3n6p/TS0601': 'switch_1gang',

  // Curtain vs Universal
  '_TZb210_0bkzabht/TS0601': 'curtain_motor',
  '_TZb210_ue01a0s2/TS0601': 'curtain_motor',

  // Generic vs Universal
  '_TZb210_rwy5hexp/TS0601': 'zigbee_universal',

  // Climate vs Curtain
  '_tze200_5nldle7w/TS0601': 'curtain_motor',
};

// PATTERN-BASED RESOLUTIONS
// For conflicts not in explicit map, use pattern matching
const PATTERN_RULES = [
  // Curtain motors - keep in curtain_motor over switch
  { pattern: /curtain.*switch/i, keep: 'curtain_motor' },
  { pattern: /switch.*curtain/i, keep: 'curtain_motor' },

  // Curtain vs Universal - keep in curtain (more specific)
  { pattern: /curtain.*zigbee_universal/i, keep: 'curtain_motor' },
  { pattern: /zigbee_universal.*curtain/i, keep: 'curtain_motor' },

  // Generic vs Universal - keep in universal
  { pattern: /generic.*zigbee_universal/i, keep: 'zigbee_universal' },
  { pattern: /zigbee_universal.*generic/i, keep: 'zigbee_universal' },

  // Dimmer vs Plug - keep in dimmer (more specific)
  { pattern: /dimmer.*plug/i, keep: 'dimmer_wall_1gang' },
  { pattern: /plug.*dimmer/i, keep: 'dimmer_wall_1gang' },

  // Module vs Switch - keep in switch (more common)
  { pattern: /module.*switch/i, keep: 'switch_1gang' },
  { pattern: /switch.*module/i, keep: 'switch_1gang' },

  // Climate vs Radar/Motion - radar is more specific
  { pattern: /climate.*radar/i, keep: 'motion_sensor_radar_mmwave' },
  { pattern: /radar.*climate/i, keep: 'motion_sensor_radar_mmwave' },

  // Climate vs Soil - soil is more specific
  { pattern: /climate.*soil/i, keep: 'soil_sensor' },
  { pattern: /soil.*climate/i, keep: 'soil_sensor' },

  // Climate vs Smoke - smoke is more specific
  { pattern: /climate.*smoke/i, keep: 'smoke_detector_advanced' },
  { pattern: /smoke.*climate/i, keep: 'smoke_detector_advanced' },
];

function loadDriverCompose(driverName) {
  const composePath = path.join(driversDir, driverName, 'driver.compose.json');
  if (!fs.existsSync(composePath)) return null;
  return JSON.parse(fs.readFileSync(composePath, 'utf8'));
}

function saveDriverCompose(driverName, data) {
  const composePath = path.join(driversDir, driverName, 'driver.compose.json');
  fs.writeFileSync(composePath, JSON.stringify(data, null, 2), 'utf8');
}

function fixConflicts() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║     INTELLIGENT CONFLICT FIXER v5.5.105                        ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const drivers = fs.readdirSync(driversDir).filter(d =>
    fs.statSync(path.join(driversDir, d)).isDirectory()
  );

  let removedBrands = 0;
  let resolvedConflicts = 0;
  let errors = [];

  // STEP 1: Remove generic brands from all drivers
  console.log('STEP 1: Removing generic brands (RULE 2)...\n');

  for (const driver of drivers) {
    const compose = loadDriverCompose(driver);
    if (!compose?.zigbee?.manufacturerName) continue;

    const originalMfrs = [...compose.zigbee.manufacturerName];
    const filteredMfrs = originalMfrs.filter(mfr => !GENERIC_BRANDS.includes(mfr));

    if (filteredMfrs.length < originalMfrs.length) {
      const removed = originalMfrs.filter(m => GENERIC_BRANDS.includes(m));
      console.log(`  ${driver}: Removing ${removed.join(', ')}`);
      compose.zigbee.manufacturerName = filteredMfrs;
      saveDriverCompose(driver, compose);
      removedBrands += removed.length;
    }
  }

  // STEP 2: Resolve specific conflicts
  console.log('\nSTEP 2: Resolving specific conflicts (RULE 8)...\n');

  for (const [combo, targetDriver] of Object.entries(CONFLICT_RESOLUTIONS)) {
    const [mfr, productId] = combo.split('/');

    for (const driver of drivers) {
      if (driver === targetDriver) continue; // Keep in target driver

      const compose = loadDriverCompose(driver);
      if (!compose?.zigbee?.manufacturerName) continue;
      if (!compose.zigbee.productId?.includes(productId)) continue;
      if (!compose.zigbee.manufacturerName.includes(mfr)) continue;

      // Remove from this driver (not the target)
      compose.zigbee.manufacturerName = compose.zigbee.manufacturerName.filter(m => m !== mfr);
      console.log(`  ${combo}: Removed from ${driver} (keeping in ${targetDriver})`);
      saveDriverCompose(driver, compose);
      resolvedConflicts++;
    }
  }

  // Summary
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                         SUMMARY                                ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log(`  Generic brands removed: ${removedBrands}`);
  console.log(`  Conflicts resolved: ${resolvedConflicts}`);
  console.log(`  Errors: ${errors.length}`);

  if (errors.length > 0) {
    console.log('\nErrors:');
    errors.forEach(e => console.log(`  - ${e}`));
  }
}

// Run
fixConflicts();
