#!/usr/bin/env node
/**
 * DEEP COHERENCE CHECKER - Comprehensive Driver Validation
 * Checks: Flow cards, Cluster IDs, Naming, Categories, Capabilities
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_PATH = path.join(__dirname, '../../drivers');
const APP_JSON_PATH = path.join(__dirname, '../../app.json');
const FLOW_PATH = path.join(__dirname, '../../flow');

class DeepCoherenceChecker {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.fixes = [];
    this.stats = {
      driversChecked: 0,
      flowCardsMissing: 0,
      clusterErrors: 0,
      namingIssues: 0,
      categoryErrors: 0
    };
  }

  log(msg, type = 'info') {
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      warning: '\x1b[33m',
      error: '\x1b[31m',
      reset: '\x1b[0m'
    };
    console.log(`${colors[type]}${msg}${colors.reset}`);
  }

  /**
   * Main checker
   */
  async run() {
    this.log('\n🔍 DEEP COHERENCE CHECK - Starting...', 'info');
    this.log('=' .repeat(80), 'info');

    // Load app.json
    const appJson = JSON.parse(fs.readFileSync(APP_JSON_PATH, 'utf8'));
    
    // Check all drivers
    await this.checkAllDrivers(appJson);
    
    // Check flow cards
    await this.checkFlowCards(appJson);
    
    // Check naming consistency
    await this.checkNamingConsistency(appJson);
    
    // Check categories
    await this.checkCategories(appJson);
    
    // Generate report
    this.generateReport();
  }

  /**
   * Check all drivers for issues
   */
  async checkAllDrivers(appJson) {
    this.log('\n📁 Checking all drivers...', 'info');
    
    const drivers = appJson.drivers || [];
    
    for (const driver of drivers) {
      this.stats.driversChecked++;
      const driverId = driver.id;
      const driverPath = path.join(DRIVERS_PATH, driverId);
      
      if (!fs.existsSync(driverPath)) {
        this.errors.push(`Driver folder missing: ${driverId}`);
        continue;
      }

      // Check device.js
      await this.checkDeviceFile(driverId, driver);
      
      // Check driver.js
      await this.checkDriverFile(driverId, driver);
      
      // Check capabilities consistency
      await this.checkCapabilities(driverId, driver);
      
      // Check class consistency
      await this.checkClass(driverId, driver);
    }
    
    this.log(`✅ Checked ${this.stats.driversChecked} drivers`, 'success');
  }

  /**
   * Check device.js file for cluster issues
   */
  async checkDeviceFile(driverId, driver) {
    const devicePath = path.join(DRIVERS_PATH, driverId, 'device.js');
    
    if (!fs.existsSync(devicePath)) {
      return; // Some drivers might not have device.js
    }
    
    const content = fs.readFileSync(devicePath, 'utf8');
    
    // Check for CLUSTER.XXX usage (should be numeric)
    const clusterMatches = content.match(/this\.CLUSTER\.\w+/g);
    if (clusterMatches) {
      this.stats.clusterErrors += clusterMatches.length;
      this.errors.push({
        driver: driverId,
        type: 'CLUSTER_ERROR',
        message: `Uses this.CLUSTER.XXX instead of numeric IDs`,
        occurrences: clusterMatches.length,
        fix: 'Replace with numeric cluster IDs (e.g., 6 for onOff, 1 for power)'
      });
    }
    
    // Check for registerCapability with wrong cluster format
    const registerCapMatches = content.match(/registerCapability\([^)]+\)/g);
    if (registerCapMatches) {
      registerCapMatches.forEach(match => {
        if (match.includes('CLUSTER.') || match.includes("'ms") || match.includes("'gen")) {
          this.warnings.push({
            driver: driverId,
            type: 'REGISTER_CAPABILITY_WARNING',
            message: `registerCapability may have cluster format issues: ${match.substring(0, 50)}...`
          });
        }
      });
    }
  }

  /**
   * Check driver.js for flow card registration issues
   */
  async checkDriverFile(driverId, driver) {
    const driverJsPath = path.join(DRIVERS_PATH, driverId, 'driver.js');
    
    if (!fs.existsSync(driverJsPath)) {
      return;
    }
    
    const content = fs.readFileSync(driverJsPath, 'utf8');
    
    // Check for getDeviceTriggerCard calls
    const triggerMatches = content.match(/getDeviceTriggerCard\(['"]([^'"]+)['"]\)/g);
    if (triggerMatches) {
      triggerMatches.forEach(match => {
        const cardId = match.match(/['"]([^'"]+)['"]/)[1];
        // We'll check if this exists in flow/triggers.json later
        this.fixes.push({
          driver: driverId,
          type: 'FLOW_CARD_CHECK',
          cardId: cardId
        });
      });
    }
  }

  /**
   * Check if all required flow cards exist
   */
  async checkFlowCards(appJson) {
    this.log('\n🎴 Checking flow cards...', 'info');
    
    const flowTriggers = appJson.flow?.triggers || [];
    const flowActions = appJson.flow?.actions || [];
    const flowConditions = appJson.flow?.conditions || [];
    
    const existingTriggerIds = new Set(flowTriggers.map(t => t.id));
    const existingActionIds = new Set(flowActions.map(a => a.id));
    const existingConditionIds = new Set(flowConditions.map(c => c.id));
    
    // Check fixes array for missing flow cards
    this.fixes.forEach(fix => {
      if (fix.type === 'FLOW_CARD_CHECK') {
        if (!existingTriggerIds.has(fix.cardId) && 
            !existingActionIds.has(fix.cardId) && 
            !existingConditionIds.has(fix.cardId)) {
          this.stats.flowCardsMissing++;
          this.errors.push({
            driver: fix.driver,
            type: 'MISSING_FLOW_CARD',
            cardId: fix.cardId,
            message: `Flow card "${fix.cardId}" referenced but not defined`
          });
        }
      }
    });
    
    this.log(`❌ Found ${this.stats.flowCardsMissing} missing flow cards`, 'error');
  }

  /**
   * Check naming consistency
   */
  async checkNamingConsistency(appJson) {
    this.log('\n📝 Checking naming consistency...', 'info');
    
    const drivers = appJson.drivers || [];
    const nameMap = new Map();
    
    drivers.forEach(driver => {
      const name = driver.name?.en || driver.name;
      if (!name) return;
      
      if (!nameMap.has(name)) {
        nameMap.set(name, []);
      }
      nameMap.get(name).push(driver.id);
    });
    
    // Find duplicates
    nameMap.forEach((driverIds, name) => {
      if (driverIds.length > 1) {
        this.stats.namingIssues++;
        this.warnings.push({
          type: 'DUPLICATE_NAME',
          name: name,
          drivers: driverIds,
          message: `Name "${name}" used by ${driverIds.length} drivers: ${driverIds.join(', ')}`
        });
      }
    });
    
    this.log(`⚠️  Found ${this.stats.namingIssues} naming conflicts`, 'warning');
  }

  /**
   * Check categories and class consistency
   */
  async checkCategories(appJson) {
    this.log('\n🗂️  Checking categories...', 'info');
    
    const drivers = appJson.drivers || [];
    
    drivers.forEach(driver => {
      const driverId = driver.id;
      const driverClass = driver.class;
      const capabilities = driver.capabilities || [];
      
      // Check for dimmer capabilities on switches
      if (driverId.includes('switch') && !driverId.includes('dimmer')) {
        if (capabilities.includes('dim') || capabilities.includes('light_intensity')) {
          this.stats.categoryErrors++;
          this.errors.push({
            driver: driverId,
            type: 'CATEGORY_MISMATCH',
            message: `Switch driver has dimmer capabilities`,
            fix: 'Either rename to dimmer_xxx or remove dim capabilities'
          });
        }
      }
      
      // Check for switches with wrong class
      if (driverId.includes('switch') && driverClass !== 'socket' && driverClass !== 'light') {
        this.warnings.push({
          driver: driverId,
          type: 'CLASS_WARNING',
          message: `Switch driver has class "${driverClass}" - usually should be "socket"`
        });
      }
      
      // Check for dimmers without dim capability
      if (driverId.includes('dimmer')) {
        if (!capabilities.includes('dim') && !capabilities.some(c => c.startsWith('dim'))) {
          this.stats.categoryErrors++;
          this.errors.push({
            driver: driverId,
            type: 'MISSING_CAPABILITY',
            message: `Dimmer driver missing "dim" capability`,
            fix: 'Add "dim" capability or rename driver'
          });
        }
      }
    });
    
    this.log(`❌ Found ${this.stats.categoryErrors} category errors`, 'error');
  }

  /**
   * Check capabilities consistency
   */
  async checkCapabilities(driverId, driver) {
    const capabilities = driver.capabilities || [];
    
    // Check for multi-gang switches
    const gangMatches = driverId.match(/(\d)gang/);
    if (gangMatches) {
      const gangCount = parseInt(gangMatches[1]);
      
      // Should have onoff.gang2, onoff.gang3, etc.
      const expectedCaps = ['onoff'];
      for (let i = 2; i <= gangCount; i++) {
        expectedCaps.push(`onoff.gang${i}`);
      }
      
      // Check if has old naming (onoff.switch_2, etc.)
      const hasOldNaming = capabilities.some(c => c.includes('.switch_'));
      if (hasOldNaming) {
        this.errors.push({
          driver: driverId,
          type: 'OLD_CAPABILITY_NAMING',
          message: `Uses old capability naming (onoff.switch_X instead of onoff.gangX)`,
          fix: 'Rename to onoff.gang2, onoff.gang3, etc.'
        });
      }
    }
  }

  /**
   * Check class consistency
   */
  async checkClass(driverId, driver) {
    const driverClass = driver.class;
    
    // Check for invalid classes
    const validClasses = ['socket', 'light', 'sensor', 'button', 'thermostat', 'lock', 
                          'windowcoverings', 'fan', 'heater', 'other'];
    
    if (!validClasses.includes(driverClass)) {
      this.errors.push({
        driver: driverId,
        type: 'INVALID_CLASS',
        class: driverClass,
        message: `Invalid class "${driverClass}"`,
        fix: `Use one of: ${validClasses.join(', ')}`
      });
    }
  }

  /**
   * Generate comprehensive report
   */
  generateReport() {
    this.log('\n' + '='.repeat(80), 'info');
    this.log('📊 DEEP COHERENCE CHECK - REPORT', 'info');
    this.log('='.repeat(80) + '\n', 'info');
    
    // Stats
    this.log('📈 Statistics:', 'info');
    console.log(`   Drivers checked: ${this.stats.driversChecked}`);
    console.log(`   Flow cards missing: ${this.stats.flowCardsMissing}`);
    console.log(`   Cluster errors: ${this.stats.clusterErrors}`);
    console.log(`   Naming issues: ${this.stats.namingIssues}`);
    console.log(`   Category errors: ${this.stats.categoryErrors}`);
    
    // Errors
    if (this.errors.length > 0) {
      this.log(`\n❌ ERRORS (${this.errors.length}):`, 'error');
      this.errors.slice(0, 20).forEach((err, i) => {
        console.log(`\n${i + 1}. ${err.type || 'ERROR'}`);
        if (err.driver) console.log(`   Driver: ${err.driver}`);
        if (err.message) console.log(`   Message: ${err.message}`);
        if (err.fix) console.log(`   Fix: ${err.fix}`);
      });
      if (this.errors.length > 20) {
        console.log(`\n   ... and ${this.errors.length - 20} more errors`);
      }
    }
    
    // Warnings
    if (this.warnings.length > 0) {
      this.log(`\n⚠️  WARNINGS (${this.warnings.length}):`, 'warning');
      this.warnings.slice(0, 10).forEach((warn, i) => {
        console.log(`\n${i + 1}. ${warn.type || 'WARNING'}`);
        if (warn.driver) console.log(`   Driver: ${warn.driver}`);
        if (warn.message) console.log(`   Message: ${warn.message}`);
      });
      if (this.warnings.length > 10) {
        console.log(`\n   ... and ${this.warnings.length - 10} more warnings`);
      }
    }
    
    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      stats: this.stats,
      errors: this.errors,
      warnings: this.warnings
    };
    
    const reportPath = path.join(__dirname, '../../reports/DEEP_COHERENCE_REPORT.json');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    this.log(`\n📄 Detailed report saved: ${reportPath}`, 'success');
    
    // Summary
    this.log('\n' + '='.repeat(80), 'info');
    if (this.errors.length === 0 && this.warnings.length === 0) {
      this.log('✅ NO ISSUES FOUND - All drivers are coherent!', 'success');
    } else {
      this.log(`❌ FOUND ${this.errors.length} ERRORS and ${this.warnings.length} WARNINGS`, 'error');
      this.log('   Run the fixer scripts to resolve these issues', 'info');
    }
    this.log('='.repeat(80) + '\n', 'info');
  }
}

// Run
if (require.main === module) {
  const checker = new DeepCoherenceChecker();
  checker.run().catch(console.error);
}

module.exports = DeepCoherenceChecker;
