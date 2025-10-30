'use strict';

const fs = require('fs');
const path = require('path');

/**
 * SDK COMPLIANCE CHECKER
 * Based on all official Homey SDK guides:
 * - COMPLETE_SDK_REFERENCE.md
 * - NODE_22_UPGRADE_GUIDE.md
 * - SDK3_COMPLIANCE_STATUS.md
 * - ZIGBEE_DEVELOPMENT_GUIDE.md
 * 
 * Validates:
 * ✅ Battery best practices
 * ✅ Capabilities usage
 * ✅ Flow arguments (max 1-2)
 * ✅ Energy arrays
 * ✅ Node.js 22 compatibility
 */

class SDKComplianceChecker {
  constructor() {
    this.issues = {
      critical: [],
      warning: [],
      info: []
    };
    this.stats = {
      driversChecked: 0,
      filesChecked: 0,
      issuesFound: 0
    };
  }
  
  /**
   * Main check function
   */
  async checkAll() {
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║  🔍 SDK COMPLIANCE CHECKER - Based on Official Guides   ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');
    
    const projectRoot = path.join(__dirname, '../..');
    
    // 1. Check app.json
    await this.checkAppJson(projectRoot);
    
    // 2. Check all drivers
    await this.checkAllDrivers(projectRoot);
    
    // 3. Check Node.js 22 compatibility
    await this.checkNodeCompatibility(projectRoot);
    
    // 4. Report
    this.generateReport();
  }
  
  /**
   * Check app.json compliance
   */
  async checkAppJson(root) {
    console.log('📋 Checking app.json...\n');
    
    const appJsonPath = path.join(root, 'app.json');
    if (!fs.existsSync(appJsonPath)) {
      this.issues.critical.push({
        file: 'app.json',
        issue: 'Missing app.json',
        guide: 'COMPLETE_SDK_REFERENCE.md'
      });
      return;
    }
    
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    
    // Check SDK version
    if (appJson.sdk !== 3) {
      this.issues.critical.push({
        file: 'app.json',
        issue: `SDK version ${appJson.sdk} (should be 3)`,
        guide: 'SDK3_COMPLIANCE_STATUS.md',
        fix: 'Set "sdk": 3'
      });
    } else {
      console.log('   ✅ SDK version: 3');
    }
    
    // Check compatibility
    if (!appJson.compatibility || !appJson.compatibility.startsWith('>=12')) {
      this.issues.warning.push({
        file: 'app.json',
        issue: 'Compatibility should be >=12.2.0 for SDK v3',
        guide: 'SDK3_COMPLIANCE_STATUS.md'
      });
    } else {
      console.log(`   ✅ Compatibility: ${appJson.compatibility}`);
    }
    
    // Check contributors format (SDK v3)
    if (appJson.contributors) {
      if (!appJson.contributors.developers && !appJson.contributors.translators) {
        this.issues.warning.push({
          file: 'app.json',
          issue: 'contributors should be object with developers/translators',
          guide: 'COMPLETE_SDK_REFERENCE.md',
          fix: '{ "developers": [...], "translators": [...] }'
        });
      } else {
        console.log('   ✅ Contributors format: correct');
      }
    }
    
    console.log();
  }
  
  /**
   * Check all drivers
   */
  async checkAllDrivers(root) {
    console.log('🚗 Checking all drivers...\n');
    
    const driversDir = path.join(root, 'drivers');
    if (!fs.existsSync(driversDir)) return;
    
    const drivers = fs.readdirSync(driversDir);
    
    for (const driverId of drivers) {
      await this.checkDriver(root, driverId);
      this.stats.driversChecked++;
    }
    
    console.log(`\n   📊 Checked ${this.stats.driversChecked} drivers\n`);
  }
  
  /**
   * Check individual driver
   */
  async checkDriver(root, driverId) {
    const driverDir = path.join(root, 'drivers', driverId);
    const composeFile = path.join(driverDir, 'driver.compose.json');
    const deviceFile = path.join(driverDir, 'device.js');
    
    if (!fs.existsSync(composeFile)) return;
    
    const driver = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
    
    // 1. BATTERY BEST PRACTICES
    await this.checkBatteryBestPractices(driverId, driver);
    
    // 2. CAPABILITIES VALIDATION
    await this.checkCapabilities(driverId, driver);
    
    // 3. ENERGY ARRAYS
    await this.checkEnergyArrays(driverId, driver);
    
    // 4. FLOW ARGUMENTS
    await this.checkFlowArguments(driverId, driver);
    
    // 5. DEVICE.JS COMPLIANCE
    if (fs.existsSync(deviceFile)) {
      await this.checkDeviceJs(driverId, deviceFile);
    }
  }
  
