#!/usr/bin/env node
'use strict';

/**
 * Automated SDK v3 Compliance Fix Script
 * Finds and reports all SDK v3 compliance issues across drivers
 * 
 * Issues detected:
 * 1. CLUSTER.X usage (should be numeric ID or proper CLUSTER import)
 * 2. getIeeeAddress() calls (should use BaseHybridDevice helper)
 * 3. Direct .catch() on potentially null values
 * 4. registerCapability with invalid cluster specs
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '../drivers');
const issues = [];

// Patterns to detect
const PATTERNS = {
  clusterConstant: /CLUSTER\.([A-Z_]+)/g,
  getIeeeAddress: /this\.homey\.zigbee\.getIeeeAddress|getData\(\)\.ieeeAddress/g,
  catchOnNull: /(?:this\.getCapabilityValue|this\.getStoreValue)\([^)]+\)\.catch/g,
  registerCapability: /registerCapability\([^,]+,\s*(['"`])[^'"`]+\1/g,
};

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const relativePath = path.relative(DRIVERS_DIR, filePath);
  const fileIssues = [];
  
  // Check for CLUSTER.X pattern
  let match;
  while ((match = PATTERNS.clusterConstant.exec(content)) !== null) {
    const line = content.substring(0, match.index).split('\n').length;
    fileIssues.push({
      file: relativePath,
      line,
      type: 'CLUSTER_CONSTANT',
      issue: `CLUSTER.${match[1]} usage`,
      fix: 'Should use numeric ID or import from zigbee-clusters'
    });
  }
  
  // Check for getIeeeAddress
  PATTERNS.getIeeeAddress.lastIndex = 0;
  while ((match = PATTERNS.getIeeeAddress.exec(content)) !== null) {
    const line = content.substring(0, match.index).split('\n').length;
    fileIssues.push({
      file: relativePath,
      line,
      type: 'IEEE_ADDRESS',
      issue: match[0],
      fix: 'Use: await this.getIeeeAddress() (from BaseHybridDevice)'
    });
  }
  
  // Check for .catch() on non-Promise
  PATTERNS.catchOnNull.lastIndex = 0;
  while ((match = PATTERNS.catchOnNull.exec(content)) !== null) {
    const line = content.substring(0, match.index).split('\n').length;
    fileIssues.push({
      file: relativePath,
      line,
      type: 'CATCH_ON_NON_PROMISE',
      issue: match[0],
      fix: 'Wrap in ZigbeeHelpers.safePromise() or check for null first'
    });
  }
  
  // Check for registerCapability with string cluster
  PATTERNS.registerCapability.lastIndex = 0;
  while ((match = PATTERNS.registerCapability.exec(content)) !== null) {
    const line = content.substring(0, match.index).split('\n').length;
    fileIssues.push({
      file: relativePath,
      line,
      type: 'REGISTER_CAPABILITY_STRING',
      issue: match[0],
      fix: 'Should use numeric cluster ID, not string'
    });
  }
  
  return fileIssues;
}

function scanDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      scanDirectory(fullPath);
    } else if (entry.isFile() && entry.name === 'device.js') {
      // Skip backup files
      if (fullPath.includes('.backup')) continue;
      
      const fileIssues = scanFile(fullPath);
      issues.push(...fileIssues);
    }
  }
}

// Run scan
console.log('🔍 Scanning drivers for SDK v3 compliance issues...\n');
scanDirectory(DRIVERS_DIR);

// Group issues by type
const grouped = {};
issues.forEach(issue => {
  if (!grouped[issue.type]) {
    grouped[issue.type] = [];
  }
  grouped[issue.type].push(issue);
});

// Report results
console.log('📊 SCAN RESULTS:\n');
console.log(`Total issues found: ${issues.length}\n`);

Object.keys(grouped).forEach(type => {
  console.log(`\n🔴 ${type} (${grouped[type].length} occurrences):`);
  console.log('─'.repeat(80));
  
  // Show first 5 examples
  grouped[type].slice(0, 5).forEach(issue => {
    console.log(`  ${issue.file}:${issue.line}`);
    console.log(`    Issue: ${issue.issue}`);
    console.log(`    Fix: ${issue.fix}\n`);
  });
  
  if (grouped[type].length > 5) {
    console.log(`  ... and ${grouped[type].length - 5} more\n`);
  }
});

// Summary
console.log('\n' + '='.repeat(80));
console.log('📋 SUMMARY BY TYPE:');
console.log('='.repeat(80));
Object.keys(grouped).forEach(type => {
  console.log(`  ${type}: ${grouped[type].length} issues`);
});

// Affected files
const affectedFiles = new Set(issues.map(i => i.file));
console.log(`\n📁 Affected drivers: ${affectedFiles.size}`);

// Save report
const reportPath = path.join(__dirname, '../SDK3_COMPLIANCE_REPORT.txt');
const report = issues.map(i => 
  `${i.file}:${i.line} [${i.type}] ${i.issue}\n  → ${i.fix}`
).join('\n\n');

fs.writeFileSync(reportPath, report);
console.log(`\n💾 Full report saved to: SDK3_COMPLIANCE_REPORT.txt`);

// Exit code
process.exit(issues.length > 0 ? 1 : 0);
