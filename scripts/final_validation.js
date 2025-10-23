const fs = require('fs');
const path = require('path');

console.log('🔍 FINAL COMPREHENSIVE VALIDATION');
console.log('===================================\n');

const driversDir = path.join(__dirname, '..', 'drivers');
const stats = {
  totalDrivers: 0,
  valid: 0,
  errors: [],
  warnings: [],
  capabilities: {
    total: 0,
    withFlowCards: 0,
    missingFlowCards: []
  },
  flowCards: {
    total: 0,
    withTitleFormatted: 0,
    withPrefix: 0,
    missingPrefix: []
  }
};

/**
 * Validate driver structure
 */
function validateDriver(driverName) {
  const driverPath = path.join(driversDir, driverName);
  const issues = [];
  const warnings = [];
  
  // Check required files
  const composePath = path.join(driverPath, 'driver.compose.json');
  const devicePath = path.join(driverPath, 'device.js');
  const flowPath = path.join(driverPath, 'driver.flow.compose.json');
  
  if (!fs.existsSync(composePath)) {
    issues.push('Missing driver.compose.json');
    return { valid: false, issues, warnings };
  }
  
  if (!fs.existsSync(devicePath)) {
    issues.push('Missing device.js');
    return { valid: false, issues, warnings };
  }
  
  // Validate driver.compose.json
  try {
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    
    // Check ID field
    if (!compose.id || compose.id !== driverName) {
      issues.push(`ID mismatch: "${compose.id}" != "${driverName}"`);
    }
    
    // Check capabilities
    if (!compose.capabilities || compose.capabilities.length === 0) {
      warnings.push('No capabilities defined');
    } else {
      stats.capabilities.total += compose.capabilities.length;
      
      // Check if driver has flow cards
      if (fs.existsSync(flowPath)) {
        stats.capabilities.withFlowCards++;
      } else {
        stats.capabilities.missingFlowCards.push(driverName);
      }
    }
    
    // Check class
    if (!compose.class) {
      issues.push('Missing class field');
    }
    
  } catch (err) {
    issues.push(`Invalid driver.compose.json: ${err.message}`);
  }
  
  // Validate flow cards if present
  if (fs.existsSync(flowPath)) {
    try {
      const flows = JSON.parse(fs.readFileSync(flowPath, 'utf8'));
      
      // Validate triggers
      if (flows.triggers) {
        flows.triggers.forEach(trigger => {
          if (!trigger.id.startsWith(driverName + '_')) {
            stats.flowCards.missingPrefix.push({ driver: driverName, id: trigger.id });
          } else {
            stats.flowCards.withPrefix++;
          }
          stats.flowCards.total++;
        });
      }
      
      // Validate actions
      if (flows.actions) {
        flows.actions.forEach(action => {
          if (!action.id.startsWith(driverName + '_')) {
            stats.flowCards.missingPrefix.push({ driver: driverName, id: action.id });
          } else {
            stats.flowCards.withPrefix++;
          }
          
          if (action.args && action.args.length > 0 && action.titleFormatted) {
            stats.flowCards.withTitleFormatted++;
          }
          stats.flowCards.total++;
        });
      }
      
    } catch (err) {
      warnings.push(`Invalid flow cards: ${err.message}`);
    }
  }
  
  // Validate device.js syntax
  try {
    const deviceCode = fs.readFileSync(devicePath, 'utf8');
    
    // Check for deprecated API
    if (deviceCode.includes(".readAttributes('") || deviceCode.includes('.readAttributes("')) {
      warnings.push('Contains deprecated readAttributes() calls');
    }
    
    // Check for common syntax issues
    if (deviceCode.match(/async \w+\([^)]*\)\s*{[^}]*async \w+\(/)) {
      warnings.push('Possible missing closing brace');
    }
    
  } catch (err) {
    issues.push(`Cannot read device.js: ${err.message}`);
  }
  
  return {
    valid: issues.length === 0,
    issues,
    warnings
  };
}

/**
 * Main execution
 */
function main() {
  const drivers = fs.readdirSync(driversDir).filter(name => {
    const driverPath = path.join(driversDir, name);
    return fs.statSync(driverPath).isDirectory();
  });
  
  stats.totalDrivers = drivers.length;
  console.log(`📋 Validating ${drivers.length} drivers...\n`);
  
  const results = {};
  
  for (const driverName of drivers) {
    const result = validateDriver(driverName);
    results[driverName] = result;
    
    if (result.valid) {
      stats.valid++;
    }
    
    if (result.issues.length > 0) {
      stats.errors.push({ driver: driverName, issues: result.issues });
    }
    
    if (result.warnings.length > 0) {
      stats.warnings.push({ driver: driverName, warnings: result.warnings });
    }
  }
  
  // Print results
  console.log('📊 VALIDATION RESULTS');
  console.log('======================');
  console.log(`Total drivers: ${stats.totalDrivers}`);
  console.log(`Valid drivers: ${stats.valid} (${Math.round(stats.valid / stats.totalDrivers * 100)}%)`);
  console.log(`Drivers with issues: ${stats.errors.length}`);
  console.log(`Drivers with warnings: ${stats.warnings.length}`);
  console.log();
  
  console.log('📋 CAPABILITIES');
  console.log(`Total capabilities: ${stats.capabilities.total}`);
  console.log(`Drivers with flow cards: ${stats.capabilities.withFlowCards}`);
  console.log(`Missing flow cards: ${stats.capabilities.missingFlowCards.length}`);
  console.log();
  
  console.log('🎯 FLOW CARDS');
  console.log(`Total flow cards: ${stats.flowCards.total}`);
  console.log(`With correct prefix: ${stats.flowCards.withPrefix}`);
  console.log(`With titleFormatted: ${stats.flowCards.withTitleFormatted}`);
  console.log(`Missing prefix: ${stats.flowCards.missingPrefix.length}`);
  console.log();
  
  if (stats.errors.length > 0) {
    console.log('❌ CRITICAL ERRORS:');
    stats.errors.slice(0, 10).forEach(e => {
      console.log(`\n  ${e.driver}:`);
      e.issues.forEach(issue => console.log(`    - ${issue}`));
    });
    if (stats.errors.length > 10) {
      console.log(`\n  ... and ${stats.errors.length - 10} more`);
    }
    console.log();
  }
  
  if (stats.warnings.length > 0 && stats.warnings.length <= 20) {
    console.log('⚠️  WARNINGS:');
    stats.warnings.forEach(w => {
      console.log(`\n  ${w.driver}:`);
      w.warnings.forEach(warning => console.log(`    - ${warning}`));
    });
    console.log();
  }
  
  // Final status
  if (stats.errors.length === 0) {
    console.log('✅ ALL DRIVERS VALID - READY FOR PUBLISH!');
    process.exit(0);
  } else {
    console.log(`❌ ${stats.errors.length} DRIVERS HAVE ERRORS - FIX BEFORE PUBLISH`);
    process.exit(1);
  }
}

main();