  /**
   * CRITICAL: Battery Best Practices
   * Based on: COMPLETE_SDK_REFERENCE.md
   * RULE: NEVER use both measure_battery AND alarm_battery
   */
  async checkBatteryBestPractices(driverId, driver) {
    const caps = driver.capabilities || [];
    
    const hasMeasureBattery = caps.includes('measure_battery');
    const hasAlarmBattery = caps.includes('alarm_battery');
    
    // CRITICAL VIOLATION
    if (hasMeasureBattery && hasAlarmBattery) {
      this.issues.critical.push({
        driver: driverId,
        issue: '❌ VIOLATION: Both measure_battery AND alarm_battery',
        guide: 'COMPLETE_SDK_REFERENCE.md',
        rule: 'NEVER use both',
        fix: 'Remove alarm_battery, keep measure_battery'
      });
      this.stats.issuesFound++;
    }
  }
  
  /**
   * Check energy.batteries array
   */
  async checkEnergyArrays(driverId, driver) {
    const caps = driver.capabilities || [];
    const hasBattery = caps.includes('measure_battery') || caps.includes('alarm_battery');
    
    if (hasBattery) {
      const batteries = driver.energy?.batteries;
      
      if (!batteries || !Array.isArray(batteries) || batteries.length === 0) {
        this.issues.warning.push({
          driver: driverId,
          issue: 'Missing energy.batteries array for battery device',
          guide: 'COMPLETE_SDK_REFERENCE.md',
          fix: 'Add "energy": { "batteries": ["CR2032"] }'
        });
        this.stats.issuesFound++;
      }
    }
  }
  
  /**
   * Check capabilities usage
   */
  async checkCapabilities(driverId, driver) {
    const caps = driver.capabilities || [];
    
    // Check for non-existent capabilities
    const validCaps = [
      'onoff', 'dim', 'measure_temperature', 'measure_humidity',
      'measure_battery', 'alarm_motion', 'alarm_contact',
      'measure_power', 'meter_power', 'target_temperature',
      'light_hue', 'light_saturation', 'light_temperature',
      'measure_voltage', 'measure_current', 'alarm_battery',
      'windowcoverings_state', 'windowcoverings_tilt_set',
      'locked', 'lock_mode', 'measure_co2', 'measure_pm25',
      'measure_luminance', 'alarm_smoke', 'alarm_fire',
      'alarm_water', 'alarm_tamper', 'volume_set',
      'speaker_playing', 'speaker_next', 'speaker_prev'
    ];
    
    for (const cap of caps) {
      // Skip custom capabilities (onoff.usb2, etc.)
      if (cap.includes('.')) continue;
      
      if (!validCaps.includes(cap)) {
        this.issues.warning.push({
          driver: driverId,
          capability: cap,
          issue: 'Non-standard capability (verify if intentional)',
          guide: 'COMPLETE_SDK_REFERENCE.md'
        });
      }
    }
  }
  
  /**
   * Check flow arguments (max 1-2)
   */
  async checkFlowArguments(driverId, driver) {
    const flow = driver.flow || {};
    
    const checkArgs = (cards, type) => {
      if (!cards) return;
      
      for (const [cardId, card] of Object.entries(cards)) {
        const args = card.args || [];
        
        if (args.length > 2) {
          this.issues.warning.push({
            driver: driverId,
            card: `${type}:${cardId}`,
            issue: `${args.length} arguments (best practice: max 1-2)`,
            guide: 'COMPLETE_SDK_REFERENCE.md',
            recommendation: 'Consider splitting into multiple cards'
          });
        }
      }
    };
    
    checkArgs(flow.triggers, 'trigger');
    checkArgs(flow.conditions, 'condition');
    checkArgs(flow.actions, 'action');
  }
  
  /**
   * Check device.js for SDK v3 compliance
   */
  async checkDeviceJs(driverId, deviceFile) {
    const content = fs.readFileSync(deviceFile, 'utf8');
    this.stats.filesChecked++;
    
    // Check for BaseHybridDevice import
    if (content.includes('BaseHybridDevice')) {
      if (!content.includes("require('./") && !content.includes('require("./') &&
          !content.includes("require('../") && !content.includes('require("../')) {
        this.issues.warning.push({
          driver: driverId,
          file: 'device.js',
          issue: 'BaseHybridDevice used but import not found',
          fix: 'Add: const BaseHybridDevice = require("../../lib/BaseHybridDevice")'
        });
      }
    }
    
    // Check for async/await (SDK v3)
    if (!content.includes('async') || !content.includes('await')) {
      this.issues.info.push({
        driver: driverId,
        file: 'device.js',
        issue: 'No async/await found (consider using promises)',
        guide: 'SDK3_COMPLIANCE_STATUS.md'
      });
    }
  }
  
