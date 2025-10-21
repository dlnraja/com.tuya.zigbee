const fs = require('fs');
const path = require('path');

console.log('🔍 VÉRIFICATION COHÉRENCE COMPLÈTE - TOUS LES DRIVERS');
console.log('═'.repeat(80));

const appJson = JSON.parse(fs.readFileSync('./app.json', 'utf8'));
const driversDir = './drivers';

let totalIssues = 0;
let totalFixes = 0;
const issuesByType = {};
const report = {
  timestamp: new Date().toISOString(),
  drivers: [],
  summary: {}
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function addIssue(type) {
  totalIssues++;
  issuesByType[type] = (issuesByType[type] || 0) + 1;
}

function addFix() {
  totalFixes++;
}

// Standard parsers for each capability
const STANDARD_PARSERS = {
  measure_temperature: {
    parser: 'value => value / 100',
    cluster: 'msTemperatureMeasurement',
    attribute: 'measuredValue'
  },
  measure_humidity: {
    parser: 'value => value / 100',
    cluster: 'msRelativeHumidity',
    attribute: 'measuredValue'
  },
  measure_battery: {
    parser: 'value => Math.max(0, Math.min(100, value / 2))',
    cluster: 'genPowerCfg',
    attribute: 'batteryPercentageRemaining'
  },
  measure_luminance: {
    parser: 'value => Math.round(Math.pow(10, ((value - 1) / 10000)))',
    cluster: 'msIlluminanceMeasurement',
    attribute: 'measuredValue'
  },
  measure_pressure: {
    parser: 'value => value / 10',
    cluster: 'msPressureMeasurement',
    attribute: 'measuredValue'
  },
  measure_co2: {
    parser: 'value => value',
    cluster: 'msCO2',
    attribute: 'measuredValue'
  },
  measure_pm25: {
    parser: 'value => value',
    cluster: 'pm25Measurement',
    attribute: 'measuredValue'
  },
  alarm_motion: {
    parser: 'value => (value & 1) === 1',
    cluster: 'ssIasZone',
    attribute: 'zoneStatus'
  },
  alarm_contact: {
    parser: 'value => (value & 1) === 1',
    cluster: 'ssIasZone',
    attribute: 'zoneStatus'
  },
  alarm_water: {
    parser: 'value => (value & 1) === 1',
    cluster: 'ssIasZone',
    attribute: 'zoneStatus'
  },
  alarm_smoke: {
    parser: 'value => (value & 1) === 1',
    cluster: 'ssIasZone',
    attribute: 'zoneStatus'
  },
  alarm_co: {
    parser: 'value => (value & 1) === 1',
    cluster: 'ssIasZone',
    attribute: 'zoneStatus'
  },
  alarm_tamper: {
    parser: 'value => (value & 2) === 2',
    cluster: 'ssIasZone',
    attribute: 'zoneStatus'
  },
  alarm_battery: {
    parser: 'value => (value & 8) === 8',
    cluster: 'ssIasZone',
    attribute: 'zoneStatus'
  }
};

// ============================================================================
// CHECK EACH DRIVER
// ============================================================================

console.log(`\n📋 Vérification de ${appJson.drivers.length} drivers...\n`);

appJson.drivers.forEach((appDriver, index) => {
  const driverId = appDriver.id;
  const driverPath = path.join(driversDir, driverId);
  const devicePath = path.join(driverPath, 'device.js');
  const driverJsPath = path.join(driverPath, 'driver.js');
  const composePath = path.join(driverPath, 'driver.compose.json');
  const assetsPath = path.join(driverPath, 'assets');
  
  const driverReport = {
    id: driverId,
    issues: [],
    fixes: []
  };
  
  // ────────────────────────────────────────────────────────────────────────
  // 1. CHECK FILES EXISTENCE
  // ────────────────────────────────────────────────────────────────────────
  
  if (!fs.existsSync(driverPath)) {
    driverReport.issues.push('Driver directory missing');
    addIssue('missing_directory');
  } else {
    // Check device.js
    if (!fs.existsSync(devicePath)) {
      driverReport.issues.push('device.js missing');
      addIssue('missing_device_js');
    } else {
      const deviceCode = fs.readFileSync(devicePath, 'utf8');
      
      // Check if device.js is too small (likely empty or incomplete)
      if (deviceCode.length < 500) {
        driverReport.issues.push('device.js suspiciously small (<500 chars)');
        addIssue('small_device_js');
      }
      
      // Check for registerCapability calls
      const capabilities = appDriver.capabilities || [];
      const missingRegistrations = [];
      
      capabilities.forEach(cap => {
        if (!deviceCode.includes(`registerCapability('${cap}'`) && 
            !deviceCode.includes(`registerCapability("${cap}"`)) {
          missingRegistrations.push(cap);
        }
      });
      
      if (missingRegistrations.length > 0) {
        driverReport.issues.push(`Missing registerCapability: ${missingRegistrations.join(', ')}`);
        addIssue('missing_register_capability');
      }
      
      // Check for flow card handlers
      if (!deviceCode.includes('registerFlowCardHandlers') && capabilities.length > 0) {
        driverReport.issues.push('Missing flow card handlers');
        addIssue('missing_flow_handlers');
      }
    }
    
    // Check driver.compose.json
    if (!fs.existsSync(composePath)) {
      driverReport.issues.push('driver.compose.json missing');
      addIssue('missing_compose');
    }
    
    // Check assets directory and images
    if (!fs.existsSync(assetsPath)) {
      driverReport.issues.push('assets directory missing');
      addIssue('missing_assets');
    } else {
      const requiredImages = ['small.png', 'large.png'];
      requiredImages.forEach(img => {
        const imgPath = path.join(assetsPath, img);
        if (!fs.existsSync(imgPath)) {
          driverReport.issues.push(`Missing image: ${img}`);
          addIssue('missing_image');
        }
      });
    }
  }
  
  // ────────────────────────────────────────────────────────────────────────
  // 2. CHECK CAPABILITIES COHERENCE
  // ────────────────────────────────────────────────────────────────────────
  
  const capabilities = appDriver.capabilities || [];
  
  // Check battery capability requires energy.batteries
  if (capabilities.includes('measure_battery')) {
    if (!appDriver.energy || !appDriver.energy.batteries || appDriver.energy.batteries.length === 0) {
      // Skip AC powered devices
      if (!driverId.includes('_ac') && !driverId.includes('plug') && !driverId.includes('socket')) {
        driverReport.issues.push('measure_battery without energy.batteries');
        addIssue('missing_batteries_config');
      }
    }
  }
  
  // Check class is appropriate
  const validClasses = ['light', 'socket', 'sensor', 'thermostat', 'button', 'lock', 'doorbell', 'curtain', 'fan', 'heater', 'kettle', 'other'];
  if (appDriver.class && !validClasses.includes(appDriver.class)) {
    driverReport.issues.push(`Invalid class: ${appDriver.class}`);
    addIssue('invalid_class');
  }
  
  // ────────────────────────────────────────────────────────────────────────
  // 3. CHECK ZIGBEE CONFIGURATION
  // ────────────────────────────────────────────────────────────────────────
  
  if (appDriver.zigbee) {
    // Check manufacturerName is array
    if (!Array.isArray(appDriver.zigbee.manufacturerName)) {
      driverReport.issues.push('manufacturerName is not an array');
      addIssue('invalid_manufacturer_format');
    } else if (appDriver.zigbee.manufacturerName.length === 0) {
      driverReport.issues.push('manufacturerName array is empty');
      addIssue('empty_manufacturers');
    }
    
    // Check productId is array
    if (!Array.isArray(appDriver.zigbee.productId)) {
      driverReport.issues.push('productId is not an array');
      addIssue('invalid_product_format');
    } else if (appDriver.zigbee.productId.length === 0) {
      driverReport.issues.push('productId array is empty');
      addIssue('empty_products');
    }
    
    // Check endpoints if present
    if (appDriver.zigbee.endpoints) {
      const endpoints = appDriver.zigbee.endpoints;
      Object.keys(endpoints).forEach(epKey => {
        const ep = endpoints[epKey];
        if (ep.clusters && !Array.isArray(ep.clusters)) {
          driverReport.issues.push(`Endpoint ${epKey}: clusters not array`);
          addIssue('invalid_clusters_format');
        }
      });
    }
  } else {
    driverReport.issues.push('No zigbee configuration');
    addIssue('missing_zigbee_config');
  }
  
  // ────────────────────────────────────────────────────────────────────────
  // 4. CHECK NAMING CONSISTENCY
  // ────────────────────────────────────────────────────────────────────────
  
  if (appDriver.name && appDriver.name.en) {
    const name = appDriver.name.en.toLowerCase();
    const id = driverId.toLowerCase();
    
    // Basic coherence check
    if (name.includes('switch') && !id.includes('switch')) {
      driverReport.issues.push('Name contains "switch" but ID does not');
      addIssue('name_id_mismatch');
    }
    if (name.includes('sensor') && !id.includes('sensor')) {
      driverReport.issues.push('Name contains "sensor" but ID does not');
      addIssue('name_id_mismatch');
    }
  }
  
  // ────────────────────────────────────────────────────────────────────────
  // SUMMARY
  // ────────────────────────────────────────────────────────────────────────
  
  if (driverReport.issues.length > 0) {
    report.drivers.push(driverReport);
    console.log(`   ⚠️  ${driverId}: ${driverReport.issues.length} issues`);
    driverReport.issues.forEach(issue => {
      console.log(`      - ${issue}`);
    });
  }
  
  // Progress
  if ((index + 1) % 20 === 0 || index === appJson.drivers.length - 1) {
    process.stdout.write(`\r   Progress: ${index + 1}/${appJson.drivers.length} drivers...`);
  }
});

console.log('\n');

// ============================================================================
// GENERATE DETAILED REPORT
// ============================================================================

report.summary = {
  total_drivers: appJson.drivers.length,
  drivers_with_issues: report.drivers.length,
  total_issues: totalIssues,
  issues_by_type: issuesByType,
  fixes_applied: totalFixes
};

fs.writeFileSync('./DRIVERS_COHERENCE_REPORT.json', JSON.stringify(report, null, 2));

// ============================================================================
// TOP ISSUES
// ============================================================================

console.log('\n═'.repeat(80));
console.log('📊 RÉSUMÉ VÉRIFICATION COHÉRENCE');
console.log('═'.repeat(80));

console.log(`\n✅ DRIVERS VÉRIFIÉS: ${appJson.drivers.length}`);
console.log(`⚠️  DRIVERS AVEC ISSUES: ${report.drivers.length}`);
console.log(`📋 TOTAL ISSUES: ${totalIssues}`);

console.log('\n🎯 ISSUES PAR TYPE:');
const sortedIssues = Object.entries(issuesByType).sort((a, b) => b[1] - a[1]);
sortedIssues.forEach(([type, count]) => {
  console.log(`   ${count.toString().padStart(3)} × ${type}`);
});

// ============================================================================
// CRITICAL ISSUES
// ============================================================================

console.log('\n🔴 CRITICAL ISSUES (à corriger en priorité):');

const criticalIssues = [
  'missing_device_js',
  'missing_register_capability',
  'missing_batteries_config',
  'missing_zigbee_config',
  'empty_manufacturers',
  'empty_products'
];

let hasCritical = false;
criticalIssues.forEach(critical => {
  if (issuesByType[critical]) {
    console.log(`   ⚠️  ${issuesByType[critical]} drivers: ${critical}`);
    hasCritical = true;
  }
});

if (!hasCritical) {
  console.log('   ✅ Aucun problème critique détecté !');
}

// ============================================================================
// RECOMMENDATIONS
// ============================================================================

console.log('\n💡 RECOMMANDATIONS:');

if (issuesByType['missing_register_capability']) {
  console.log(`   1. ${issuesByType['missing_register_capability']} drivers nécessitent registerCapability()`);
  console.log('      → Utiliser FIX_DEVICE_CAPABILITIES_CASCADE.js');
}

if (issuesByType['missing_flow_handlers']) {
  console.log(`   2. ${issuesByType['missing_flow_handlers']} drivers sans flow handlers`);
  console.log('      → Utiliser FLOW_HANDLER_GENERATOR.js');
}

if (issuesByType['missing_batteries_config']) {
  console.log(`   3. ${issuesByType['missing_batteries_config']} drivers sans energy.batteries`);
  console.log('      → Utiliser FIX_MISSING_BATTERIES.js');
}

if (issuesByType['missing_image']) {
  console.log(`   4. ${issuesByType['missing_image']} images manquantes`);
  console.log('      → Créer images 75x75 (small) et 500x500 (large)');
}

// ============================================================================
// FILES GENERATED
// ============================================================================

console.log('\n📝 FICHIERS CRÉÉS:');
console.log('   ✅ DRIVERS_COHERENCE_REPORT.json - Rapport détaillé complet');

console.log('\n🚀 PROCHAINES ÉTAPES:');
console.log('   1. Consulter DRIVERS_COHERENCE_REPORT.json pour détails');
console.log('   2. Corriger les issues critiques en priorité');
console.log('   3. Utiliser les scripts de correction automatique');
console.log('   4. Re-valider: homey app validate');

console.log(`\n${totalIssues > 0 ? '⚠️' : '✅'}  VÉRIFICATION TERMINÉE !`);
console.log(`   Drivers OK: ${appJson.drivers.length - report.drivers.length}/${appJson.drivers.length}`);
console.log(`   Drivers avec issues: ${report.drivers.length}/${appJson.drivers.length}`);
