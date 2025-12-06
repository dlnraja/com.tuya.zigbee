#!/usr/bin/env node
/**
 * JohanBendz Issues Enrichment Script v5.5.2
 * Extrait les manufacturer names des issues JohanBendz et les ajoute aux drivers
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');

// Issues JohanBendz extraites (Issues #1269-#1322)
const JOHANBENDZ_ISSUES = {
  // #1322 - mmWave Motion Sensor
  '_TZE204_gkfbdvyx': { driver: 'motion_sensor_radar_mmwave', productId: 'TS0601', type: 'radar' },

  // #1321 - PIR Sensor
  '_TZE200_ghynnvos': { driver: 'motion_sensor', productId: 'TS0601', type: 'motion' },

  // #1320 - Smart Light Sensor
  '_TZ3000_hy6ncvmw': { driver: 'motion_sensor', productId: 'TS0222', type: 'light_sensor' },

  // #1318 - Temperature & Humidity
  '_TZ3000_bgsigers': { driver: 'climate_sensor', productId: 'TS0201', type: 'climate' },

  // #1314 - Radar Sensor
  '_TZE204_iaeejhvf': { driver: 'presence_sensor_radar', productId: 'TS0601', type: 'radar' },

  // #1313 - Curtain Module
  '_TZ3210_dwytrmda': { driver: 'curtain_motor', productId: 'TS130F', type: 'curtain' },

  // #1312 - Power Socket
  '_TZ3210_cehuw1lw': { driver: 'plug_energy_monitor', productId: 'TS011F', type: 'plug' },

  // #1311 - 2CH Dimmer
  '_TZ3000_7ysdnebc': { driver: 'dimmer_dual_channel', productId: 'TS1101', type: 'dimmer' },

  // #1310 - Thermostat
  '_TZE200_9xfjixap': { driver: 'thermostat_tuya_dp', productId: 'TS0601', type: 'thermostat' },

  // #1307 - Wall Socket USB-C
  '_TZE200_dcrrztpa': { driver: 'usb_outlet_advanced', productId: 'TS0601', type: 'usb_outlet' },

  // #1301 - Curtain Motor MOES
  '_TZE200_nv6nxo0c': { driver: 'curtain_motor', productId: 'TS0601', type: 'curtain' },

  // #1300 - Power Socket 20A
  '_TZ3210_fgwhjm9j': { driver: 'plug_energy_monitor', productId: 'TS011F', type: 'plug' },

  // #1297 - 4 Gang Wall Switch
  '_TZE200_dq8bu0pt': { driver: 'switch_4gang', productId: 'TS0601', type: 'switch' },

  // #1296 - Smart Socket
  '_TZ3000_uwaort14': { driver: 'plug_smart', productId: 'TS011F', type: 'plug' },

  // #1295 - Double Wall Socket USB
  '_TZ3000_dd8wwzcy': { driver: 'usb_outlet_advanced', productId: 'TS011F', type: 'usb_outlet' },

  // #1293 - Curtain Motor
  '_TZE200_ol5jlkkr': { driver: 'curtain_motor', productId: 'TS0601', type: 'curtain' },

  // #1291 - Temperature Humidity
  '_TZE200_rxq4iti9': { driver: 'climate_sensor', productId: 'TS0601', type: 'climate' },

  // #1290 - Smart Plug metering
  '_TZ3210_alxkwn0h': { driver: 'plug_energy_monitor', productId: 'TS0201', type: 'plug' },

  // #1288 - Solar Rain Sensor
  '_TZ3210_tgvtvdoc': { driver: 'rain_sensor', productId: 'TS0207', type: 'rain' },

  // #1286 - Roller Shutter
  '_TZE284_uqfph8ah': { driver: 'curtain_motor', productId: 'TS0601', type: 'shutter' },

  // #1280 - Soil Sensor
  '_TZE284_myd45weu': { driver: 'soil_sensor', productId: 'TS0601', type: 'soil' },

  // #1279 - Smoke detector
  '_TZE284_n4ttsck2': { driver: 'smoke_detector_advanced', productId: 'TS0601', type: 'smoke' },

  // #1272 - Rain/Light Sensor
  '_TZE200_u6x1zyv2': { driver: 'rain_sensor', productId: 'TS0601', type: 'rain_light' },

  // #1270 - Radar 5.8G
  '_TZ321C_fkzihax8': { driver: 'presence_sensor_radar', productId: 'TS0225', type: 'radar' },
};

// Additional manufacturers from forum and other sources
const ADDITIONAL_MANUFACTURERS = {
  // Forum reports
  '_TZ3000_0dumfk2z': { driver: 'button_emergency_sos', productId: 'TS0215A', type: 'sos' },
  '_TZE200_rhgsbacq': { driver: 'motion_sensor_radar_mmwave', productId: 'TS0601', type: 'radar' },
  '_TZE284_vvmbj46n': { driver: 'climate_sensor', productId: 'TS0601', type: 'climate' },
  '_TZE284_oitavov2': { driver: 'soil_sensor', productId: 'TS0601', type: 'soil' },
  '_TZ3000_h1ipgkwn': { driver: 'switch_2gang', productId: 'TS0002', type: 'switch' },
};

function enrichDriver(driverName, manufacturers) {
  const driverPath = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');

  if (!fs.existsSync(driverPath)) {
    console.log(`⚠️ Driver ${driverName} not found`);
    return { success: false, reason: 'not_found' };
  }

  try {
    const driverData = JSON.parse(fs.readFileSync(driverPath, 'utf8'));
    const currentManufacturers = driverData.zigbee?.manufacturerName || [];
    const currentProducts = driverData.zigbee?.productId || [];

    let modified = false;
    let addedMfrs = [];
    let addedProducts = [];

    for (const [mfr, info] of Object.entries(manufacturers)) {
      if (info.driver !== driverName) continue;

      if (!currentManufacturers.includes(mfr)) {
        currentManufacturers.push(mfr);
        addedMfrs.push(mfr);
        modified = true;
      }

      if (info.productId && !currentProducts.includes(info.productId)) {
        currentProducts.push(info.productId);
        addedProducts.push(info.productId);
        modified = true;
      }
    }

    if (modified) {
      driverData.zigbee.manufacturerName = currentManufacturers;
      driverData.zigbee.productId = currentProducts;
      fs.writeFileSync(driverPath, JSON.stringify(driverData, null, 2) + '\n');
      console.log(`✅ ${driverName}: +${addedMfrs.length} manufacturers, +${addedProducts.length} products`);
      if (addedMfrs.length > 0) console.log(`   Manufacturers: ${addedMfrs.join(', ')}`);
      return { success: true, modified: true, addedMfrs, addedProducts };
    }

    return { success: true, modified: false };
  } catch (error) {
    console.error(`❌ Error for ${driverName}: ${error.message}`);
    return { success: false, reason: error.message };
  }
}

function main() {
  console.log('🚀 JohanBendz Issues Enrichment Script v5.5.2');
  console.log('═══════════════════════════════════════════════\n');

  // Combine all manufacturers
  const allManufacturers = { ...JOHANBENDZ_ISSUES, ...ADDITIONAL_MANUFACTURERS };

  // Get unique drivers
  const drivers = [...new Set(Object.values(allManufacturers).map(m => m.driver))];

  console.log(`📦 ${Object.keys(allManufacturers).length} manufacturers to process`);
  console.log(`📂 ${drivers.length} drivers to enrich\n`);

  let enriched = 0;
  let unchanged = 0;
  let failed = 0;

  for (const driver of drivers) {
    const result = enrichDriver(driver, allManufacturers);
    if (result.success && result.modified) {
      enriched++;
    } else if (result.success) {
      unchanged++;
    } else {
      failed++;
    }
  }

  console.log('\n═══════════════════════════════════════════════');
  console.log('📊 SUMMARY:');
  console.log(`  ✅ Enriched: ${enriched}`);
  console.log(`  ⏭️ Unchanged: ${unchanged}`);
  console.log(`  ⚠️ Failed: ${failed}`);
  console.log(`  📦 Total manufacturers: ${Object.keys(allManufacturers).length}`);
}

main();
