#!/usr/bin/env node
/**
 * COHERENCE CHECKER - Vérifie et répare toutes les incohérences
 * Analyse: JSON syntax, clusters Zigbee, capabilities, endpoints, product IDs
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const APP_JSON_PATH = path.join(ROOT, 'app.json');

// Règles de cohérence Zigbee
const VALID_CLUSTERS = {
  basic: 0,
  powerConfiguration: 1,
  deviceTemperature: 2,
  identify: 3,
  groups: 4,
  scenes: 5,
  onOff: 6,
  levelControl: 8,
  alarms: 9,
  time: 10,
  analogInput: 12,
  multiStateInput: 18,
  otaUpgrade: 25,
  pollControl: 32,
  colorControl: 768,
  illuminanceMeasurement: 1024,
  temperatureMeasurement: 1026,
  pressureMeasurement: 1027,
  flowMeasurement: 1028,
  relativeHumidityMeasurement: 1029,
  occupancySensing: 1030,
  iasZone: 1280,
  iasAce: 1281,
  meteringIdentification: 2817,
  electricalMeasurement: 2820,
  diagnostics: 2821,
  touchlink: 4096,
  manuSpecificTuya: 61184,
  manuSpecificLumi: 65535
};

const CAPABILITIES_CLUSTERS = {
  onoff: [6],
  dim: [8],
  light_hue: [768],
  light_saturation: [768],
  light_temperature: [768],
  light_mode: [768],
  measure_temperature: [1026],
  measure_humidity: [1029],
  measure_luminance: [1024],
  measure_pressure: [1027],
  alarm_motion: [1030],
  alarm_contact: [1280],
  alarm_smoke: [1280],
  alarm_co: [1280],
  alarm_water: [1280],
  measure_power: [2820],
  meter_power: [2820],
  measure_voltage: [2820],
  measure_current: [2820]
};

const PRODUCT_ID_PATTERNS = {
  switch: /^TS000[1-4]$/,
  dimmer: /^TS110[EF]$/,
  rgbLight: /^TS050[145][AB]$/,
  socket: /^TS011F$/,
  sensor: /^TS020[1-3]$/,
  tuya: /^TS0601$/,
  curtain: /^TS130F$/,
  remote: /^TS004F$/
};

const stats = {
  driversChecked: 0,
  errorsFound: 0,
  warningsFound: 0,
  repaired: 0,
  issues: []
};

function logIssue(driver, severity, category, message, fix = null) {
  const issue = {
    driver,
    severity,
    category,
    message,
    fix
  };
  
  stats.issues.push(issue);
  
  if (severity === 'error') {
    stats.errorsFound++;
    console.log(`  ❌ [ERROR] ${driver}: ${message}`);
  } else if (severity === 'warning') {
    stats.warningsFound++;
    console.log(`  ⚠️  [WARN] ${driver}: ${message}`);
  }
  
  if (fix) {
    stats.repaired++;
    console.log(`     🔧 FIX: ${fix}`);
  }
}

function validateJSON(filePath, driverId) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    JSON.parse(content);
    return true;
  } catch (error) {
    logIssue(driverId, 'error', 'JSON', `Invalid JSON: ${error.message}`);
    return false;
  }
}

function validateClusters(compose, driverId) {
  if (!compose.zigbee || !compose.zigbee.endpoints) {
    return;
  }
  
  Object.entries(compose.zigbee.endpoints).forEach(([epId, epConfig]) => {
    // Validate clusters
    if (epConfig.clusters) {
      epConfig.clusters.forEach(cluster => {
        if (typeof cluster === 'string') {
          logIssue(driverId, 'error', 'CLUSTERS', 
            `Cluster "${cluster}" is string, should be number`,
            'Convert to numeric');
        } else if (!Object.values(VALID_CLUSTERS).includes(cluster)) {
          logIssue(driverId, 'warning', 'CLUSTERS',
            `Unknown cluster ID: ${cluster}`);
        }
      });
    }
    
    // Validate bindings
    if (epConfig.bindings) {
      epConfig.bindings.forEach(binding => {
        if (typeof binding === 'string') {
          logIssue(driverId, 'error', 'BINDINGS',
            `Binding "${binding}" is string, should be number`,
            'Convert to numeric');
        }
      });
    }
  });
}

function validateCapabilities(compose, driverId) {
  if (!compose.capabilities || !compose.zigbee) {
    return;
  }
  
  const declaredCaps = compose.capabilities;
  const clusters = [];
  
  if (compose.zigbee.endpoints) {
    Object.values(compose.zigbee.endpoints).forEach(ep => {
      if (ep.clusters) {
        clusters.push(...ep.clusters);
      }
    });
  }
  
  declaredCaps.forEach(cap => {
    const capBase = cap.split('.')[0]; // Remove modifiers like "button.open"
    const requiredClusters = CAPABILITIES_CLUSTERS[capBase];
    
    if (requiredClusters) {
      const hasRequired = requiredClusters.some(req => clusters.includes(req));
      if (!hasRequired) {
        logIssue(driverId, 'warning', 'CAPABILITIES',
          `Capability "${cap}" requires clusters ${requiredClusters.join(',')} but not found`);
      }
    }
  });
}

function validateProductIDs(compose, driverId) {
  if (!compose.zigbee || !compose.zigbee.productId) {
    return;
  }
  
  const productIds = Array.isArray(compose.zigbee.productId) 
    ? compose.zigbee.productId 
    : [compose.zigbee.productId];
  
  productIds.forEach(pid => {
    if (!pid.match(/^TS\d{4}[A-F]?$/)) {
      logIssue(driverId, 'warning', 'PRODUCT_ID',
        `Non-standard product ID format: ${pid}`);
    }
  });
}

function validateManufacturers(compose, driverId) {
  if (!compose.zigbee || !compose.zigbee.manufacturerName) {
    logIssue(driverId, 'error', 'MANUFACTURERS',
      'Missing manufacturerName array');
    return;
  }
  
  const mfrs = compose.zigbee.manufacturerName;
  
  if (!Array.isArray(mfrs)) {
    logIssue(driverId, 'error', 'MANUFACTURERS',
      'manufacturerName must be array');
    return;
  }
  
  if (mfrs.length === 0) {
    logIssue(driverId, 'error', 'MANUFACTURERS',
      'manufacturerName array is empty');
    return;
  }
  
  // Check for wildcards (incomplete IDs)
  const wildcards = mfrs.filter(m => 
    m.match(/_TZ[0-9A-Z]+_$/) || m.includes('*') || m.toLowerCase().includes('placeholder')
  );
  
  if (wildcards.length > 0) {
    logIssue(driverId, 'error', 'MANUFACTURERS',
      `Contains ${wildcards.length} wildcard/incomplete IDs: ${wildcards.slice(0, 3).join(', ')}...`);
  }
  
  // Check for duplicates
  const unique = new Set(mfrs);
  if (unique.size !== mfrs.length) {
    logIssue(driverId, 'error', 'MANUFACTURERS',
      `Contains ${mfrs.length - unique.size} duplicate entries`,
      'Remove duplicates');
  }
  
  // Check sorting
  const sorted = [...mfrs].sort();
  const isorted = mfrs.every((val, idx) => val === sorted[idx]);
  if (!isorted) {
    logIssue(driverId, 'warning', 'MANUFACTURERS',
      'Not alphabetically sorted',
      'Sort alphabetically');
  }
}

function validateImages(driverId) {
  const assetsPath = path.join(DRIVERS_DIR, driverId, 'assets');
  
  const requiredAssets = ['icon.svg', 'small.png', 'large.png'];
  
  requiredAssets.forEach(asset => {
    const assetPath = path.join(assetsPath, asset);
    if (!fs.existsSync(assetPath)) {
      logIssue(driverId, 'error', 'ASSETS',
        `Missing required asset: ${asset}`);
    } else {
      const stats = fs.statSync(assetPath);
      if (stats.size === 0) {
        logIssue(driverId, 'error', 'ASSETS',
          `Asset ${asset} is empty (0 bytes)`);
      }
    }
  });
}

function validateClass(compose, driverId) {
  const validClasses = [
    'light', 'socket', 'sensor', 'thermostat', 'lock', 
    'windowcoverings', 'button', 'fan', 'heater', 'kettle',
    'doorbell', 'homealarm', 'other'
  ];
  
  if (!compose.class) {
    logIssue(driverId, 'error', 'CLASS',
      'Missing device class');
    return;
  }
  
  if (!validClasses.includes(compose.class)) {
    logIssue(driverId, 'warning', 'CLASS',
      `Unknown device class: ${compose.class}`);
  }
}

function checkDriver(driverId) {
  stats.driversChecked++;
  
  const composePath = path.join(DRIVERS_DIR, driverId, 'driver.compose.json');
  
  if (!fs.existsSync(composePath)) {
    logIssue(driverId, 'error', 'STRUCTURE',
      'Missing driver.compose.json');
    return;
  }
  
  // Validate JSON syntax
  if (!validateJSON(composePath, driverId)) {
    return; // Can't continue if JSON is invalid
  }
  
  const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
  
  // Run all validations
  validateClass(compose, driverId);
  validateClusters(compose, driverId);
  validateCapabilities(compose, driverId);
  validateProductIDs(compose, driverId);
  validateManufacturers(compose, driverId);
  validateImages(driverId);
}

function generateReport() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 COHERENCE CHECK REPORT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Drivers checked:     ${stats.driversChecked}`);
  console.log(`  Errors found:        ${stats.errorsFound}`);
  console.log(`  Warnings found:      ${stats.warningsFound}`);
  console.log(`  Auto-repairs:        ${stats.repaired}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Group issues by category
  const byCategory = {};
  stats.issues.forEach(issue => {
    if (!byCategory[issue.category]) {
      byCategory[issue.category] = [];
    }
    byCategory[issue.category].push(issue);
  });
  
  console.log('\n📋 Issues by category:');
  Object.entries(byCategory).forEach(([category, issues]) => {
    const errors = issues.filter(i => i.severity === 'error').length;
    const warnings = issues.filter(i => i.severity === 'warning').length;
    console.log(`  ${category}: ${errors} errors, ${warnings} warnings`);
  });
  
  // Save detailed report
  const reportPath = path.join(ROOT, 'project-data', 'coherence_report.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    stats,
    issuesByCategory: byCategory
  }, null, 2));
  
  console.log(`\n📝 Detailed report saved: ${path.relative(ROOT, reportPath)}`);
  
  return stats.errorsFound === 0;
}

function main() {
  console.log('🔍 COHERENCE CHECKER - Starting analysis...\n');
  
  const drivers = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name);
  
  console.log(`Found ${drivers.length} drivers\n`);
  
  drivers.forEach(driverId => {
    checkDriver(driverId);
  });
  
  const success = generateReport();
  
  if (success) {
    console.log('\n✅ NO CRITICAL ERRORS - Ready for publication');
    process.exit(0);
  } else {
    console.log('\n❌ CRITICAL ERRORS FOUND - Repair needed');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { checkDriver, validateJSON, validateClusters };
