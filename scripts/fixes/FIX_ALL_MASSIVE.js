#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('═'.repeat(80));
console.log('🔥 MASSIVE FIX - ALL 88 DRIVERS');
console.log('═'.repeat(80));

const driversDir = './drivers';
let fixed = 0;

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  
  // 1. Add CLUSTER import if missing
  if (!content.includes("require('zigbee-clusters')")) {
    content = content.replace(
      /('use strict';\s*\n)/,
      "$1\nconst { CLUSTER } = require('zigbee-clusters');\n"
    );
  }
  
  // 2. Uncomment registerCapability with CLUSTER replacement
  content = content.replace(/\/\/ this\.registerCapability\('([^']+)',\s*6,/g, "this.registerCapability('$1', CLUSTER.ON_OFF,");
  content = content.replace(/\/\/ this\.registerCapability\('([^']+)',\s*1,/g, "this.registerCapability('$1', CLUSTER.POWER_CONFIGURATION,");
  content = content.replace(/\/\/ this\.registerCapability\('([^']+)',\s*2820,/g, "this.registerCapability('$1', CLUSTER.ELECTRICAL_MEASUREMENT,");
  content = content.replace(/\/\/ this\.registerCapability\('([^']+)',\s*1794,/g, "this.registerCapability('$1', CLUSTER.METERING,");
  content = content.replace(/\/\/ this\.registerCapability\('([^']+)',\s*8,/g, "this.registerCapability('$1', CLUSTER.LEVEL_CONTROL,");
  content = content.replace(/\/\/ this\.registerCapability\('([^']+)',\s*768,/g, "this.registerCapability('$1', CLUSTER.COLOR_CONTROL,");
  
  // 3. Uncomment config lines
  content = content.replace(/\/\/ (  \w+:)/g, '$1');
  content = content.replace(/\/\/ (    )/g, '$1');
  
  // 4. Remove REFACTOR comments
  content = content.replace(/\/\* REFACTOR:.+?\*\/\s*/gs, '');
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅', path.relative(driversDir, filePath));
    return true;
  }
  return false;
}

function scanDir(dir) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    if (fs.statSync(fullPath).isDirectory()) {
      scanDir(fullPath);
    } else if (item === 'device.js') {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('// this.registerCapability')) {
        if (fixFile(fullPath)) fixed++;
      }
    }
  }
}

console.log('\n🔍 Scanning and fixing...\n');
scanDir(driversDir);

console.log('\n' + '═'.repeat(80));
console.log(`✅ FIXED ${fixed} FILES`);
console.log('═'.repeat(80));
console.log('\nValidating...');

try {
  execSync('homey app validate --level publish', { stdio: 'inherit' });
  console.log('\n✅ VALIDATION PASSED!\n');
} catch (err) {
  console.log('\n❌ Validation failed - check errors above\n');
  process.exit(1);
}
