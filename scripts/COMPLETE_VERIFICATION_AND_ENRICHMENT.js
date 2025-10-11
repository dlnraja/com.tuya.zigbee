#!/usr/bin/env node

/**
 * COMPLETE VERIFICATION AND ENRICHMENT
 * Vérifie TOUT le projet et enrichit avec les dernières données
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

console.log('🔍 COMPLETE PROJECT VERIFICATION & ENRICHMENT\n');
console.log('='.repeat(70) + '\n');

// Stats globales
const stats = {
  drivers: 0,
  images: { small: 0, large: 0, xlarge: 0, missing: 0 },
  manifests: { valid: 0, missing: 0, errors: [] },
  devices: { total: 0, valid: 0, errors: [] },
  capabilities: new Set(),
  categories: {},
  powerTypes: { ac: 0, battery: 0, hybrid: 0, dc: 0, usb: 0, unknown: 0 },
  zigbee: { endpoints: 0, noEndpoints: 0 },
  completeness: { complete: 0, needsWork: 0 }
};

// 1. VERIFY DRIVERS
console.log('📁 STEP 1: Verifying Drivers\n');

const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => {
  const stat = fs.statSync(path.join(DRIVERS_DIR, d));
  return stat.isDirectory();
});

stats.drivers = drivers.length;
console.log(`✅ Found ${drivers.length} drivers\n`);

// 2. CHECK IMAGES
console.log('🖼️  STEP 2: Checking Images\n');

drivers.forEach(driver => {
  const assetsPath = path.join(DRIVERS_DIR, driver, 'assets');
  
  if (fs.existsSync(path.join(assetsPath, 'small.png'))) {
    const size = fs.statSync(path.join(assetsPath, 'small.png')).size;
    if (size > 100) stats.images.small++;
    else stats.images.missing++;
  } else {
    stats.images.missing++;
  }
  
  if (fs.existsSync(path.join(assetsPath, 'large.png'))) {
    const size = fs.statSync(path.join(assetsPath, 'large.png')).size;
    if (size > 100) stats.images.large++;
    else stats.images.missing++;
  } else {
    stats.images.missing++;
  }
  
  if (fs.existsSync(path.join(assetsPath, 'xlarge.png'))) {
    const size = fs.statSync(path.join(assetsPath, 'xlarge.png')).size;
    if (size > 100) stats.images.xlarge++;
  }
});

console.log(`✅ small.png: ${stats.images.small}/${drivers.length}`);
console.log(`✅ large.png: ${stats.images.large}/${drivers.length}`);
console.log(`✅ xlarge.png: ${stats.images.xlarge}/${drivers.length}`);
if (stats.images.missing > 0) {
  console.log(`⚠️  Missing/empty: ${stats.images.missing}`);
}
console.log('');

// 3. CHECK MANIFESTS
console.log('📄 STEP 3: Checking Driver Manifests\n');

drivers.forEach(driver => {
  const manifestPath = path.join(DRIVERS_DIR, driver, 'driver.compose.json');
  
  if (!fs.existsSync(manifestPath)) {
    stats.manifests.missing++;
    stats.manifests.errors.push(`${driver}: No driver.compose.json`);
    return;
  }
  
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    stats.manifests.valid++;
    
    // Check capabilities
    if (manifest.capabilities) {
      manifest.capabilities.forEach(cap => stats.capabilities.add(cap));
    }
    
    // Check category
    if (manifest.class) {
      stats.categories[manifest.class] = (stats.categories[manifest.class] || 0) + 1;
    }
    
    // Check power type (from driver name)
    const lower = driver.toLowerCase();
    if (lower.includes('_ac')) stats.powerTypes.ac++;
    else if (lower.includes('_battery')) stats.powerTypes.battery++;
    else if (lower.includes('_hybrid')) stats.powerTypes.hybrid++;
    else if (lower.includes('_dc')) stats.powerTypes.dc++;
    else if (lower.includes('_usb')) stats.powerTypes.usb++;
    else if (lower.includes('cr2032') || lower.includes('cr2450')) stats.powerTypes.battery++;
    else stats.powerTypes.unknown++;
    
    // Check zigbee endpoints
    if (manifest.zigbee && manifest.zigbee.endpoints) {
      stats.zigbee.endpoints++;
    } else {
      stats.zigbee.noEndpoints++;
    }
    
    // Completeness score
    let complete = true;
    if (!manifest.name || !manifest.name.en) complete = false;
    if (!manifest.class) complete = false;
    if (!manifest.capabilities || manifest.capabilities.length === 0) complete = false;
    if (!manifest.images || !manifest.images.small) complete = false;
    
    if (complete) stats.completeness.complete++;
    else stats.completeness.needsWork++;
    
  } catch (err) {
    stats.manifests.errors.push(`${driver}: ${err.message}`);
  }
});

console.log(`✅ Valid manifests: ${stats.manifests.valid}/${drivers.length}`);
console.log(`⚠️  Missing manifests: ${stats.manifests.missing}`);
if (stats.manifests.errors.length > 0) {
  console.log(`❌ Errors: ${stats.manifests.errors.length}`);
  stats.manifests.errors.slice(0, 5).forEach(e => console.log(`   - ${e}`));
}
console.log('');

// 4. CHECK DEVICE FILES
console.log('🔌 STEP 4: Checking Device Files\n');

drivers.forEach(driver => {
  const devicePath = path.join(DRIVERS_DIR, driver, 'device.js');
  
  if (!fs.existsSync(devicePath)) {
    stats.devices.errors.push(`${driver}: No device.js`);
    return;
  }
  
  stats.devices.total++;
  
  try {
    const content = fs.readFileSync(devicePath, 'utf8');
    
    // Check for required imports
    if (content.includes('ZigBeeDevice') || content.includes('ZigBeeLightDevice')) {
      stats.devices.valid++;
    } else {
      stats.devices.errors.push(`${driver}: No ZigBee imports`);
    }
  } catch (err) {
    stats.devices.errors.push(`${driver}: ${err.message}`);
  }
});

console.log(`✅ device.js files: ${stats.devices.total}/${drivers.length}`);
console.log(`✅ Valid devices: ${stats.devices.valid}/${drivers.length}`);
if (stats.devices.errors.length > 0) {
  console.log(`⚠️  Issues: ${stats.devices.errors.length}`);
}
console.log('');

// 5. CAPABILITIES ANALYSIS
console.log('⚙️  STEP 5: Capabilities Analysis\n');
console.log(`✅ Unique capabilities: ${stats.capabilities.size}`);
console.log(`   ${Array.from(stats.capabilities).slice(0, 10).join(', ')}${stats.capabilities.size > 10 ? '...' : ''}`);
console.log('');

// 6. CATEGORIES DISTRIBUTION
console.log('📊 STEP 6: Categories Distribution\n');
Object.entries(stats.categories)
  .sort((a, b) => b[1] - a[1])
  .forEach(([cat, count]) => {
    console.log(`   ${cat}: ${count} drivers`);
  });
console.log('');

// 7. POWER TYPES
console.log('🔋 STEP 7: Power Types Distribution\n');
console.log(`   AC: ${stats.powerTypes.ac}`);
console.log(`   Battery: ${stats.powerTypes.battery}`);
console.log(`   Hybrid: ${stats.powerTypes.hybrid}`);
console.log(`   DC: ${stats.powerTypes.dc}`);
console.log(`   USB: ${stats.powerTypes.usb}`);
console.log(`   Unknown: ${stats.powerTypes.unknown}`);
console.log('');

// 8. ZIGBEE COMPLIANCE
console.log('📡 STEP 8: Zigbee SDK3 Compliance\n');
console.log(`✅ With endpoints: ${stats.zigbee.endpoints}/${drivers.length}`);
console.log(`⚠️  Without endpoints: ${stats.zigbee.noEndpoints}/${drivers.length}`);
console.log('');

// 9. COMPLETENESS SCORE
console.log('🎯 STEP 9: Completeness Score\n');
const percentage = Math.round((stats.completeness.complete / drivers.length) * 100);
console.log(`✅ Complete drivers: ${stats.completeness.complete}/${drivers.length} (${percentage}%)`);
console.log(`⚠️  Need work: ${stats.completeness.needsWork}/${drivers.length}`);
console.log('');

// 10. RECOMMENDATIONS
console.log('💡 STEP 10: Recommendations\n');

const recommendations = [];

if (stats.images.missing > 0) {
  recommendations.push(`Generate ${stats.images.missing} missing images`);
}

if (stats.zigbee.noEndpoints > 0) {
  recommendations.push(`Add endpoints to ${stats.zigbee.noEndpoints} drivers for SDK3`);
}

if (stats.completeness.needsWork > 20) {
  recommendations.push(`Complete ${stats.completeness.needsWork} drivers with missing info`);
}

if (stats.powerTypes.unknown > 10) {
  recommendations.push(`Clarify power type for ${stats.powerTypes.unknown} drivers`);
}

if (recommendations.length === 0) {
  console.log('✅ No major issues found! Project is in good shape.');
} else {
  recommendations.forEach((rec, i) => {
    console.log(`${i + 1}. ${rec}`);
  });
}

console.log('');
console.log('='.repeat(70));
console.log('');

// FINAL SUMMARY
const healthScore = Math.round((
  (stats.images.small / drivers.length) * 0.2 +
  (stats.images.large / drivers.length) * 0.2 +
  (stats.manifests.valid / drivers.length) * 0.2 +
  (stats.devices.valid / drivers.length) * 0.2 +
  (stats.completeness.complete / drivers.length) * 0.2
) * 100);

console.log(`🏆 PROJECT HEALTH SCORE: ${healthScore}%\n`);

if (healthScore >= 90) {
  console.log('✅ EXCELLENT! Project is production-ready!');
} else if (healthScore >= 75) {
  console.log('✅ GOOD! Minor improvements recommended.');
} else if (healthScore >= 60) {
  console.log('⚠️  FAIR - Some work needed for production.');
} else {
  console.log('❌ NEEDS WORK - Multiple issues to address.');
}

console.log('');
console.log('🎉 VERIFICATION COMPLETE!');
console.log('');

// Save report
const report = {
  timestamp: new Date().toISOString(),
  drivers: drivers.length,
  healthScore,
  stats,
  recommendations
};

fs.writeFileSync(
  path.join(ROOT, 'reports', 'VERIFICATION_REPORT.json'),
  JSON.stringify(report, null, 2)
);

console.log('📝 Report saved to reports/VERIFICATION_REPORT.json');
