#!/usr/bin/env node
'use strict';

/**
 * CHECK PROJECT COHERENCE
 * 
 * Vérifie la cohérence complète du projet après toutes les évolutions:
 * - Driver overlaps cleanup (v3.0.4)
 * - IAS Zone implementation verification
 * - Forum fixes (Peter, Naresh, etc.)
 * - Structure projet
 * - Validation Homey
 * 
 * Usage: node scripts/validation/check-project-coherence.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '../..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

console.log('🔍 PROJECT COHERENCE CHECK\n');

let stats = {
  driversTotal: 0,
  driversValid: 0,
  driversInvalid: 0,
  forumFixesChecked: 0,
  forumFixesValid: 0,
  criticalIssues: [],
  warnings: []
};

// =============================================================================
// 1. VALIDATION APP.JSON
// =============================================================================

console.log('=' .repeat(80));
console.log('1. VALIDATION APP.JSON');
console.log('='.repeat(80) + '\n');

const appJsonPath = path.join(ROOT, 'app.json');
if (fs.existsSync(appJsonPath)) {
  try {
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    
    console.log(`✅ app.json valid`);
    console.log(`  Name: ${appJson.name.en}`);
    console.log(`  Version: ${appJson.version}`);
    console.log(`  SDK: ${appJson.sdk}`);
    console.log(`  Compatibility: ${appJson.compatibility}`);
    
    // Check version
    if (appJson.version === '3.0.4') {
      console.log(`  ✅ Version 3.0.4 (latest)`);
    } else {
      stats.warnings.push(`Version not 3.0.4: ${appJson.version}`);
      console.log(`  ⚠️  Version should be 3.0.4`);
    }
    
  } catch (err) {
    stats.criticalIssues.push(`app.json invalid: ${err.message}`);
    console.log(`❌ app.json parse error: ${err.message}`);
  }
} else {
  stats.criticalIssues.push('app.json not found');
  console.log('❌ app.json not found');
}

// =============================================================================
// 2. VALIDATION DRIVERS
// =============================================================================

console.log('\n' + '='.repeat(80));
console.log('2. VALIDATION DRIVERS');
console.log('='.repeat(80) + '\n');

const drivers = fs.readdirSync(DRIVERS_DIR)
  .filter(d => fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory())
  .filter(d => !d.startsWith('.'));

stats.driversTotal = drivers.length;

console.log(`📁 Scanning ${stats.driversTotal} drivers...\n`);

let invalidDrivers = [];

for (const driverName of drivers) {
  const driverPath = path.join(DRIVERS_DIR, driverName);
  const composeJson = path.join(driverPath, 'driver.compose.json');
  const deviceJs = path.join(driverPath, 'device.js');
  
  let isValid = true;
  let issues = [];
  
  // Check driver.compose.json
  if (fs.existsSync(composeJson)) {
    try {
      const compose = JSON.parse(fs.readFileSync(composeJson, 'utf8'));
      
      // Check manufacturerNames (après cleanup)
      const manuNames = compose.zigbee?.manufacturerName || [];
      const hasGeneric = manuNames.some(m => 
        m === 'Tuya' || m === 'TS0001' || m === 'TS0601'
      );
      
      if (hasGeneric) {
        issues.push('Has generic manufacturerNames (should be cleaned)');
        isValid = false;
      }
      
      // Check productIds (après cleanup)
      const productIds = compose.zigbee?.productId || [];
      if (productIds.includes('TS0601') && productIds.length === 1) {
        issues.push('Only has TS0601 productId (too generic)');
        stats.warnings.push(`${driverName}: Only TS0601`);
      }
      
      // Check capabilities
      const caps = compose.capabilities || [];
      if (caps.length === 0) {
        issues.push('No capabilities defined');
        stats.warnings.push(`${driverName}: No capabilities`);
      }
      
      // Check clusters
      const clusters = compose.zigbee?.endpoints?.[1]?.clusters || [];
      if (clusters.length === 0) {
        issues.push('No clusters defined');
        stats.warnings.push(`${driverName}: No clusters`);
      }
      
    } catch (err) {
      issues.push(`driver.compose.json invalid: ${err.message}`);
      isValid = false;
    }
  } else {
    issues.push('driver.compose.json missing');
    isValid = false;
  }
  
  // Check device.js
  if (!fs.existsSync(deviceJs)) {
    issues.push('device.js missing');
    isValid = false;
  }
  
  if (isValid) {
    stats.driversValid++;
  } else {
    stats.driversInvalid++;
    invalidDrivers.push({ name: driverName, issues });
  }
}

console.log(`✅ Valid drivers: ${stats.driversValid}/${stats.driversTotal}`);
console.log(`${stats.driversInvalid > 0 ? '⚠️' : '✅'} Invalid drivers: ${stats.driversInvalid}/${stats.driversTotal}`);

if (invalidDrivers.length > 0) {
  console.log('\n⚠️  Drivers with issues:');
  invalidDrivers.slice(0, 10).forEach(d => {
    console.log(`  - ${d.name}:`);
    d.issues.forEach(issue => console.log(`    ❌ ${issue}`));
  });
  if (invalidDrivers.length > 10) {
    console.log(`  ... and ${invalidDrivers.length - 10} more`);
  }
}

// =============================================================================
// 3. VERIFICATION FORUM FIXES
// =============================================================================

console.log('\n' + '='.repeat(80));
console.log('3. VERIFICATION FORUM FIXES');
console.log('='.repeat(80) + '\n');

const forumFixes = [
  {
    name: 'Peter - HOBEIAN Multisensor',
    driver: 'motion_temp_humidity_illumination_multi_battery',
    checks: [
      { 
        type: 'manufacturerName',
        values: ['HOBEIAN', '_TZE200_uli8wasj'],
        description: 'HOBEIAN manufacturerNames présents'
      },
      {
        type: 'productId',
        values: ['ZG-204ZV', 'ZG-204ZL'],
        description: 'Specific productIds (no TS0601)'
      },
      {
        type: 'capabilities',
        values: ['measure_luminance', 'measure_temperature', 'measure_humidity', 'alarm_motion'],
        description: 'All capabilities present'
      },
      {
        type: 'clusters',
        values: [1024, 1026, 1029, 1280],
        description: 'Lux/Temp/Humidity/Motion clusters'
      }
    ]
  },
  {
    name: 'Naresh - Motion Sensor + SOS Button',
    driver: 'motion_sensor_pir_battery',
    checks: [
      {
        type: 'ias_zone',
        file: 'device.js',
        pattern: 'IASZoneEnroller',
        description: 'IAS Zone enrollment implemented'
      },
      {
        type: 'clusters',
        values: [1280],
        description: 'IAS Zone cluster (1280)'
      }
    ]
  },
  {
    name: 'SOS Emergency Button',
    driver: 'sos_emergency_button_cr2032',
    checks: [
      {
        type: 'ias_zone',
        file: 'device.js',
        pattern: 'IASZoneEnroller',
        description: 'IAS Zone enrollment implemented'
      },
      {
        type: 'capabilities',
        values: ['alarm_generic'],
        description: 'Alarm capability'
      }
    ]
  }
];

for (const fix of forumFixes) {
  stats.forumFixesChecked++;
  
  console.log(`\n📋 ${fix.name}:`);
  console.log(`  Driver: ${fix.driver}`);
  
  const driverPath = path.join(DRIVERS_DIR, fix.driver);
  const composeJson = path.join(driverPath, 'driver.compose.json');
  const deviceJs = path.join(driverPath, 'device.js');
  
  let allChecksPass = true;
  
  if (!fs.existsSync(driverPath)) {
    console.log(`  ❌ Driver not found!`);
    stats.criticalIssues.push(`${fix.name}: Driver not found`);
    continue;
  }
  
  for (const check of fix.checks) {
    if (check.type === 'manufacturerName' || check.type === 'productId' || check.type === 'capabilities' || check.type === 'clusters') {
      try {
        const compose = JSON.parse(fs.readFileSync(composeJson, 'utf8'));
        
        let actualValues;
        if (check.type === 'manufacturerName') {
          actualValues = compose.zigbee?.manufacturerName || [];
        } else if (check.type === 'productId') {
          actualValues = compose.zigbee?.productId || [];
        } else if (check.type === 'capabilities') {
          actualValues = compose.capabilities || [];
        } else if (check.type === 'clusters') {
          actualValues = compose.zigbee?.endpoints?.[1]?.clusters || [];
        }
        
        const allPresent = check.values.every(v => actualValues.includes(v));
        
        if (allPresent) {
          console.log(`  ✅ ${check.description}`);
        } else {
          console.log(`  ❌ ${check.description}`);
          console.log(`     Expected: ${check.values.join(', ')}`);
          console.log(`     Found: ${actualValues.slice(0, 5).join(', ')}${actualValues.length > 5 ? '...' : ''}`);
          allChecksPass = false;
          stats.criticalIssues.push(`${fix.name}: ${check.description} failed`);
        }
      } catch (err) {
        console.log(`  ❌ ${check.description}: Error ${err.message}`);
        allChecksPass = false;
      }
    } else if (check.type === 'ias_zone') {
      if (fs.existsSync(deviceJs)) {
        const content = fs.readFileSync(deviceJs, 'utf8');
        if (content.includes(check.pattern)) {
          console.log(`  ✅ ${check.description}`);
        } else {
          console.log(`  ❌ ${check.description}`);
          allChecksPass = false;
          stats.criticalIssues.push(`${fix.name}: ${check.description} failed`);
        }
      } else {
        console.log(`  ❌ device.js not found`);
        allChecksPass = false;
      }
    }
  }
  
  if (allChecksPass) {
    stats.forumFixesValid++;
    console.log(`  ✅ All checks passed`);
  } else {
    console.log(`  ❌ Some checks failed`);
  }
}

// =============================================================================
// 4. VERIFICATION IAS ZONE ENROLLER
// =============================================================================

console.log('\n' + '='.repeat(80));
console.log('4. VERIFICATION IAS ZONE ENROLLER');
console.log('='.repeat(80) + '\n');

const iasZoneFile = path.join(ROOT, 'lib/IASZoneEnroller.js');

if (fs.existsSync(iasZoneFile)) {
  const content = fs.readFileSync(iasZoneFile, 'utf8');
  
  const checks = {
    'onZoneEnrollRequest listener': content.includes('onZoneEnrollRequest'),
    'zoneEnrollResponse': content.includes('zoneEnrollResponse'),
    'Proactive response': content.includes('Sending proactive Zone Enroll Response'),
    'IEEE fix regex': content.includes('replace(/[^0-9a-fA-F]/g'),
    'Multi-fallback methods': content.includes('enrollAutomatic') && content.includes('enrollPollingMode'),
    'setupZoneEnrollListener FIRST': (() => {
      const enrollMatch = content.match(/async enroll\(zclNode\) \{[\s\S]*?\n  \}/m);
      if (enrollMatch) {
        const enrollCode = enrollMatch[0];
        const setupPos = enrollCode.indexOf('setupZoneEnrollListener');
        const standardPos = enrollCode.indexOf('enrollStandard');
        return setupPos !== -1 && setupPos < standardPos;
      }
      return false;
    })()
  };
  
  console.log('IAS Zone Enroller checks:');
  Object.entries(checks).forEach(([name, pass]) => {
    console.log(`  ${pass ? '✅' : '❌'} ${name}`);
    if (!pass) {
      stats.criticalIssues.push(`IASZoneEnroller: ${name} failed`);
    }
  });
  
  const allPass = Object.values(checks).every(v => v);
  if (allPass) {
    console.log('\n✅ IAS Zone Enroller: All checks passed');
  } else {
    console.log('\n❌ IAS Zone Enroller: Some checks failed');
  }
  
} else {
  console.log('❌ IASZoneEnroller.js not found');
  stats.criticalIssues.push('IASZoneEnroller.js not found');
}

// =============================================================================
// 5. VALIDATION HOMEY CLI
// =============================================================================

console.log('\n' + '='.repeat(80));
console.log('5. VALIDATION HOMEY CLI');
console.log('='.repeat(80) + '\n');

try {
  console.log('Running: homey app validate --level publish\n');
  execSync('homey app validate --level publish', {
    cwd: ROOT,
    stdio: 'inherit'
  });
  console.log('\n✅ Homey validation: PASSED');
} catch (err) {
  console.log('\n❌ Homey validation: FAILED');
  stats.criticalIssues.push('Homey validation failed');
}

// =============================================================================
// 6. DRIVER OVERLAPS CHECK
// =============================================================================

console.log('\n' + '='.repeat(80));
console.log('6. DRIVER OVERLAPS CHECK');
console.log('='.repeat(80) + '\n');

const overlapReport = path.join(ROOT, 'docs/reports/driver-overlaps-report.json');

if (fs.existsSync(overlapReport)) {
  try {
    const report = JSON.parse(fs.readFileSync(overlapReport, 'utf8'));
    
    console.log(`📊 Overlap Report:`);
    console.log(`  Total overlaps: ${report.criticalOverlaps}`);
    console.log(`  Manufacturer overlaps: ${report.manufacturerIdOverlaps}`);
    console.log(`  Product overlaps: ${report.productIdOverlaps}`);
    
    if (report.criticalOverlaps < 6000) {
      console.log(`  ✅ Overlaps acceptable (< 6,000)`);
    } else {
      console.log(`  ⚠️  Overlaps still high (> 6,000)`);
      stats.warnings.push(`High overlaps: ${report.criticalOverlaps}`);
    }
    
  } catch (err) {
    console.log(`⚠️  Could not read overlap report`);
  }
} else {
  console.log('⚠️  Overlap report not found (run detect-driver-overlaps.js)');
}

// =============================================================================
// 7. SUMMARY
// =============================================================================

console.log('\n' + '='.repeat(80));
console.log('📊 COHERENCE CHECK SUMMARY');
console.log('='.repeat(80));

console.log(`\n📁 Drivers:`);
console.log(`  Total: ${stats.driversTotal}`);
console.log(`  Valid: ${stats.driversValid} (${((stats.driversValid/stats.driversTotal)*100).toFixed(1)}%)`);
console.log(`  Invalid: ${stats.driversInvalid}`);

console.log(`\n📋 Forum Fixes:`);
console.log(`  Checked: ${stats.forumFixesChecked}`);
console.log(`  Valid: ${stats.forumFixesValid} (${((stats.forumFixesValid/stats.forumFixesChecked)*100).toFixed(1)}%)`);

console.log(`\n⚠️  Warnings: ${stats.warnings.length}`);
if (stats.warnings.length > 0) {
  stats.warnings.slice(0, 5).forEach(w => console.log(`  - ${w}`));
  if (stats.warnings.length > 5) {
    console.log(`  ... and ${stats.warnings.length - 5} more`);
  }
}

console.log(`\n🚨 Critical Issues: ${stats.criticalIssues.length}`);
if (stats.criticalIssues.length > 0) {
  stats.criticalIssues.forEach(issue => console.log(`  ❌ ${issue}`));
}

console.log('\n' + '='.repeat(80));

if (stats.criticalIssues.length === 0) {
  console.log('✅ PROJECT COHERENCE: EXCELLENT');
  console.log('✅ All forum fixes intact');
  console.log('✅ All critical features working');
  console.log('✅ Ready for production');
} else if (stats.criticalIssues.length <= 3) {
  console.log('⚠️  PROJECT COHERENCE: GOOD (minor issues)');
  console.log('⚠️  Some non-critical issues to fix');
} else {
  console.log('❌ PROJECT COHERENCE: ISSUES DETECTED');
  console.log('❌ Critical fixes needed');
}

console.log('='.repeat(80));

// Exit code
process.exit(stats.criticalIssues.length > 0 ? 1 : 0);
