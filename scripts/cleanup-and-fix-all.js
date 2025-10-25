#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

/**
 * CLEANUP & FIX ALL ISSUES
 * Nettoie backups + Vérifie et corrige tous les drivers
 */

const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');
const ARCHIVE_DIR = path.join(__dirname, '..', '.archive', 'backups');

console.log('🔧 CLEANUP & FIX ALL ISSUES\n');
console.log('═'.repeat(80));

// ═══════════════════════════════════════════════════════════════════
// PHASE 1: CLEANUP BACKUP FILES
// ═══════════════════════════════════════════════════════════════════

console.log('\n📦 PHASE 1: CLEANING BACKUP FILES\n');

let backupsFound = 0;
let backupsMoved = 0;

// Create archive directory
if (!fs.existsSync(ARCHIVE_DIR)) {
  fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
  console.log(`✅ Created archive directory: ${ARCHIVE_DIR}`);
}

// Find and move backup files
function findBackups(dir) {
  const items = fs.readdirSync(dir);
  
  items.forEach(item => {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      findBackups(fullPath);
    } else if (item.match(/\.(backup|bak|old|tmp)$|~$/)) {
      backupsFound++;
      
      // Create target path in archive
      const relativePath = path.relative(DRIVERS_DIR, fullPath);
      const targetPath = path.join(ARCHIVE_DIR, relativePath);
      const targetDir = path.dirname(targetPath);
      
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      
      // Move file
      fs.renameSync(fullPath, targetPath);
      backupsMoved++;
      
      if (backupsMoved <= 10) {
        console.log(`  📁 Moved: ${relativePath}`);
      }
    }
  });
}

findBackups(DRIVERS_DIR);

if (backupsMoved > 10) {
  console.log(`  ... and ${backupsMoved - 10} more files`);
}

console.log(`\n✅ Cleanup complete: ${backupsMoved} backup files moved to archive`);

// ═══════════════════════════════════════════════════════════════════
// PHASE 2: VERIFY AND FIX DRIVER ISSUES
// ═══════════════════════════════════════════════════════════════════

console.log('\n' + '═'.repeat(80));
console.log('\n🔍 PHASE 2: VERIFYING DRIVERS\n');

const issues = {
  batteryMissing: [],
  batteryWrongType: [],
  capabilitiesIncorrect: [],
  energyConfigMissing: [],
  endpointsMissing: [],
  imagesInvalid: []
};

const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => 
  fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory() && !d.startsWith('.')
);

console.log(`📊 Analyzing ${drivers.length} drivers...\n`);

