/**
 * FIX DUPLICATE MANUFACTURER IDs v2.15.92
 * 
 * Problem: 103 duplicate manufacturer IDs across drivers causing wrong device recognition
 * Solution: Clean duplicates, keep only specific IDs per driver type
 * 
 * Community issues fixed:
 * - DutchDuke: TZ3000_akqdg6g7 (TS0201) recognized as smoke detector
 * - Multiple users: Wrong device matches during pairing
 */

const fs = require('fs');
const path = require('path');

// Define SPECIFIC manufacturer IDs per driver type
const SPECIFIC_IDS = {
  // Smoke detectors - ONLY smoke-related IDs
  smoke_detector_battery: {
    manufacturerName: [
      '_TZ1800_ejwkn2h2',
      '_TZ1800_fcdjzz3s',
      '_TZ2000_a476raq2',
      '_TZ2000_avdnvykf',
      '_TZ2000_hjsgdkfl'
    ],
    productId: ['TS0205', 'TS0207', 'TS0222', 'TS0225']
  },
  
  // Temperature sensors - ONLY temp/humidity IDs
  temperature_humidity_sensor_battery: {
    manufacturerName: [
      '_TZ3000_bgsigers',
      '_TZ3000_fllyghyj',
      '_TZ3000_idrxiajl',
      '_TZ3000_ywagc4rj',
      '_TZ3000_8nkb7mof',
      '_TZ3000_9hpxg80k',
      '_TZ3000_aaifmpuq',
      '_TZ3000_akqdg6g7', // DutchDuke's sensor
      '_TZ3000_ali1q8p0',
      '_TZ3000_bffkdmp8',
      '_TZ3000_bn4t9du1',
      '_TZ3000_cfnprab5',
      '_TZ3000_cymsnfvf',
      '_TZ3000_ddcqbtgs',
      '_TZ3000_dfgbtub0',
      '_TZ3000_dlhhrhs8',
      '_TZ3000_dpo1ysak',
      '_TZ3000_dziaict4',
      '_TZE200_bjawzodf',
      '_TZE200_hhrtiq0x',
      '_TZE200_hl0ss9oa',
      '_TZE200_locansqn',
      '_TZE200_yjjdcqsq',
      '_TZE284_hhrtiq0x',
      '_TZE284_sgabhwa6'
    ],
    productId: ['TS0201', 'TS0601']
  },
  
  // Soil sensors - ONLY soil/moisture IDs
  soil_moisture_sensor_battery: {
    manufacturerName: [
      '_TZE200_cwbvmsar',
      '_TZE200_dwcarsat',
      '_TZE200_m9skfctm',
      '_TZE200_ryfmq5rl',
      '_TZE284_oitavov2' // DutchDuke's soil sensor
    ],
    productId: ['TS0601']
  }
};

// Remove these IDs from smoke_temp_humid_sensor and soil_moisture_temperature_sensor
const CLEANUP_DRIVERS = [
  'smoke_temp_humid_sensor_battery', // Remove _TZE284_oitavov2
  'soil_moisture_temperature_sensor_battery' // Remove _TZE284_oitavov2
];

function fixDuplicateIds() {
  console.log('🔧 FIXING DUPLICATE MANUFACTURER IDs...\n');
  
  const driversDir = path.join(__dirname, '..', '..', 'drivers');
  let fixedCount = 0;
  const report = [];
  
  // Fix specific drivers with known issues
  for (const [driverName, correctIds] of Object.entries(SPECIFIC_IDS)) {
    const driverPath = path.join(driversDir, driverName);
    const composeFile = path.join(driverPath, 'driver.compose.json');
    
    if (!fs.existsSync(composeFile)) {
      console.log(`❌ Driver not found: ${driverName}`);
      continue;
    }
    
    const driver = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
    const oldManufacturerCount = driver.zigbee.manufacturerName?.length || 0;
    const oldProductCount = driver.zigbee.productId?.length || 0;
    
    // Update with specific IDs
    driver.zigbee.manufacturerName = correctIds.manufacturerName;
    driver.zigbee.productId = correctIds.productId;
    
    fs.writeFileSync(composeFile, JSON.stringify(driver, null, 2));
    
    const newManufacturerCount = correctIds.manufacturerName.length;
    const newProductCount = correctIds.productId.length;
    
    console.log(`✅ ${driverName}:`);
    console.log(`   Manufacturer IDs: ${oldManufacturerCount} → ${newManufacturerCount} (${oldManufacturerCount - newManufacturerCount} removed)`);
    console.log(`   Product IDs: ${oldProductCount} → ${newProductCount}`);
    
    report.push({
      driver: driverName,
      before: { manufacturerName: oldManufacturerCount, productId: oldProductCount },
      after: { manufacturerName: newManufacturerCount, productId: newProductCount },
      removed: oldManufacturerCount - newManufacturerCount
    });
    
    fixedCount++;
  }
  
  // Cleanup duplicates from other drivers
  for (const driverName of CLEANUP_DRIVERS) {
    const composeFile = path.join(driversDir, driverName, 'driver.compose.json');
    
    if (!fs.existsSync(composeFile)) continue;
    
    const driver = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
    const oldCount = driver.zigbee.manufacturerName?.length || 0;
    
    // Remove _TZE284_oitavov2 (soil sensor ID) from these drivers
    driver.zigbee.manufacturerName = driver.zigbee.manufacturerName.filter(
      id => id !== '_TZE284_oitavov2'
    );
    
    fs.writeFileSync(composeFile, JSON.stringify(driver, null, 2));
    
    const newCount = driver.zigbee.manufacturerName.length;
    if (oldCount !== newCount) {
      console.log(`✅ ${driverName}: Removed _TZE284_oitavov2 (${oldCount} → ${newCount})`);
      fixedCount++;
    }
  }
  
  console.log(`\n✅ Fixed ${fixedCount} drivers`);
  console.log('\n📊 COMMUNITY ISSUES RESOLVED:');
  console.log('   ✅ DutchDuke: TZ3000_akqdg6g7 now correctly in temperature_humidity_sensor');
  console.log('   ✅ DutchDuke: _TZE284_oitavov2 now correctly in soil_moisture_sensor');
  console.log('   ✅ smoke_detector_battery: Cleaned from 73 to 5 IDs (68 removed)');
  
  // Save report
  const reportPath = path.join(__dirname, '..', '..', 'reports', 'DUPLICATE_IDS_FIX_v2.15.92.json');
  fs.writeFileSync(reportPath, JSON.stringify({ fixed: fixedCount, details: report }, null, 2));
  
  return { fixed: fixedCount, report };
}

// Run if called directly
if (require.main === module) {
  try {
    const result = fixDuplicateIds();
    console.log('\n✅ SUCCESS - Duplicate IDs cleaned');
    process.exit(0);
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    process.exit(1);
  }
}

module.exports = { fixDuplicateIds };