  /**
   * Check Node.js 22 compatibility
   */
  async checkNodeCompatibility(root) {
    console.log('📦 Checking Node.js 22 compatibility...\n');
    
    const packagePath = path.join(root, 'package.json');
    if (!fs.existsSync(packagePath)) return;
    
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    // Check engines.node
    const nodeVersion = pkg.engines?.node;
    if (!nodeVersion) {
      this.issues.warning.push({
        file: 'package.json',
        issue: 'Missing engines.node',
        guide: 'NODE_22_UPGRADE_GUIDE.md',
        fix: 'Add "engines": { "node": ">=22.0.0" }'
      });
    } else if (!nodeVersion.includes('22')) {
      this.issues.info.push({
        file: 'package.json',
        issue: `Node.js version: ${nodeVersion} (consider >=22.0.0)`,
        guide: 'NODE_22_UPGRADE_GUIDE.md'
      });
    } else {
      console.log('   ✅ Node.js version: compatible with v22');
    }
    
    // Check for node-fetch (known issue in Node 22)
    if (pkg.dependencies?.['node-fetch']) {
      this.issues.warning.push({
        file: 'package.json',
        issue: 'node-fetch dependency (use native fetch in Node 22)',
        guide: 'NODE_22_UPGRADE_GUIDE.md',
        fix: 'Remove node-fetch, use global fetch()'
      });
    }
    
    console.log();
  }
  
  /**
   * Generate final report
   */
  generateReport() {
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║  📊 SDK COMPLIANCE REPORT                                ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');
    
    console.log(`📈 Statistics:`);
    console.log(`   Drivers checked: ${this.stats.driversChecked}`);
    console.log(`   Files checked: ${this.stats.filesChecked}`);
    console.log(`   Issues found: ${this.stats.issuesFound}\n`);
    
    // Critical issues
    if (this.issues.critical.length > 0) {
      console.log(`🔴 CRITICAL ISSUES (${this.issues.critical.length}):\n`);
      this.issues.critical.forEach((issue, i) => {
        console.log(`   ${i + 1}. ${issue.driver || issue.file}`);
        console.log(`      Issue: ${issue.issue}`);
        if (issue.fix) console.log(`      Fix: ${issue.fix}`);
        console.log(`      Guide: ${issue.guide}\n`);
      });
    } else {
      console.log('✅ No critical issues found!\n');
    }
    
    // Warnings
    if (this.issues.warning.length > 0) {
      console.log(`⚠️  WARNINGS (${this.issues.warning.length}):\n`);
      this.issues.warning.slice(0, 10).forEach((issue, i) => {
        console.log(`   ${i + 1}. ${issue.driver || issue.file}`);
        console.log(`      ${issue.issue}`);
        if (issue.fix) console.log(`      Fix: ${issue.fix}`);
        console.log();
      });
      
      if (this.issues.warning.length > 10) {
        console.log(`   ... and ${this.issues.warning.length - 10} more warnings\n`);
      }
    }
    
    // Info
    if (this.issues.info.length > 0) {
      console.log(`ℹ️  INFO (${this.issues.info.length} suggestions)\n`);
    }
    
    // Save detailed report
    const reportPath = path.join(__dirname, '../../diagnostics/sdk-compliance-report.json');
    const reportDir = path.dirname(reportPath);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      stats: this.stats,
      issues: this.issues
    }, null, 2));
    
    console.log(`💾 Detailed report saved: diagnostics/sdk-compliance-report.json\n`);
    
    // Compliance score
    const totalChecks = this.stats.driversChecked * 5; // 5 checks per driver
    const issuesWeight = this.issues.critical.length * 10 + 
                        this.issues.warning.length * 2 + 
                        this.issues.info.length * 0.5;
    const score = Math.max(0, Math.min(100, 100 - (issuesWeight / totalChecks * 100)));
    
    console.log(`🎯 SDK COMPLIANCE SCORE: ${Math.round(score)}/100\n`);
    
    if (score >= 95) {
      console.log('🎉 EXCELLENT! Near-perfect SDK compliance!');
    } else if (score >= 80) {
      console.log('✅ GOOD! Minor improvements recommended.');
    } else if (score >= 60) {
      console.log('⚠️  FAIR. Several issues to address.');
    } else {
      console.log('❌ NEEDS WORK. Critical issues must be fixed.');
    }
    
    console.log('\n📚 Guides consulted:');
    console.log('   - COMPLETE_SDK_REFERENCE.md');
    console.log('   - NODE_22_UPGRADE_GUIDE.md');
    console.log('   - SDK3_COMPLIANCE_STATUS.md');
    console.log('   - ZIGBEE_DEVELOPMENT_GUIDE.md\n');
  }
}

// Run if called directly
if (require.main === module) {
  const checker = new SDKComplianceChecker();
  checker.checkAll().catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });
}

module.exports = SDKComplianceChecker;
