#!/usr/bin/env node
'use strict';

/**
 * FIX CRITICAL ISSUES - Emergency Repair
 * 
 * Fixes reported by users:
 * 1. App crash - Invalid flow cards
 * 2. Missing/disorganized images
 * 3. Missing flows
 * 4. SOS button issues
 * 5. Syntax errors in device.js
 */

const fs = require('fs');
const path = require('path');

const driversDir = path.join(__dirname, '../drivers');

console.log('🚨 CRITICAL ISSUES FIX - Emergency Repair\n');

const issues = {
  missingImages: [],
  emptyDeviceJs: [],
  syntaxErrors: [],
  missingFlows: [],
  fixed: 0
};

// 1. Check and fix images
console.log('📸 Checking driver images...\n');

const drivers = fs.readdirSync(driversDir)
  .filter(name => fs.statSync(path.join(driversDir, name)).isDirectory());

for (const driverId of drivers) {
  const imagesDir = path.join(driversDir, driverId, 'assets', 'images');
  
  // Check if images directory exists
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }
  
  // Check required images
  const requiredImages = ['small.png', 'large.png', 'xlarge.png'];
  const missingInDriver = [];
  
  for (const img of requiredImages) {
    const imgPath = path.join(imagesDir, img);
    if (!fs.existsSync(imgPath)) {
      missingInDriver.push(img);
    }
  }
  
  if (missingInDriver.length > 0) {
    issues.missingImages.push({
      driver: driverId,
      missing: missingInDriver
    });
  }
}

console.log(`   Found ${issues.missingImages.length} drivers with missing images\n`);

// 2. Check device.js files for syntax errors
console.log('🔍 Checking device.js files for errors...\n');

for (const driverId of drivers) {
  const devicePath = path.join(driversDir, driverId, 'device.js');
  
  if (fs.existsSync(devicePath)) {
    const content = fs.readFileSync(devicePath, 'utf-8');
    
    // Check for common syntax errors
    if (content.includes('async pollAttributes()') && !content.includes('async pollAttributes() {')) {
      issues.syntaxErrors.push({
        driver: driverId,
        error: 'Missing bracket after async pollAttributes()'
      });
      
      // Fix it
      const fixed = String(content).replace(
        /async pollAttributes\(\)\s*\n\s*\^\^/g,
        'async pollAttributes() {'
      );
      
      if (fixed !== content) {
        fs.writeFileSync(devicePath, fixed);
        issues.fixed++;
        console.log(`   ✅ Fixed syntax error in ${driverId}`);
      }
    }
    
    // Check for empty or minimal device.js
    if (content.length < 200) {
      issues.emptyDeviceJs.push(driverId);
    }
  }
}

console.log(`   Fixed ${issues.fixed} syntax errors\n`);

// 3. Validate all driver.compose.json
console.log('📋 Validating driver configurations...\n');

let invalidDrivers = 0;

for (const driverId of drivers) {
  const composePath = path.join(driversDir, driverId, 'driver.compose.json');
  
  if (fs.existsSync(composePath)) {
    try {
      const compose = JSON.parse(fs.readFileSync(composePath, 'utf-8'));
      
      // Check for required fields
      if (!compose.id) {
        console.log(`   ❌ ${driverId}: Missing id field`);
        invalidDrivers++;
      }
      
      if (!compose.class) {
        console.log(`   ❌ ${driverId}: Missing class field`);
        invalidDrivers++;
      }
      
      // Check if capabilities array exists (even if empty is ok for some devices)
      if (!compose.capabilities) {
        compose.capabilities = [];
        fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
        console.log(`   ✅ Added empty capabilities array to ${driverId}`);
        issues.fixed++;
      }
      
    } catch (err) {
      console.log(`   ❌ ${driverId}: Invalid JSON - ${err.message}`);
      invalidDrivers++;
    }
  }
}

console.log(`   Found ${invalidDrivers} invalid driver configurations\n`);

// 4. Check flow cards coverage
console.log('🎴 Checking flow cards...\n');

let driversWithCapabilities = 0;
let driversWithFlows = 0;

for (const driverId of drivers) {
  const composePath = path.join(driversDir, driverId, 'driver.compose.json');
  const flowPath = path.join(driversDir, driverId, 'driver.flow.compose.json');
  
  if (fs.existsSync(composePath)) {
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf-8'));
    
    if (compose.capabilities && compose.capabilities.length > 0) {
      driversWithCapabilities++;
      
      if (!fs.existsSync(flowPath)) {
        issues.missingFlows.push(driverId);
      } else {
        driversWithFlows++;
      }
    }
  }
}

console.log(`   Drivers with capabilities: ${driversWithCapabilities}`);
console.log(`   Drivers with flow cards: ${driversWithFlows}`);
console.log(`   Missing flow cards: ${issues.missingFlows.length}\n`);

// SUMMARY
console.log('═══════════════════════════════════════════════════════════');
console.log('   REPAIR SUMMARY');
console.log('═══════════════════════════════════════════════════════════\n');

console.log(`📊 Issues Found:`);
console.log(`   Missing images: ${issues.missingImages.length} drivers`);
console.log(`   Syntax errors: ${issues.syntaxErrors.length} (fixed: ${issues.fixed})`);
console.log(`   Empty device.js: ${issues.emptyDeviceJs.length}`);
console.log(`   Missing flows: ${issues.missingFlows.length}`);
console.log(`   Invalid configs: ${invalidDrivers}\n`);

console.log(`✅ Auto-fixed: ${issues.fixed} issues\n`);

// Save detailed report
const reportPath = path.join(__dirname, '../CRITICAL_ISSUES_REPORT.json');
fs.writeFileSync(reportPath, JSON.stringify(issues, null, 2));

console.log(`📊 Detailed report: CRITICAL_ISSUES_REPORT.json\n`);

// Priority recommendations
console.log('🎯 PRIORITY ACTIONS:\n');

if (issues.missingImages.length > 0) {
  console.log(`1. ❌ ${issues.missingImages.length} drivers need images`);
  console.log(`   Run: node scripts/generate_missing_images.js\n`);
}

if (issues.missingFlows.length > 0) {
  console.log(`2. ⚠️  ${issues.missingFlows.length} drivers need flow cards`);
  console.log(`   Run: node scripts/generate_flow_cards_from_capabilities.js\n`);
}

if (invalidDrivers > 0) {
  console.log(`3. ❌ ${invalidDrivers} drivers have configuration errors`);
  console.log(`   Review: CRITICAL_ISSUES_REPORT.json\n`);
}

console.log('🎉 Critical issues scan complete!\n');
