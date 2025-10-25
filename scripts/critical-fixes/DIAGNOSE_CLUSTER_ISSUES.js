#!/usr/bin/env node

/**
 * DIAGNOSE CLUSTER ISSUES
 * Scanne tous les fichiers pour trouver les problèmes cluster ID
 */

const fs = require('fs');
const path = require('path');

class ClusterIssueDiagnoser {
  constructor() {
    this.projectRoot = path.join(__dirname, '../..');
    this.issues = [];
    this.stats = {
      filesScanned: 0,
      clusterStringUsage: 0,
      missingGangSetup: 0,
      powerSourceIssues: 0,
      pathIssues: 0
    };
  }

  /**
   * Scan all device.js and driver.js files
   */
  scanAllFiles() {
    console.log('🔍 CLUSTER ISSUE DIAGNOSER');
    console.log('='.repeat(70));
    console.log('');

    // Scan drivers
    const driversPath = path.join(this.projectRoot, 'drivers');
    const drivers = fs.readdirSync(driversPath, { withFileTypes: true })
      .filter(d => d.isDirectory() && !d.name.startsWith('.'));

    console.log(`📂 Scanning ${drivers.length} drivers...`);
    console.log('');

    drivers.forEach(driver => {
      const driverPath = path.join(driversPath, driver.name);
      
      // Check device.js
      const deviceFile = path.join(driverPath, 'device.js');
      if (fs.existsSync(deviceFile)) {
        this.scanFile(deviceFile, driver.name, 'device');
      }

      // Check driver.js
      const driverFile = path.join(driverPath, 'driver.js');
      if (fs.existsSync(driverFile)) {
        this.scanFile(driverFile, driver.name, 'driver');
      }
    });

    // Scan lib files
    const libPath = path.join(this.projectRoot, 'lib');
    if (fs.existsSync(libPath)) {
      this.scanDirectory(libPath, 'lib');
    }

    this.generateReport();
  }

