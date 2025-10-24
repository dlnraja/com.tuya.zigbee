#!/usr/bin/env node

/**
 * SECOND PASS FIXES - String Clusters + Battery + Logs
 * Complète les 165 string clusters restants + audit battery + logs
 */

import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const DRIVERS_DIR = path.join(PROJECT_ROOT, 'drivers');

const report = {
  timestamp: new Date().toISOString(),
  stringClusters: { fixed: 0, files: [] },
  batteryIssues: { found: 0, files: [] },
  consoleLogs: { replaced: 0, files: [] },
  total: 0
};

console.log('\n🔧 ============================================');
console.log('   SECOND PASS FIXES - CLEANUP FINAL');
console.log('============================================\n');

/**
 * Fix remaining string cluster IDs
 */
function fixStringClusters(filePath, content) {
  let modified = content;
  let changes = 0;
  
  const patterns = [
    { from: /'powerConfiguration'/g, to: 'CLUSTER.POWER_CONFIGURATION' },
    { from: /"powerConfiguration"/g, to: 'CLUSTER.POWER_CONFIGURATION' },
    { from: /'onOff'/g, to: 'CLUSTER.ON_OFF' },
    { from: /"onOff"/g, to: 'CLUSTER.ON_OFF' },
    { from: /'genOnOff'/g, to: 'CLUSTER.ON_OFF' },
    { from: /"genOnOff"/g, to: 'CLUSTER.ON_OFF' },
    { from: /'genLevelCtrl'/g, to: 'CLUSTER.LEVEL_CONTROL' },
    { from: /"genLevelCtrl"/g, to: 'CLUSTER.LEVEL_CONTROL' },
    { from: /'iasZone'/g, to: 'CLUSTER.IAS_ZONE' },
    { from: /"iasZone"/g, to: 'CLUSTER.IAS_ZONE' },
    { from: /'occupancySensing'/g, to: 'CLUSTER.OCCUPANCY_SENSING' },
    { from: /"occupancySensing"/g, to: 'CLUSTER.OCCUPANCY_SENSING' },
    { from: /'illuminanceMeasurement'/g, to: 'CLUSTER.ILLUMINANCE_MEASUREMENT' },
    { from: /"illuminanceMeasurement"/g, to: 'CLUSTER.ILLUMINANCE_MEASUREMENT' },
    { from: /'temperatureMeasurement'/g, to: 'CLUSTER.TEMPERATURE_MEASUREMENT' },
    { from: /"temperatureMeasurement"/g, to: 'CLUSTER.TEMPERATURE_MEASUREMENT' },
    { from: /'relativeHumidity'/g, to: 'CLUSTER.RELATIVE_HUMIDITY_MEASUREMENT' },
    { from: /"relativeHumidity"/g, to: 'CLUSTER.RELATIVE_HUMIDITY_MEASUREMENT' }
  ];
  
  patterns.forEach(pattern => {
    const matches = (modified.match(pattern.from) || []).length;
    if (matches > 0) {
      modified = String(modified).replace(pattern.from, pattern.to);
      changes += matches;
    }
  });
  
  return { modified, changes };
}

/**
 * Check battery implementation
 */
function checkBatteryImplementation(content) {
  const issues = [];
  
  // Check for measure_battery without POWER_CONFIGURATION
  if (content.includes('measure_battery')) {
    if (!content.includes('POWER_CONFIGURATION') && !content.includes('powerConfiguration')) {
      issues.push('measure_battery capability without POWER_CONFIGURATION cluster');
    }
    
    // Check for battery percentage reporting
    if (!content.includes('batteryPercentage') && !content.includes('BatteryPercentageRemaining')) {
      issues.push('No battery percentage attribute configured');
    }
  }
  
  return issues;
}

/**
 * Replace console.log with this.log
 */
