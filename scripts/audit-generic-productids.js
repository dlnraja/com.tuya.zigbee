#!/usr/bin/env node
'use strict';

/**
 * Audit Generic ProductIDs Script
 * Scans all drivers and identifies problematic generic productIds
 * that cause driver collision issues
 * 
 * CRITICAL: TS0002, TS0601, TS0011 are used by 30+ devices each!
 */

const fs = require('fs');
const path = require('path');

// Known problematic generic IDs
const GENERIC_IDS = [
  'TS0001', 'TS0002', 'TS0003', 'TS0004',  // Generic switches
  'TS0011', 'TS0012', 'TS0013', 'TS0014',  // More switches
  'TS0601',  // Generic Tuya smart sensor (100+ device types!)
  'TS0121', 'TS011F',  // Generic plugs
  'TS0201', 'TS0202', 'TS0203',  // Generic sensors
  'TS0215', 'TS0215A',  // Generic buttons
];

const results = {
  totalDrivers: 0,
  driversWithGenericIds: [],
  genericIdUsage: {},
  recommendations: [],
  criticalIssues: []
};

function scanDriver(driverPath, driverName) {
  const composePath = path.join(driverPath, 'driver.compose.json');
  
  if (!fs.existsSync(composePath)) {
    return;
  }
  
  results.totalDrivers++;
  
  try {
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    const fingerprints = compose.zigbee?.manufacturerName || [];
    const productIds = [];
    
    // Check manufacturerName array entries
    if (Array.isArray(fingerprints)) {
      fingerprints.forEach(entry => {
        if (typeof entry === 'string') {
          // Old format: just manufacturerName
          productIds.push('(no productId specified)');
        } else if (entry.productId) {
          productIds.push(entry.productId);
        }
      });
    }
    
    // Check legacy productId field
    if (compose.zigbee?.productId) {
      productIds.push(compose.zigbee.productId);
    }
    
    // Analyze
    const hasGenericId = productIds.some(id => GENERIC_IDS.includes(id));
    const hasOnlyProductId = fingerprints.some(entry => 
      entry && entry.productId && !entry.manufacturerName
    );
    
    if (hasGenericId || hasOnlyProductId) {
      const issue = {
        driver: driverName,
        path: driverPath,
        productIds: [...new Set(productIds)],
        issues: []
      };
      
      if (hasGenericId) {
        issue.issues.push('Uses generic productId');
      }
      
      if (hasOnlyProductId) {
        issue.issues.push('productId without manufacturerName');
      }
      
      results.driversWithGenericIds.push(issue);
      
      // Track usage
      productIds.forEach(id => {
        if (GENERIC_IDS.includes(id)) {
          if (!results.genericIdUsage[id]) {
            results.genericIdUsage[id] = [];
          }
          results.genericIdUsage[id].push(driverName);
        }
      });
    }
    
  } catch (err) {
    console.error(`Error reading ${composePath}:`, err.message);
  }
}

function generateRecommendations() {
  // Find most problematic IDs
  Object.keys(results.genericIdUsage).forEach(id => {
    const drivers = results.genericIdUsage[id];
    if (drivers.length > 5) {
      results.criticalIssues.push({
        productId: id,
        driverCount: drivers.length,
        severity: 'CRITICAL',
        impact: `${drivers.length} drivers will collide during pairing!`,
        drivers: drivers
      });
      
      results.recommendations.push({
        priority: 'HIGH',
        action: `Refine fingerprints for ${id}`,
        details: `Add manufacturerName to all ${drivers.length} drivers using ${id}`,
        affected: drivers
      });
    }
  });
  
  // Generic recommendations
  results.recommendations.push({
    priority: 'MEDIUM',
    action: 'Implement pairing flow driver selection',
    details: 'Allow users to manually select driver when multiple match',
    affected: 'All drivers with generic productIds'
  });
  
  results.recommendations.push({
    priority: 'LOW',
    action: 'Create device signature database',
    details: 'GitHub Pages site with device → driver mapping',
    affected: 'User experience improvement'
  });
}

function generateReport() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 GENERIC PRODUCTID AUDIT REPORT');
  console.log('='.repeat(80) + '\n');
  
  console.log(`Total drivers scanned: ${results.totalDrivers}`);
  console.log(`Drivers with issues: ${results.driversWithGenericIds.length}`);
  console.log(`Generic IDs found: ${Object.keys(results.genericIdUsage).length}\n`);
  
  console.log('📊 GENERIC ID USAGE:\n');
  Object.entries(results.genericIdUsage)
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([id, drivers]) => {
      console.log(`  ${id}: ${drivers.length} drivers`);
      console.log(`    ${drivers.slice(0, 5).join(', ')}${drivers.length > 5 ? ` + ${drivers.length - 5} more` : ''}\n`);
    });
  
  if (results.criticalIssues.length > 0) {
    console.log('\n🚨 CRITICAL ISSUES:\n');
    results.criticalIssues.forEach((issue, i) => {
      console.log(`  ${i + 1}. ${issue.productId} (${issue.severity})`);
      console.log(`     Impact: ${issue.impact}`);
      console.log(`     Drivers: ${issue.driverCount}`);
      console.log('');
    });
  }
  
  console.log('\n💡 RECOMMENDATIONS:\n');
  results.recommendations.forEach((rec, i) => {
    console.log(`  ${i + 1}. [${rec.priority}] ${rec.action}`);
    console.log(`     ${rec.details}`);
    if (Array.isArray(rec.affected)) {
      console.log(`     Affects: ${rec.affected.length} drivers`);
    } else {
      console.log(`     Affects: ${rec.affected}`);
    }
    console.log('');
  });
  
  console.log('='.repeat(80));
  
  // Save JSON report
  const reportPath = path.join(__dirname, '..', 'reports', 'generic-productid-audit.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 Full report saved to: ${reportPath}\n`);
}

// Main
const driversDir = path.join(__dirname, '..', 'drivers');
const drivers = fs.readdirSync(driversDir);

console.log(`Scanning ${drivers.length} drivers...`);

drivers.forEach(driverName => {
  const driverPath = path.join(driversDir, driverName);
  if (fs.statSync(driverPath).isDirectory()) {
    scanDriver(driverPath, driverName);
  }
});

generateRecommendations();
generateReport();

// Exit code
process.exit(results.criticalIssues.length > 0 ? 1 : 0);