drivers.forEach(driverName => {
  const composeFile = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
  
  if (!fs.existsSync(composeFile)) return;
  
  try {
    const compose = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
    const caps = compose.capabilities || [];
    
    // Check 1: Battery capability but no energy config
    if (caps.includes('measure_battery')) {
      if (!compose.energy || !compose.energy.batteries) {
        issues.batteryMissing.push(driverName);
      } else {
        // Check battery type correctness
        const batteries = compose.energy.batteries;
        if (!Array.isArray(batteries) || batteries.length === 0) {
          issues.batteryWrongType.push(driverName);
        }
      }
    }
    
    // Check 2: Multi-gang without proper capabilities
    const gangMatch = driverName.match(/(\d)gang/);
    if (gangMatch) {
      const gangCount = parseInt(gangMatch[1]);
      const onoffCaps = caps.filter(c => c === 'onoff' || c.startsWith('onoff.'));
      
      if (onoffCaps.length < gangCount) {
        issues.capabilitiesIncorrect.push({
          driver: driverName,
          expected: gangCount,
          found: onoffCaps.length
        });
      }
    }
    
    // Check 3: Zigbee device without endpoints
    if (compose.zigbee && !compose.zigbee.endpoints) {
      issues.endpointsMissing.push(driverName);
    }
    
    // Check 4: Images path validation
    if (compose.images) {
      ['small', 'large', 'xlarge'].forEach(size => {
        if (compose.images[size]) {
          const imagePath = compose.images[size].replace(/^\//, '').replace('drivers/', '');
          const fullImagePath = path.join(__dirname, '..', imagePath);
          
          if (!fs.existsSync(fullImagePath)) {
            issues.imagesInvalid.push({
              driver: driverName,
              size,
              path: compose.images[size]
            });
          }
        }
      });
    }
    
  } catch (e) {
    console.error(`❌ Error reading ${driverName}:`, e.message);
  }
});

// ═══════════════════════════════════════════════════════════════════
// PHASE 3: REPORT ISSUES
// ═══════════════════════════════════════════════════════════════════

console.log('\n' + '═'.repeat(80));
console.log('\n📋 ISSUES FOUND:\n');

console.log(`Battery Config Missing:     ${issues.batteryMissing.length}`);
console.log(`Battery Type Incorrect:     ${issues.batteryWrongType.length}`);
console.log(`Capabilities Incorrect:     ${issues.capabilitiesIncorrect.length}`);
console.log(`Endpoints Missing:          ${issues.endpointsMissing.length}`);
console.log(`Invalid Images:             ${issues.imagesInvalid.length}`);

const totalIssues = 
  issues.batteryMissing.length +
  issues.batteryWrongType.length +
  issues.capabilitiesIncorrect.length +
  issues.endpointsMissing.length +
  issues.imagesInvalid.length;

console.log(`\n${'─'.repeat(40)}`);
console.log(`TOTAL ISSUES:               ${totalIssues}`);

// ═══════════════════════════════════════════════════════════════════
// PHASE 4: AUTO-FIX ISSUES
// ═══════════════════════════════════════════════════════════════════

console.log('\n' + '═'.repeat(80));
console.log('\n🔧 PHASE 4: AUTO-FIXING ISSUES\n');

let fixed = 0;

// Fix 1: Add battery config
issues.batteryMissing.forEach(driverName => {
  const composeFile = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
  const compose = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
  
  // Detect likely battery type from driver name
  let batteries = ['CR2032'];
  
  if (driverName.includes('motion') || driverName.includes('sensor')) {
    batteries = ['AAA', 'AAA'];
  } else if (driverName.includes('button') || driverName.includes('remote')) {
    batteries = ['CR2032', 'CR2450'];
  } else if (driverName.includes('switch') && driverName.includes('wall')) {
    batteries = ['AAA', 'AAA', 'AAA'];
  }
  
  compose.energy = compose.energy || {};
  compose.energy.batteries = batteries;
  compose.energy.approximation = { usageConstant: 0.5 };
  
  fs.writeFileSync(composeFile, JSON.stringify(compose, null, 2));
  console.log(`  ✅ Fixed battery config: ${driverName}`);
  fixed++;
});

// Fix 2: Correct battery type
issues.batteryWrongType.forEach(driverName => {
  const composeFile = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
  const compose = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
  
  if (!Array.isArray(compose.energy.batteries) || compose.energy.batteries.length === 0) {
    compose.energy.batteries = ['CR2032'];
    fs.writeFileSync(composeFile, JSON.stringify(compose, null, 2));
    console.log(`  ✅ Fixed battery type: ${driverName}`);
    fixed++;
  }
});

// Fix 3: Add missing endpoints for multi-gang
issues.capabilitiesIncorrect.forEach(issue => {
  const composeFile = path.join(DRIVERS_DIR, issue.driver, 'driver.compose.json');
  const compose = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
  
  // Add missing onoff capabilities
  const missing = issue.expected - issue.found;
  for (let i = issue.found + 1; i <= issue.expected; i++) {
    if (i === 1) {
      if (!compose.capabilities.includes('onoff')) {
        compose.capabilities.push('onoff');
      }
    } else {
      const cap = `onoff.button${i}`;
      if (!compose.capabilities.includes(cap)) {
        compose.capabilities.push(cap);
      }
    }
  }
  
  fs.writeFileSync(composeFile, JSON.stringify(compose, null, 2));
  console.log(`  ✅ Fixed capabilities: ${issue.driver} (added ${missing} channels)`);
  fixed++;
});

console.log(`\n✅ Auto-fixed ${fixed} issues`);

// ═══════════════════════════════════════════════════════════════════
// PHASE 5: GENERATE REPORT
// ═══════════════════════════════════════════════════════════════════

const report = {
  timestamp: new Date().toISOString(),
  cleanup: {
    backupsFound,
    backupsMoved
  },
  analysis: {
    driversAnalyzed: drivers.length,
    issuesFound: totalIssues,
    issuesFixed: fixed
  },
  remainingIssues: {
    endpointsMissing: issues.endpointsMissing.length,
    imagesInvalid: issues.imagesInvalid.length
  },
  details: {
    endpointsMissing: issues.endpointsMissing,
    imagesInvalid: issues.imagesInvalid.slice(0, 10)
  }
};

fs.writeFileSync(
  path.join(__dirname, '..', 'CLEANUP_AND_FIX_REPORT.json'),
  JSON.stringify(report, null, 2)
);

console.log('\n' + '═'.repeat(80));
console.log('\n✅ COMPLETE!\n');
console.log(`📊 Summary:`);
console.log(`   - Backups moved:    ${backupsMoved}`);
console.log(`   - Drivers analyzed: ${drivers.length}`);
console.log(`   - Issues found:     ${totalIssues}`);
console.log(`   - Issues fixed:     ${fixed}`);
console.log(`   - Remaining:        ${totalIssues - fixed}`);
console.log(`\n📄 Report saved: CLEANUP_AND_FIX_REPORT.json\n`);
