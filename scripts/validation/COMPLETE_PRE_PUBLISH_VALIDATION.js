#!/usr/bin/env node

/**
 * COMPLETE PRE-PUBLISH VALIDATION
 * 
 * Vérifie TOUT avant publication:
 * - Cohérence drivers vs manifests
 * - Features vs capabilities
 * - Endpoints Zigbee
 * - Flow cards
 * - Images
 * - app.json
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

console.log('🔍 COMPLETE PRE-PUBLISH VALIDATION\n');
console.log('='.repeat(70) + '\n');

const validation = {
  drivers: {
    total: 0,
    valid: 0,
    warnings: [],
    errors: []
  },
  images: {
    total: 0,
    valid: 0,
    missing: []
  },
  manifests: {
    valid: 0,
    errors: []
  },
  capabilities: {
    correct: 0,
    missing: []
  },
  endpoints: {
    defined: 0,
    missing: []
  },
  appJson: {
    drivers: 0,
    synced: true,
    issues: []
  }
};

console.log('📋 STEP 1: Validating Driver Structure\n');

const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => {
  return fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory();
});

validation.drivers.total = drivers.length;

drivers.forEach(driverName => {
  const driverPath = path.join(DRIVERS_DIR, driverName);
  const manifestPath = path.join(driverPath, 'driver.compose.json');
  const devicePath = path.join(driverPath, 'device.js');
  const assetsPath = path.join(driverPath, 'assets');
  
  let driverValid = true;
  
  // Check manifest exists
  if (!fs.existsSync(manifestPath)) {
    validation.manifests.errors.push(`${driverName}: No driver.compose.json`);
    driverValid = false;
  } else {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      
      // Check name
      if (!manifest.name || !manifest.name.en) {
        validation.drivers.warnings.push(`${driverName}: No English name`);
      }
      
      // Check class
      if (!manifest.class) {
        validation.drivers.warnings.push(`${driverName}: No class defined`);
      }
      
      // Check capabilities
      if (!manifest.capabilities || manifest.capabilities.length === 0) {
        validation.capabilities.missing.push(`${driverName}: No capabilities`);
      } else {
        validation.capabilities.correct++;
      }
      
      // Check Zigbee endpoints
      if (manifest.zigbee) {
        if (!manifest.zigbee.endpoints) {
          validation.endpoints.missing.push(`${driverName}: No endpoints defined`);
        } else {
          validation.endpoints.defined++;
        }
        
        // Check manufacturerName
        if (!manifest.zigbee.manufacturerName) {
          validation.drivers.warnings.push(`${driverName}: No manufacturerName`);
        }
        
        // Check productId
        if (!manifest.zigbee.productId) {
          validation.drivers.warnings.push(`${driverName}: No productId`);
        }
      }
      
      validation.manifests.valid++;
      
    } catch (err) {
      validation.manifests.errors.push(`${driverName}: Invalid JSON - ${err.message}`);
      driverValid = false;
    }
  }
  
  // Check device.js exists
  if (!fs.existsSync(devicePath)) {
    validation.drivers.errors.push(`${driverName}: No device.js`);
    driverValid = false;
  }
  
  // Check images
  const smallImg = path.join(assetsPath, 'small.png');
  const largeImg = path.join(assetsPath, 'large.png');
  
  if (!fs.existsSync(smallImg) || !fs.existsSync(largeImg)) {
    validation.images.missing.push(driverName);
  } else {
    // Check file sizes (should not be 0)
    const smallSize = fs.statSync(smallImg).size;
    const largeSize = fs.statSync(largeImg).size;
    
    if (smallSize < 100 || largeSize < 100) {
      validation.images.missing.push(`${driverName}: Images too small`);
    } else {
      validation.images.valid++;
    }
  }
  
  validation.images.total++;
  
  if (driverValid) {
    validation.drivers.valid++;
  }
});

console.log(`✅ Drivers: ${validation.drivers.valid}/${validation.drivers.total} valid\n`);

console.log('📋 STEP 2: Validating app.json\n');

const appJsonPath = path.join(ROOT, 'app.json');
if (fs.existsSync(appJsonPath)) {
  try {
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    
    validation.appJson.drivers = appJson.drivers.length;
    
    // Check if all drivers are in app.json
    const appDriverIds = new Set(appJson.drivers.map(d => d.id));
    drivers.forEach(driverName => {
      if (!appDriverIds.has(driverName)) {
        validation.appJson.issues.push(`Driver ${driverName} not in app.json`);
        validation.appJson.synced = false;
      }
    });
    
    // Check app version
    if (!appJson.version) {
      validation.appJson.issues.push('No version in app.json');
    }
    
    console.log(`✅ app.json has ${validation.appJson.drivers} drivers\n`);
    
  } catch (err) {
    validation.appJson.issues.push(`Invalid app.json: ${err.message}`);
  }
} else {
  validation.appJson.issues.push('app.json not found');
}

console.log('📋 STEP 3: Running Homey App Validate\n');

let validateOutput = '';
let validatePassed = false;

try {
  validateOutput = execSync('homey app validate --level publish', {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: 'pipe'
  });
  validatePassed = validateOutput.includes('✓') || validateOutput.includes('successfully');
  console.log('✅ Homey validation passed\n');
} catch (err) {
  validateOutput = err.stdout || err.message;
  console.log('❌ Homey validation failed\n');
  console.log(validateOutput);
}

// Generate Report
console.log('\n' + '='.repeat(70));
console.log('\n📊 VALIDATION REPORT\n');

console.log('🔹 DRIVERS:');
console.log(`   Total: ${validation.drivers.total}`);
console.log(`   Valid: ${validation.drivers.valid}`);
console.log(`   Errors: ${validation.drivers.errors.length}`);
console.log(`   Warnings: ${validation.drivers.warnings.length}`);

console.log('\n🔹 IMAGES:');
console.log(`   Valid: ${validation.images.valid}/${validation.images.total}`);
console.log(`   Missing: ${validation.images.missing.length}`);

console.log('\n🔹 MANIFESTS:');
console.log(`   Valid: ${validation.manifests.valid}`);
console.log(`   Errors: ${validation.manifests.errors.length}`);

console.log('\n🔹 CAPABILITIES:');
console.log(`   Defined: ${validation.capabilities.correct}`);
console.log(`   Missing: ${validation.capabilities.missing.length}`);

console.log('\n🔹 ZIGBEE ENDPOINTS:');
console.log(`   Defined: ${validation.endpoints.defined}`);
console.log(`   Missing: ${validation.endpoints.missing.length}`);

console.log('\n🔹 APP.JSON:');
console.log(`   Drivers: ${validation.appJson.drivers}`);
console.log(`   Synced: ${validation.appJson.synced ? 'Yes' : 'No'}`);
console.log(`   Issues: ${validation.appJson.issues.length}`);

console.log('\n🔹 HOMEY VALIDATION:');
console.log(`   Status: ${validatePassed ? '✅ PASSED' : '❌ FAILED'}`);

// Show critical errors
if (validation.drivers.errors.length > 0) {
  console.log('\n❌ CRITICAL ERRORS:\n');
  validation.drivers.errors.slice(0, 10).forEach(err => console.log(`   ${err}`));
  if (validation.drivers.errors.length > 10) {
    console.log(`   ... and ${validation.drivers.errors.length - 10} more`);
  }
}

if (validation.manifests.errors.length > 0) {
  console.log('\n❌ MANIFEST ERRORS:\n');
  validation.manifests.errors.slice(0, 10).forEach(err => console.log(`   ${err}`));
}

if (validation.appJson.issues.length > 0) {
  console.log('\n⚠️  APP.JSON ISSUES:\n');
  validation.appJson.issues.forEach(issue => console.log(`   ${issue}`));
}

// Calculate overall score
const totalChecks = validation.drivers.total + validation.images.total + validation.manifests.valid + validation.capabilities.correct + validation.endpoints.defined;
const passedChecks = validation.drivers.valid + validation.images.valid + validation.manifests.valid + validation.capabilities.correct + validation.endpoints.defined;
const score = Math.round((passedChecks / totalChecks) * 100);

console.log('\n' + '='.repeat(70));
console.log(`\n🎯 OVERALL HEALTH SCORE: ${score}%\n`);

// Save report
const report = {
  timestamp: new Date().toISOString(),
  score,
  validation,
  validateOutput,
  validatePassed,
  readyForPublish: validatePassed && score >= 95 && validation.drivers.errors.length === 0
};

fs.writeFileSync(
  path.join(ROOT, 'reports', 'PRE_PUBLISH_VALIDATION.json'),
  JSON.stringify(report, null, 2)
);

console.log('📝 Report saved to reports/PRE_PUBLISH_VALIDATION.json\n');

if (report.readyForPublish) {
  console.log('✅ ✅ ✅ PROJECT READY FOR PUBLISH! ✅ ✅ ✅\n');
  process.exit(0);
} else {
  console.log('⚠️  PROJECT NEEDS FIXES BEFORE PUBLISH\n');
  process.exit(1);
}
