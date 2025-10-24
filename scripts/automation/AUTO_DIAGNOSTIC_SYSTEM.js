#!/usr/bin/env node
'use strict';

/**
 * ═══════════════════════════════════════════════════════════════════
 *  AUTO DIAGNOSTIC SYSTEM v1.0
 *  Système de diagnostic autonome et intelligent
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Reprend TOUTES les découvertes et best practices:
 * - Diagnostic IAS Zone enrollment
 * - Vérification battery calculation
 * - Endpoint detection
 * - Images validation
 * - Code quality checks
 * - Performance analysis
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.join(__dirname, '../..');
const REPORTS_DIR = path.join(PROJECT_ROOT, 'reports/diagnostics');

if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

class AutoDiagnosticSystem {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.successes = [];
    this.recommendations = [];
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   *  PHASE 1: DIAGNOSTIC IAS ZONE ENROLLMENT
   * ═══════════════════════════════════════════════════════════════
   */
  async diagnoseIASZoneEnrollment() {
    console.log('\n🔍 PHASE 1: Diagnostic IAS Zone Enrollment...');
    
    const driversDir = path.join(PROJECT_ROOT, 'drivers');
    const drivers = fs.readdirSync(driversDir);
    
    let withIASZone = 0;
    let correctEnrollment = 0;
    let incorrectEnrollment = 0;
    const problematicDrivers = [];
    
    for (const driver of drivers) {
      const devicePath = path.join(driversDir, driver, 'device.js');
      
      if (fs.existsSync(devicePath)) {
        const content = fs.readFileSync(devicePath, 'utf8');
        
        // Check if driver uses IAS Zone
        if (/IAS_ZONE|iasZone/i.test(content)) {
          withIASZone++;
          
          // Check enrollment method
          const hasCorrectEnrollment = /writeAttributes.*iasCieAddress/.test(content) &&
                                       /configureReporting.*zoneStatus/.test(content) &&
                                       /zoneStatusChangeNotification/.test(content);
          
          const hasIncorrectEnrollment = /enrollResponse/.test(content);
          
          if (hasCorrectEnrollment) {
            correctEnrollment++;
            this.successes.push({
              type: 'IAS Zone',
              driver,
              message: 'Correct enrollment implementation'
            });
          } else if (hasIncorrectEnrollment) {
            incorrectEnrollment++;
            problematicDrivers.push(driver);
            this.issues.push({
              type: 'CRITICAL',
              driver,
              issue: 'Uses incorrect enrollResponse() method',
              fix: 'Replace with writeAttributes + configureReporting + listener'
            });
          } else {
            this.warnings.push({
              type: 'IAS Zone',
              driver,
              message: 'Has IAS Zone but no clear enrollment pattern'
            });
          }
        }
      }
    }
    
    console.log(`   ✅ Drivers with IAS Zone: ${withIASZone}`);
    console.log(`   ✅ Correct enrollment: ${correctEnrollment}`);
    console.log(`   ${incorrectEnrollment > 0 ? '❌' : '✅'} Incorrect enrollment: ${incorrectEnrollment}`);
    
    if (incorrectEnrollment > 0) {
      this.recommendations.push({
        priority: 'CRITICAL',
        action: `Fix ${incorrectEnrollment} drivers with incorrect IAS Zone enrollment`,
        drivers: problematicDrivers,
        command: 'node scripts/fixes/FIX_IAS_ZONE_ENROLLMENT.js'
      });
    }
    
    return {
      total: withIASZone,
      correct: correctEnrollment,
      incorrect: incorrectEnrollment,
      problematic: problematicDrivers
    };
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   *  PHASE 2: DIAGNOSTIC BATTERY CALCULATION
   * ═══════════════════════════════════════════════════════════════
   */
  async diagnoseBatteryCalculation() {
    console.log('\n🔋 PHASE 2: Diagnostic Battery Calculation...');
    
    const driversDir = path.join(PROJECT_ROOT, 'drivers');
    const drivers = fs.readdirSync(driversDir);
    
    let withBattery = 0;
    let smartCalculation = 0;
    let simpleCalculation = 0;
    const needsImprovement = [];
    
    for (const driver of drivers) {
      const devicePath = path.join(driversDir, driver, 'device.js');
      
      if (fs.existsSync(devicePath)) {
        const content = fs.readFileSync(devicePath, 'utf8');
        
        if (/measure_battery|batteryPercentageRemaining/i.test(content)) {
          withBattery++;
          
          // Check for smart calculation (handles both 0-100 and 0-200)
          const hasSmartCalc = /if\s*\(.*value.*<=.*100\)/.test(content) &&
                              /value\s*\/\s*2/.test(content);
          
          if (hasSmartCalc) {
            smartCalculation++;
            this.successes.push({
              type: 'Battery',
              driver,
              message: 'Smart battery calculation implemented'
            });
          } else if (/value\s*\/\s*2/.test(content)) {
            simpleCalculation++;
            needsImprovement.push(driver);
            this.warnings.push({
              type: 'Battery',
              driver,
              message: 'Simple calculation only (no 0-100 check)'
            });
          }
        }
      }
    }
    
    console.log(`   ✅ Drivers with battery: ${withBattery}`);
    console.log(`   ✅ Smart calculation: ${smartCalculation}`);
    console.log(`   ⚠️  Simple calculation: ${simpleCalculation}`);
    
    if (needsImprovement.length > 0) {
      this.recommendations.push({
        priority: 'MEDIUM',
        action: `Upgrade ${needsImprovement.length} drivers to smart battery calculation`,
        drivers: needsImprovement.slice(0, 10),
        info: 'Smart calc handles both 0-100 and 0-200 ranges'
      });
    }
    
    return {
      total: withBattery,
      smart: smartCalculation,
      simple: simpleCalculation,
      needsImprovement
    };
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   *  PHASE 3: DIAGNOSTIC IMAGES
   * ═══════════════════════════════════════════════════════════════
   */
  async diagnoseImages() {
    console.log('\n🎨 PHASE 3: Diagnostic Images...');
    
    const driversDir = path.join(PROJECT_ROOT, 'drivers');
    const drivers = fs.readdirSync(driversDir);
    
    let totalDrivers = 0;
    let withUniqueImages = 0;
    let withGenericImages = 0;
    const missingImages = [];
    
    for (const driver of drivers) {
      const driverPath = path.join(driversDir, driver);
      const stat = fs.statSync(driverPath);
      
      if (stat.isDirectory()) {
        totalDrivers++;
        
        const smallImg = path.join(driverPath, 'assets', 'small.png');
        const largeImg = path.join(driverPath, 'assets', 'large.png');
        
        if (fs.existsSync(smallImg) && fs.existsSync(largeImg)) {
          const smallSize = fs.statSync(smallImg).size;
          const largeSize = fs.statSync(largeImg).size;
          
          // Unique images are typically > 5KB for small
          if (smallSize > 5000) {
            withUniqueImages++;
          } else {
            withGenericImages++;
          }
        } else {
          missingImages.push(driver);
          this.issues.push({
            type: 'MEDIUM',
            driver,
            issue: 'Missing driver images',
            fix: 'Run node scripts/generation/GENERATE_UNIQUE_DRIVER_IMAGES.js'
          });
        }
      }
    }
    
    // Check app main images
    const appSmall = path.join(PROJECT_ROOT, 'assets/images/small.png');
    const appLarge = path.join(PROJECT_ROOT, 'assets/images/large.png');
    const appXLarge = path.join(PROJECT_ROOT, 'assets/images/xlarge.png');
    
    const appImagesOK = fs.existsSync(appSmall) && 
                        fs.existsSync(appLarge) && 
                        fs.existsSync(appXLarge);
    
    console.log(`   ✅ Total drivers: ${totalDrivers}`);
    console.log(`   ✅ With unique images: ${withUniqueImages}`);
    console.log(`   ${withGenericImages > 0 ? '⚠️' : '✅'}  With generic images: ${withGenericImages}`);
    console.log(`   ${missingImages.length > 0 ? '❌' : '✅'} Missing images: ${missingImages.length}`);
    console.log(`   ${appImagesOK ? '✅' : '❌'} App main images: ${appImagesOK ? 'OK' : 'MISSING'}`);
    
    if (!appImagesOK) {
      this.issues.push({
        type: 'HIGH',
        area: 'App Images',
        issue: 'Missing app main images',
        fix: 'Run node scripts/generation/GENERATE_APP_IMAGES.js'
      });
    }
    
    return {
      totalDrivers,
      withUniqueImages,
      withGenericImages,
      missingImages,
      appImagesOK
    };
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   *  PHASE 4: CODE QUALITY CHECKS
   * ═══════════════════════════════════════════════════════════════
   */
  async diagnoseCodeQuality() {
    console.log('\n📊 PHASE 4: Code Quality Checks...');
    
    const driversDir = path.join(PROJECT_ROOT, 'drivers');
    const drivers = fs.readdirSync(driversDir);
    
    let totalFiles = 0;
    let withErrorHandling = 0;
    let withLogging = 0;
    let withComments = 0;
    
    for (const driver of drivers) {
      const devicePath = path.join(driversDir, driver, 'device.js');
      
      if (fs.existsSync(devicePath)) {
        totalFiles++;
        const content = fs.readFileSync(devicePath, 'utf8');
        
        if (/try\s*{[\s\S]*catch/.test(content)) withErrorHandling++;
        if (/this\.log\(/i.test(content)) withLogging++;
        if (/\/\*\*|\/\//i.test(content)) withComments++;
      }
    }
    
    const errorHandlingPercent = Math.round((withErrorHandling / totalFiles) * 100);
    const loggingPercent = Math.round((withLogging / totalFiles) * 100);
    const commentsPercent = Math.round((withComments / totalFiles) * 100);
    
    console.log(`   ✅ Files analyzed: ${totalFiles}`);
    console.log(`   ${errorHandlingPercent >= 80 ? '✅' : '⚠️'}  Error handling: ${errorHandlingPercent}%`);
    console.log(`   ${loggingPercent >= 80 ? '✅' : '⚠️'}  Logging: ${loggingPercent}%`);
    console.log(`   ${commentsPercent >= 50 ? '✅' : '⚠️'}  Documentation: ${commentsPercent}%`);
    
    return {
      totalFiles,
      errorHandlingPercent,
      loggingPercent,
      commentsPercent
    };
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   *  PHASE 5: GIT STATUS & VERSION CHECK
   * ═══════════════════════════════════════════════════════════════
   */
  async diagnoseGitStatus() {
    console.log('\n📦 PHASE 5: Git Status & Version...');
    
    try {
      // Current branch
      const branch = execSync('git branch --show-current', {
        cwd: PROJECT_ROOT,
        encoding: 'utf8'
      }).trim();
      
      // Last commit
      const lastCommit = execSync('git log -1 --pretty=format:"%h - %s"', {
        cwd: PROJECT_ROOT,
        encoding: 'utf8'
      }).trim();
      
      // Uncommitted changes
      const status = execSync('git status --porcelain', {
        cwd: PROJECT_ROOT,
        encoding: 'utf8'
      });
      
      const hasChanges = status.trim().length > 0;
      const changesCount = status.trim().split('\n').filter(l => l).length;
      
      // App version
      const appJson = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'app.json'), 'utf8'));
      const version = appJson.version;
      
      console.log(`   ✅ Branch: ${branch}`);
      console.log(`   ✅ Version: ${version}`);
      console.log(`   ✅ Last commit: ${lastCommit}`);
      console.log(`   ${hasChanges ? '⚠️' : '✅'}  Uncommitted changes: ${changesCount}`);
      
      if (hasChanges) {
        this.warnings.push({
          type: 'Git',
          message: `${changesCount} uncommitted changes`,
          action: 'Consider committing and pushing'
        });
      }
      
      return {
        branch,
        version,
        lastCommit,
        hasChanges,
        changesCount
      };
    } catch (err) {
      this.warnings.push({
        type: 'Git',
        message: 'Could not read git status: ' + err.message
      });
      return null;
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   *  PHASE 6: PERFORMANCE ANALYSIS
   * ═══════════════════════════════════════════════════════════════
   */
  async diagnosePerformance() {
    console.log('\n⚡ PHASE 6: Performance Analysis...');
    
    const driversDir = path.join(PROJECT_ROOT, 'drivers');
    const drivers = fs.readdirSync(driversDir);
    
    let avgFileSize = 0;
    let largestDriver = { name: '', size: 0 };
    let totalSize = 0;
    let fileCount = 0;
    
    for (const driver of drivers) {
      const devicePath = path.join(driversDir, driver, 'device.js');
      
      if (fs.existsSync(devicePath)) {
        const size = fs.statSync(devicePath).size;
        totalSize += size;
        fileCount++;
        
        if (size > largestDriver.size) {
          largestDriver = { name: driver, size };
        }
      }
    }
    
    avgFileSize = Math.round(totalSize / fileCount);
    
    console.log(`   ✅ Average file size: ${Math.round(avgFileSize / 1024)}KB`);
    console.log(`   ✅ Largest driver: ${largestDriver.name} (${Math.round(largestDriver.size / 1024)}KB)`);
    
    // Check for potential performance issues
    if (avgFileSize > 50000) {
      this.warnings.push({
        type: 'Performance',
        message: 'Large average file size',
        suggestion: 'Consider refactoring common code into utilities'
      });
    }
    
    return {
      avgFileSize,
      largestDriver,
      totalSize,
      fileCount
    };
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   *  GENERATE COMPREHENSIVE REPORT
   * ═══════════════════════════════════════════════════════════════
   */
  generateReport(results) {
    const timestamp = new Date().toISOString();
    const reportPath = path.join(REPORTS_DIR, `auto_diagnostic_${Date.now()}.json`);
    
    const report = {
      timestamp,
      project: 'Universal Tuya Zigbee',
      version: results.git?.version || 'unknown',
      diagnostics: {
        iasZone: results.iasZone,
        battery: results.battery,
        images: results.images,
        codeQuality: results.codeQuality,
        git: results.git,
        performance: results.performance
      },
      issues: this.issues,
      warnings: this.warnings,
      successes: this.successes.slice(0, 20), // Top 20
      recommendations: this.recommendations,
      summary: {
        totalIssues: this.issues.length,
        totalWarnings: this.warnings.length,
        totalSuccesses: this.successes.length,
        healthScore: this.calculateHealthScore(results)
      }
    };
    
    // Save JSON
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Generate Markdown
    const mdPath = path.join(REPORTS_DIR, 'AUTO_DIAGNOSTIC_LATEST.md');
    const markdown = this.generateMarkdown(report);
    fs.writeFileSync(mdPath, markdown);
    
    return { reportPath, mdPath };
  }

  calculateHealthScore(results) {
    let score = 100;
    
    // IAS Zone issues (-20 per incorrect)
    if (results.iasZone) {
      score -= results.iasZone.incorrect * 20;
    }
    
    // Missing images (-10 per driver)
    if (results.images) {
      score -= results.images.missingImages.length * 10;
      if (!results.images.appImagesOK) score -= 15;
    }
    
    // Critical issues (-15 each)
    score -= this.issues.filter(i => i.type === 'CRITICAL').length * 15;
    
    // Medium issues (-5 each)
    score -= this.issues.filter(i => i.type === 'MEDIUM').length * 5;
    
    // Warnings (-2 each)
    score -= this.warnings.length * 2;
    
    return Math.max(0, Math.min(100, score));
  }

  generateMarkdown(report) {
    return `# 🔍 AUTO DIAGNOSTIC REPORT

**Generated:** ${report.timestamp}  
**Project:** ${report.project}  
**Version:** ${report.version}  
**Health Score:** ${report.summary.healthScore}/100

---

## 📊 SUMMARY

- **Issues:** ${report.summary.totalIssues}
- **Warnings:** ${report.summary.totalWarnings}
- **Successes:** ${report.summary.totalSuccesses}

---

## 🔍 DIAGNOSTIC RESULTS

### IAS Zone Enrollment
- Total drivers: ${report.diagnostics.iasZone?.total || 0}
- Correct: ✅ ${report.diagnostics.iasZone?.correct || 0}
- Incorrect: ${report.diagnostics.iasZone?.incorrect > 0 ? '❌' : '✅'} ${report.diagnostics.iasZone?.incorrect || 0}

### Battery Calculation
- Total: ${report.diagnostics.battery?.total || 0}
- Smart: ✅ ${report.diagnostics.battery?.smart || 0}
- Simple: ⚠️ ${report.diagnostics.battery?.simple || 0}

### Images
- Total drivers: ${report.diagnostics.images?.totalDrivers || 0}
- Unique images: ✅ ${report.diagnostics.images?.withUniqueImages || 0}
- Missing: ${report.diagnostics.images?.missingImages?.length > 0 ? '❌' : '✅'} ${report.diagnostics.images?.missingImages?.length || 0}
- App images: ${report.diagnostics.images?.appImagesOK ? '✅ OK' : '❌ MISSING'}

### Code Quality
- Error handling: ${report.diagnostics.codeQuality?.errorHandlingPercent || 0}%
- Logging: ${report.diagnostics.codeQuality?.loggingPercent || 0}%
- Documentation: ${report.diagnostics.codeQuality?.commentsPercent || 0}%

---

## ❌ ISSUES (${report.issues.length})

${report.issues.length > 0 ? report.issues.map((issue, i) => `### ${i + 1}. [${issue.type}] ${issue.driver || issue.area}
**Issue:** ${issue.issue}  
**Fix:** ${issue.fix || 'N/A'}`).join('\n\n') : 'No issues found! 🎉'}

---

## ⚠️ WARNINGS (${report.warnings.length})

${report.warnings.length > 0 ? report.warnings.slice(0, 10).map((warn, i) => `${i + 1}. **[${warn.type}]** ${warn.driver || warn.message}${warn.suggestion ? `\n   - Suggestion: ${warn.suggestion}` : ''}`).join('\n') : 'No warnings! ✅'}

---

## 🎯 RECOMMENDATIONS

${report.recommendations.length > 0 ? report.recommendations.map((rec, i) => `### ${i + 1}. [${rec.priority}] ${rec.action}
${rec.command ? `**Command:** \`${rec.command}\`` : ''}
${rec.info ? `**Info:** ${rec.info}` : ''}
${rec.drivers ? `**Affected:** ${rec.drivers.length} drivers` : ''}`).join('\n\n') : 'All good! No recommendations needed. ✅'}

---

**Generated by Auto Diagnostic System v1.0**
`;
  }
}

/**
 * MAIN EXECUTION
 */
async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║          🤖 AUTO DIAGNOSTIC SYSTEM v1.0                      ║');
  console.log('║     Analyse Autonome et Intelligente du Projet              ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  
  const system = new AutoDiagnosticSystem();
  const results = {};
  
  try {
    results.iasZone = await system.diagnoseIASZoneEnrollment();
    results.battery = await system.diagnoseBatteryCalculation();
    results.images = await system.diagnoseImages();
    results.codeQuality = await system.diagnoseCodeQuality();
    results.git = await system.diagnoseGitStatus();
    results.performance = await system.diagnosePerformance();
    
    console.log('\n📄 Generating Reports...');
    const { reportPath, mdPath } = system.generateReport(results);
    
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                    ✅ DIAGNOSTIC COMPLETE                     ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
    
    console.log(`📊 Health Score: ${system.calculateHealthScore(results)}/100`);
    console.log(`❌ Issues: ${system.issues.length}`);
    console.log(`⚠️  Warnings: ${system.warnings.length}`);
    console.log(`✅ Successes: ${system.successes.length}`);
    console.log(`🎯 Recommendations: ${system.recommendations.length}`);
    
    console.log(`\n📁 Reports saved:`);
    console.log(`   - ${path.relative(PROJECT_ROOT, reportPath)}`);
    console.log(`   - ${path.relative(PROJECT_ROOT, mdPath)}`);
    
  } catch (error) {
    console.error('\n❌ Diagnostic failed:', error);
    process.exit(1);
  }
}

main();