  /**
   * Scan a directory recursively
   */
  scanDirectory(dirPath, context) {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });

    items.forEach(item => {
      const fullPath = path.join(dirPath, item.name);
      
      if (item.isDirectory()) {
        this.scanDirectory(fullPath, context);
      } else if (item.name.endsWith('.js')) {
        this.scanFile(fullPath, context, path.basename(item.name, '.js'));
      }
    });
  }

  /**
   * Scan a single file
   */
  scanFile(filePath, driverName, fileType) {
    this.stats.filesScanned++;
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    // Check for cluster string usage
    this.checkClusterStrings(content, lines, filePath, driverName);

    // Check for gang setup issues
    if (driverName.includes('gang') || driverName.includes('port')) {
      this.checkGangSetup(content, lines, filePath, driverName);
    }

    // Check for power source issues
    this.checkPowerSourceSaving(content, lines, filePath, driverName);

    // Check for path issues
    this.checkRequirePaths(content, lines, filePath, driverName);
  }

  /**
   * Check for cluster string usage instead of numbers
   */
  checkClusterStrings(content, lines, filePath, driverName) {
    // Pattern: clusters[CLUSTER.XXX] or clusters['XXX']
    const clusterStringPatterns = [
      /clusters\[CLUSTER\./g,
      /clusters\['[A-Z_]+'\]/g,
      /clusters\["[A-Z_]+"\]/g,
      /CLUSTER\.[A-Z_]+/g
    ];

    clusterStringPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        this.stats.clusterStringUsage += matches.length;
        
        // Find line numbers
        const lineNumbers = [];
        lines.forEach((line, idx) => {
          if (pattern.test(line)) {
            lineNumbers.push(idx + 1);
          }
        });

        this.issues.push({
          type: 'CLUSTER_STRING_USAGE',
          severity: 'CRITICAL',
          file: filePath,
          driver: driverName,
          lines: lineNumbers,
          matches: matches,
          message: `Using cluster strings instead of numeric IDs`,
          fix: 'Replace cluster strings with numeric cluster IDs'
        });
      }
    });
  }

  /**
   * Check for missing gang setup
   */
  checkGangSetup(content, lines, filePath, driverName) {
    // Extract number from driver name
    const gangMatch = driverName.match(/(\d+)gang|(\d+)port/);
    if (!gangMatch) return;

    const gangCount = parseInt(gangMatch[1] || gangMatch[2]);
    if (gangCount <= 1) return;

    // Check how many gangs are registered
    const gang1Pattern = /registerCapabilityListener\s*\(\s*['"]onoff['"]/;
    const gang2Pattern = /registerCapabilityListener\s*\(\s*['"]onoff\.gang2['"]/;
    const gang3Pattern = /registerCapabilityListener\s*\(\s*['"]onoff\.gang3['"]/;
    
    const hasGang1 = gang1Pattern.test(content);
    const hasGang2 = gang2Pattern.test(content);
    const hasGang3 = gang3Pattern.test(content);

    if (gangCount >= 2 && hasGang1 && !hasGang2) {
      this.stats.missingGangSetup++;
      this.issues.push({
        type: 'MISSING_GANG_SETUP',
        severity: 'CRITICAL',
        file: filePath,
        driver: driverName,
        expected: gangCount,
        found: 1,
        message: `Driver expects ${gangCount} gangs but only gang 1 is configured`,
        fix: `Add setup for gangs 2-${gangCount}`
      });
    }

    if (gangCount >= 3 && hasGang2 && !hasGang3) {
      this.stats.missingGangSetup++;
      this.issues.push({
        type: 'MISSING_GANG_SETUP',
        severity: 'HIGH',
        file: filePath,
        driver: driverName,
        expected: gangCount,
        found: 2,
        message: `Driver expects ${gangCount} gangs but only 2 are configured`,
        fix: `Add setup for gangs 3-${gangCount}`
      });
    }
  }

  /**
   * Check for power source saving issues
   */
  checkPowerSourceSaving(content, lines, filePath, driverName) {
    const hasDetection = /detectPowerSource/.test(content);
    const hasSetStore = /setStoreValue\s*\(\s*['"]power_source['"]/;
    const hasSetCapability = /setCapabilityValue\s*\(\s*['"]power_source['"]/;

    if (hasDetection) {
      const storesValue = hasSetStore.test(content);
      const setsCapability = hasSetCapability.test(content);

      if (!storesValue || !setsCapability) {
        this.stats.powerSourceIssues++;
        this.issues.push({
          type: 'POWER_SOURCE_NOT_SAVED',
          severity: 'HIGH',
          file: filePath,
          driver: driverName,
          hasDetection: true,
          storesValue,
          setsCapability,
          message: 'Power source detected but not properly saved',
          fix: 'Add setStoreValue and setCapabilityValue after detection'
        });
      }
    }
  }

  /**
   * Check for require path issues
   */
  checkRequirePaths(content, lines, filePath, driverName) {
    // Check for incorrect BaseHybridDevice paths
    const requirePattern = /require\s*\(\s*['"]\.\.\/lib\/BaseHybridDevice['"]/;
    
    if (requirePattern.test(content)) {
      // Check if file is in drivers/xxx/device.js
      if (filePath.includes('drivers') && filePath.includes('device.js')) {
        this.stats.pathIssues++;
        this.issues.push({
          type: 'INCORRECT_REQUIRE_PATH',
          severity: 'CRITICAL',
          file: filePath,
          driver: driverName,
          current: '../lib/BaseHybridDevice',
          correct: '../../lib/BaseHybridDevice',
          message: 'Incorrect require path - missing one level',
          fix: 'Change ../lib/ to ../../lib/'
        });
      }
    }
  }

  /**
   * Generate diagnostic report
   */
  generateReport() {
    console.log('');
    console.log('='.repeat(70));
    console.log('📊 DIAGNOSTIC REPORT');
    console.log('='.repeat(70));
    console.log('');

    console.log('📈 Statistics:');
    console.log(`   Files scanned: ${this.stats.filesScanned}`);
    console.log(`   Cluster string usage: ${this.stats.clusterStringUsage}`);
    console.log(`   Missing gang setups: ${this.stats.missingGangSetup}`);
    console.log(`   Power source issues: ${this.stats.powerSourceIssues}`);
    console.log(`   Path issues: ${this.stats.pathIssues}`);
    console.log('');

    // Group issues by severity
    const critical = this.issues.filter(i => i.severity === 'CRITICAL');
    const high = this.issues.filter(i => i.severity === 'HIGH');
    const medium = this.issues.filter(i => i.severity === 'MEDIUM');

    console.log(`🔴 CRITICAL Issues: ${critical.length}`);
    if (critical.length > 0) {
      critical.slice(0, 10).forEach((issue, idx) => {
        console.log(`\n${idx + 1}. ${issue.type}`);
        console.log(`   Driver: ${issue.driver}`);
        console.log(`   File: ${path.relative(this.projectRoot, issue.file)}`);
        console.log(`   ${issue.message}`);
        console.log(`   Fix: ${issue.fix}`);
      });
      if (critical.length > 10) {
        console.log(`\n   ... and ${critical.length - 10} more critical issues`);
      }
    }

    console.log('');
    console.log(`🟡 HIGH Priority Issues: ${high.length}`);
    console.log(`🟢 MEDIUM Priority Issues: ${medium.length}`);

    // Save detailed report
    const reportPath = path.join(this.projectRoot, 'reports', 'CLUSTER_DIAGNOSTIC_REPORT.json');
    const report = {
      timestamp: new Date().toISOString(),
      stats: this.stats,
      issues: this.issues,
      summary: {
        total: this.issues.length,
        critical: critical.length,
        high: high.length,
        medium: medium.length
      }
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log('');
    console.log(`📄 Detailed report saved: ${path.relative(this.projectRoot, reportPath)}`);

    // Summary
    console.log('');
    console.log('='.repeat(70));
    if (this.issues.length === 0) {
      console.log('✅ NO ISSUES FOUND');
    } else {
      console.log(`❌ FOUND ${this.issues.length} ISSUES`);
      console.log('');
      console.log('Next steps:');
      console.log('1. Review report: reports/CLUSTER_DIAGNOSTIC_REPORT.json');
      console.log('2. Run fixer: node scripts/critical-fixes/FIX_CLUSTER_GANG_POWER.js');
      console.log('3. Test with affected devices');
      console.log('4. Deploy to production');
    }
    console.log('='.repeat(70));
  }
}

// Run
const diagnoser = new ClusterIssueDiagnoser();
diagnoser.scanAllFiles();
