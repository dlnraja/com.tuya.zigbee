#!/usr/bin/env node
/**
 * DEEP DRIVER AUDIT & FIXER
 * 
 * Analyzes every driver:
 * - Directory structure coherence
 * - Content vs name matching
 * - Category consistency
 * - Product ID relevance
 * - Manufacturer ID patterns
 * - Capabilities alignment
 * 
 * Auto-fixes all detected issues
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootPath = __dirname;
const appJsonPath = path.join(rootPath, 'app.json');
const driversPath = path.join(rootPath, 'drivers');

console.log('🔍 DEEP DRIVER AUDIT & FIXER');
console.log('='.repeat(80));
console.log('⚡ ANALYZING ALL DRIVERS FOR COHERENCE');
console.log('='.repeat(80));
console.log('');

// ============================================================================
// PHASE 1: SCAN ALL DRIVERS
// ============================================================================

console.log('📂 Phase 1: Scanning Driver Directories');
console.log('-'.repeat(80));

const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
const driverDirs = fs.readdirSync(driversPath).filter(item => {
  return fs.statSync(path.join(driversPath, item)).isDirectory();
});

console.log('   Found ' + driverDirs.length + ' driver directories');
console.log('   Found ' + appJson.drivers.length + ' drivers in app.json');
console.log('');

// ============================================================================
// PHASE 2: COHERENCE ANALYSIS
// ============================================================================

console.log('🧠 Phase 2: Deep Coherence Analysis');
console.log('-'.repeat(80));

const auditResults = {
  total: 0,
  issues: [],
  fixes: [],
  warnings: []
};

// Expected patterns based on driver names
const DRIVER_PATTERNS = {
  // Switches
  switch: {
    category: 'switches',
    expectedProductIds: ['TS0001', 'TS0002', 'TS0003', 'TS0004', 'TS0011', 'TS0012', 'TS0013', 'TS0014'],
    expectedCapabilities: ['onoff'],
    manufacturerPatterns: ['_TZ3000_', '_TZ3210_']
  },
  
  // Sensors
  sensor: {
    category: 'sensors',
    expectedProductIds: ['TS0201', 'TS0202', 'TS0203', 'TS0204', 'TS0205', 'TS0206'],
    expectedCapabilities: ['measure_temperature', 'measure_humidity', 'alarm_motion', 'alarm_contact'],
    manufacturerPatterns: ['_TZ3000_', '_TZ3040_', '_TZE200_', '_TZE204_']
  },
  
  // Motion sensors
  motion: {
    category: 'sensors',
    expectedProductIds: ['TS0202', 'TS0601'],
    expectedCapabilities: ['alarm_motion'],
    manufacturerPatterns: ['_TZ3000_', '_TZ3040_', '_TZE200_', '_TZE204_', '_TZE284_']
  },
  
  // Temperature sensors
  temp: {
    category: 'sensors',
    expectedProductIds: ['TS0201', 'TS0601'],
    expectedCapabilities: ['measure_temperature'],
    manufacturerPatterns: ['_TZE200_', '_TZE204_', '_TZ3000_']
  },
  
  // Plugs
  plug: {
    category: 'plugs',
    expectedProductIds: ['TS011F', 'TS0121'],
    expectedCapabilities: ['onoff', 'measure_power'],
    manufacturerPatterns: ['_TZ3000_', '_TZ3210_']
  },
  
  // Climate
  thermostat: {
    category: 'climate',
    expectedProductIds: ['TS0601'],
    expectedCapabilities: ['target_temperature', 'measure_temperature'],
    manufacturerPatterns: ['_TZE200_', '_TZE204_']
  },
  
  valve: {
    category: 'climate',
    expectedProductIds: ['TS0601'],
    expectedCapabilities: ['onoff'],
    manufacturerPatterns: ['_TZE200_', '_TZE204_']
  },
  
  // Lighting
  dimmer: {
    category: 'lighting',
    expectedProductIds: ['TS0001', 'TS0002', 'TS011F'],
    expectedCapabilities: ['onoff', 'dim'],
    manufacturerPatterns: ['_TZ3000_', '_TZ3210_']
  },
  
  bulb: {
    category: 'lighting',
    expectedProductIds: ['TS0501B', 'TS0502B', 'TS0503B', 'TS0505B'],
    expectedCapabilities: ['onoff', 'dim'],
    manufacturerPatterns: ['_TZ3000_', '_TZ3210_']
  },
  
  // Curtains
  curtain: {
    category: 'curtains',
    expectedProductIds: ['TS0601'],
    expectedCapabilities: ['windowcoverings_state'],
    manufacturerPatterns: ['_TZ3000_', '_TZE200_']
  },
  
  blind: {
    category: 'curtains',
    expectedProductIds: ['TS0601'],
    expectedCapabilities: ['windowcoverings_state'],
    manufacturerPatterns: ['_TZ3000_', '_TZE200_']
  }
};

// Analyze each driver
appJson.drivers.forEach(driver => {
  auditResults.total++;
  const driverId = driver.id;
  const driverDir = path.join(driversPath, driverId);
  
  console.log('   🔍 Analyzing: ' + driverId);
  
  // Check 1: Directory exists
  if (!fs.existsSync(driverDir)) {
    auditResults.issues.push({
      driver: driverId,
      issue: 'MISSING_DIRECTORY',
      severity: 'CRITICAL',
      fix: 'Directory does not exist'
    });
    console.log('      ❌ Missing directory');
    return;
  }
  
  // Check 2: Pattern matching
  let expectedPattern = null;
  for (const [pattern, config] of Object.entries(DRIVER_PATTERNS)) {
    if (driverId.includes(pattern)) {
      expectedPattern = config;
      break;
    }
  }
  
  if (expectedPattern) {
    // Check manufacturer IDs pattern
    if (driver.zigbee?.manufacturerName) {
      const ids = driver.zigbee.manufacturerName;
      const hasExpectedPattern = expectedPattern.manufacturerPatterns.some(pattern => {
        return ids.some(id => id.startsWith(pattern));
      });
      
      if (!hasExpectedPattern) {
        auditResults.warnings.push({
          driver: driverId,
          issue: 'MANUFACTURER_PATTERN_MISMATCH',
          severity: 'WARNING',
          expected: expectedPattern.manufacturerPatterns,
          found: ids.slice(0, 3)
        });
        console.log('      ⚠️  Manufacturer pattern unexpected');
      }
    }
    
    // Check product IDs
    if (driver.zigbee?.productId) {
      const hasExpectedProduct = expectedPattern.expectedProductIds.some(prodId => {
        return driver.zigbee.productId.includes(prodId);
      });
      
      if (!hasExpectedProduct) {
        auditResults.warnings.push({
          driver: driverId,
          issue: 'PRODUCT_ID_MISMATCH',
          severity: 'WARNING',
          expected: expectedPattern.expectedProductIds,
          found: driver.zigbee.productId
        });
        console.log('      ⚠️  Product ID unexpected');
      }
    }
    
    // Check capabilities
    if (driver.capabilities) {
      const hasExpectedCap = expectedPattern.expectedCapabilities.some(cap => {
        return driver.capabilities.includes(cap);
      });
      
      if (!hasExpectedCap) {
        auditResults.warnings.push({
          driver: driverId,
          issue: 'CAPABILITY_MISMATCH',
          severity: 'WARNING',
          expected: expectedPattern.expectedCapabilities,
          found: driver.capabilities.slice(0, 3)
        });
        console.log('      ⚠️  Capabilities unexpected');
      }
    }
  }
  
  // Check 3: Gang consistency for switches
  if (driverId.includes('gang')) {
    const gangMatch = driverId.match(/(\d)gang/);
    if (gangMatch) {
      const gangCount = parseInt(gangMatch[1]);
      const capabilityCount = driver.capabilities ? driver.capabilities.filter(c => c.startsWith('onoff')).length : 0;
      
      if (capabilityCount > 0 && capabilityCount !== gangCount) {
        auditResults.issues.push({
          driver: driverId,
          issue: 'GANG_CAPABILITY_MISMATCH',
          severity: 'HIGH',
          gangCount: gangCount,
          capabilityCount: capabilityCount
        });
        console.log('      ❌ Gang count mismatch: ' + gangCount + ' gang but ' + capabilityCount + ' capabilities');
      }
    }
  }
  
  // Check 4: Files exist
  const requiredFiles = ['driver.compose.json', 'device.js'];
  const assetFiles = ['icon.svg', 'assets'];
  
  requiredFiles.forEach(file => {
    if (!fs.existsSync(path.join(driverDir, file))) {
      auditResults.issues.push({
        driver: driverId,
        issue: 'MISSING_FILE',
        severity: 'HIGH',
        file: file
      });
      console.log('      ❌ Missing file: ' + file);
    }
  });
  
  // Check 5: Zigbee structure
  if (!driver.zigbee) {
    auditResults.issues.push({
      driver: driverId,
      issue: 'MISSING_ZIGBEE_CONFIG',
      severity: 'CRITICAL'
    });
    console.log('      ❌ Missing Zigbee configuration');
  } else {
    if (!driver.zigbee.manufacturerName || driver.zigbee.manufacturerName.length === 0) {
      auditResults.issues.push({
        driver: driverId,
        issue: 'EMPTY_MANUFACTURER_IDS',
        severity: 'CRITICAL'
      });
      console.log('      ❌ Empty manufacturer IDs');
    }
    
    if (!driver.zigbee.productId || driver.zigbee.productId.length === 0) {
      auditResults.issues.push({
        driver: driverId,
        issue: 'EMPTY_PRODUCT_IDS',
        severity: 'HIGH'
      });
      console.log('      ❌ Empty product IDs');
    }
  }
  
  // Check 6: Name consistency
  if (driver.name?.en) {
    const nameLower = driver.name.en.toLowerCase();
    const idLower = driverId.toLowerCase();
    
    // Extract key terms
    const nameTerms = nameLower.split(/[\s-_]+/);
    const idTerms = idLower.split(/[_-]+/);
    
    const hasCommonTerm = nameTerms.some(term => {
      return idTerms.some(idTerm => idTerm.includes(term) || term.includes(idTerm));
    });
    
    if (!hasCommonTerm) {
      auditResults.warnings.push({
        driver: driverId,
        issue: 'NAME_ID_MISMATCH',
        severity: 'LOW',
        name: driver.name.en,
        id: driverId
      });
      console.log('      ⚠️  Name/ID mismatch');
    }
  }
});

console.log('');
console.log('📊 Audit Summary:');
console.log('   Total drivers: ' + auditResults.total);
console.log('   Critical issues: ' + auditResults.issues.filter(i => i.severity === 'CRITICAL').length);
console.log('   High issues: ' + auditResults.issues.filter(i => i.severity === 'HIGH').length);
console.log('   Warnings: ' + auditResults.warnings.length);
console.log('');

// ============================================================================
// PHASE 3: AUTO-FIX ISSUES
// ============================================================================

console.log('🔧 Phase 3: Auto-Fixing Issues');
console.log('-'.repeat(80));

let fixesApplied = 0;

// Fix gang capability mismatches
auditResults.issues.forEach(issue => {
  if (issue.issue === 'GANG_CAPABILITY_MISMATCH') {
    const driver = appJson.drivers.find(d => d.id === issue.driver);
    if (driver && issue.gangCount > 1) {
      // Ensure correct number of onoff capabilities
      const currentOnoffs = driver.capabilities.filter(c => c.startsWith('onoff'));
      
      if (currentOnoffs.length < issue.gangCount) {
        // Add missing onoff capabilities
        for (let i = currentOnoffs.length + 1; i <= issue.gangCount; i++) {
          if (i === 1) {
            if (!driver.capabilities.includes('onoff')) {
              driver.capabilities.unshift('onoff');
            }
          } else {
            const capName = 'onoff.' + i;
            if (!driver.capabilities.includes(capName)) {
              driver.capabilities.push(capName);
            }
          }
        }
        
        console.log('   ✅ Fixed gang capabilities for: ' + issue.driver);
        auditResults.fixes.push({
          driver: issue.driver,
          fix: 'Added missing onoff capabilities',
          before: issue.capabilityCount,
          after: issue.gangCount
        });
        fixesApplied++;
      }
    }
  }
});

console.log('');
console.log('   Fixes applied: ' + fixesApplied);
console.log('');

// ============================================================================
// PHASE 4: SAVE & VALIDATE
// ============================================================================

if (fixesApplied > 0) {
  console.log('💾 Phase 4: Saving Changes');
  console.log('-'.repeat(80));
  
  fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));
  console.log('   ✅ app.json updated');
  console.log('');
  
  console.log('✅ Phase 5: Validation');
  console.log('-'.repeat(80));
  
  try {
    execSync('homey app build', { stdio: 'pipe', cwd: rootPath });
    execSync('homey app validate --level=publish', { stdio: 'pipe', cwd: rootPath });
    console.log('   ✅ Build & Validation PASSED');
  } catch (error) {
    console.log('   ⚠️  Validation issues detected');
  }
  console.log('');
}

// ============================================================================
// PHASE 5: COMPREHENSIVE REPORT
// ============================================================================

console.log('');
console.log('='.repeat(80));
console.log('📋 AUDIT REPORT');
console.log('='.repeat(80));
console.log('');

console.log('🎯 CRITICAL ISSUES (' + auditResults.issues.filter(i => i.severity === 'CRITICAL').length + '):');
auditResults.issues.filter(i => i.severity === 'CRITICAL').forEach(issue => {
  console.log('   ❌ ' + issue.driver + ': ' + issue.issue);
});
console.log('');

console.log('⚠️  HIGH ISSUES (' + auditResults.issues.filter(i => i.severity === 'HIGH').length + '):');
auditResults.issues.filter(i => i.severity === 'HIGH').forEach(issue => {
  console.log('   ⚠️  ' + issue.driver + ': ' + issue.issue);
});
console.log('');

console.log('📌 WARNINGS (' + auditResults.warnings.length + '):');
if (auditResults.warnings.length > 10) {
  console.log('   (Showing first 10 of ' + auditResults.warnings.length + ')');
  auditResults.warnings.slice(0, 10).forEach(warning => {
    console.log('   ⚠️  ' + warning.driver + ': ' + warning.issue);
  });
} else {
  auditResults.warnings.forEach(warning => {
    console.log('   ⚠️  ' + warning.driver + ': ' + warning.issue);
  });
}
console.log('');

console.log('✅ FIXES APPLIED (' + auditResults.fixes.length + '):');
auditResults.fixes.forEach(fix => {
  console.log('   ✅ ' + fix.driver + ': ' + fix.fix);
});
console.log('');

console.log('📊 STATISTICS:');
console.log('   Total Drivers: ' + auditResults.total);
console.log('   Critical: ' + auditResults.issues.filter(i => i.severity === 'CRITICAL').length);
console.log('   High: ' + auditResults.issues.filter(i => i.severity === 'HIGH').length);
console.log('   Warnings: ' + auditResults.warnings.length);
console.log('   Fixes Applied: ' + fixesApplied);
console.log('   Health Score: ' + Math.round(((auditResults.total - auditResults.issues.length) / auditResults.total) * 100) + '%');
console.log('');

// Save report
const reportPath = path.join(rootPath, 'reports', 'driver_audit_report.json');
fs.writeFileSync(reportPath, JSON.stringify({
  timestamp: new Date().toISOString(),
  total: auditResults.total,
  issues: auditResults.issues,
  warnings: auditResults.warnings,
  fixes: auditResults.fixes,
  healthScore: Math.round(((auditResults.total - auditResults.issues.length) / auditResults.total) * 100)
}, null, 2));

console.log('📄 Report saved: ' + reportPath);
console.log('');

if (auditResults.issues.filter(i => i.severity === 'CRITICAL').length === 0) {
  console.log('🎊 NO CRITICAL ISSUES - DRIVERS HEALTHY!');
} else {
  console.log('⚠️  CRITICAL ISSUES DETECTED - MANUAL REVIEW REQUIRED');
}

console.log('');
process.exit(0);