function fixConsoleLogs(content) {
  let modified = content;
  let changes = 0;
  
  // Replace console.log (but not in comments)
  const patterns = [
    { from: /console\.log\(/g, to: 'this.log(' },
    { from: /console\.error\(/g, to: 'this.error(' },
    { from: /console\.warn\(/g, to: 'this.log(' },
    { from: /console\.info\(/g, to: 'this.log(' }
  ];
  
  patterns.forEach(pattern => {
    const matches = (modified.match(pattern.from) || []).length;
    if (matches > 0) {
      modified = String(modified).replace(pattern.from, pattern.to);
      changes += matches;
    }
  });
  
  return { modified, changes };
}

/**
 * Process all drivers
 */
function processAllDrivers() {
  const drivers = fsSync.readdirSync(DRIVERS_DIR);
  let processed = 0;
  
  drivers.forEach(driverId => {
    const driverPath = path.join(DRIVERS_DIR, driverId);
    const deviceJsPath = path.join(driverPath, 'device.js');
    
    if (!fsSync.existsSync(deviceJsPath)) return;
    
    const originalContent = fsSync.readFileSync(deviceJsPath, 'utf8');
    let content = originalContent;
    let totalChanges = 0;
    let fileModified = false;
    
    // 1. Fix string clusters
    const clusterFix = fixStringClusters(deviceJsPath, content);
    if (clusterFix.changes > 0) {
      content = clusterFix.modified;
      totalChanges += clusterFix.changes;
      report.stringClusters.fixed += clusterFix.changes;
      report.stringClusters.files.push({ driver: driverId, fixes: clusterFix.changes });
      fileModified = true;
    }
    
    // 2. Check battery implementation
    const batteryIssues = checkBatteryImplementation(content);
    if (batteryIssues.length > 0) {
      report.batteryIssues.found += batteryIssues.length;
      report.batteryIssues.files.push({ driver: driverId, issues: batteryIssues });
    }
    
    // 3. Fix console.log
    const logFix = fixConsoleLogs(content);
    if (logFix.changes > 0) {
      content = logFix.modified;
      totalChanges += logFix.changes;
      report.consoleLogs.replaced += logFix.changes;
      report.consoleLogs.files.push({ driver: driverId, fixes: logFix.changes });
      fileModified = true;
    }
    
    // Save if modified
    if (fileModified) {
      fsSync.writeFileSync(deviceJsPath, content, 'utf8');
      processed++;
      
      if (processed % 10 === 0) {
        console.log(`  ✓ Processed ${processed} drivers...`);
      }
    }
  });
  
  return processed;
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 Processing drivers...\n');
  
  const processed = processAllDrivers();
  
  console.log('\n\n============================================');
  console.log('   SECOND PASS FIXES - REPORT');
  console.log('============================================\n');
  
  // String clusters
  console.log('📋 STRING CLUSTER IDs FIXED:');
  console.log(`   Total fixed: ${report.stringClusters.fixed}`);
  console.log(`   Files modified: ${report.stringClusters.files.length}`);
  if (report.stringClusters.files.length > 0) {
    console.log('\n   Top fixes:');
    report.stringClusters.files.slice(0, 5).forEach(f => {
      console.log(`     - ${f.driver}: ${f.fixes} fixes`);
    });
  }
  
  // Battery issues
  console.log('\n\n🔋 BATTERY IMPLEMENTATION:');
  console.log(`   Issues found: ${report.batteryIssues.found}`);
  console.log(`   Drivers affected: ${report.batteryIssues.files.length}`);
  if (report.batteryIssues.files.length > 0) {
    console.log('\n   Sample issues:');
    report.batteryIssues.files.slice(0, 3).forEach(f => {
      console.log(`     ${f.driver}:`);
      f.issues.forEach(issue => {
        console.log(`       - ${issue}`);
      });
    });
  }
  
  // Console.log
  console.log('\n\n📝 CONSOLE.LOG STANDARDIZATION:');
  console.log(`   console.log replaced: ${report.consoleLogs.replaced}`);
  console.log(`   Files modified: ${report.consoleLogs.files.length}`);
  if (report.consoleLogs.files.length > 0) {
    console.log('\n   Top replacements:');
    report.consoleLogs.files.slice(0, 5).forEach(f => {
      console.log(`     - ${f.driver}: ${f.fixes} replacements`);
    });
  }
  
  // Summary
  report.total = report.stringClusters.fixed + report.consoleLogs.replaced;
  
  console.log('\n\n============================================');
  console.log(`   TOTAL FIXES: ${report.total}`);
  console.log(`   DRIVERS MODIFIED: ${processed}`);
  console.log('============================================\n');
  
  // Save report
  const reportPath = path.join(PROJECT_ROOT, 'SECOND_PASS_FIXES_REPORT.json');
  fsSync.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`📄 Report saved: SECOND_PASS_FIXES_REPORT.json\n`);
  
  console.log('✅ SECOND PASS FIXES COMPLETE!\n');
}

main();
