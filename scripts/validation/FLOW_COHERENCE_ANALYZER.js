#!/usr/bin/env node
/**
 * FLOW COHERENCE ANALYZER - Deep Analysis
 * Vérifie cohérence flows: triggers/actions/conditions vs app.json vs device.js
 */

const fs = require('fs');
const path = require('path');

class FlowCoherenceAnalyzer {
  constructor() {
    this.rootPath = path.join(__dirname, '../..');
    this.flowPath = path.join(this.rootPath, 'flow');
    this.driversPath = path.join(this.rootPath, 'drivers');
    this.appJsonPath = path.join(this.rootPath, 'app.json');
    
    this.issues = [];
    this.warnings = [];
    this.stats = {
      triggersInFlow: 0,
      triggersInAppJson: 0,
      actionsInFlow: 0,
      actionsInAppJson: 0,
      conditionsInFlow: 0,
      conditionsInAppJson: 0,
      driversChecked: 0,
      missingArgs: 0,
      missingTranslations: 0,
      orphanedFlows: 0,
      duplicateIds: 0
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
   * Load all flow files
   */
  loadFlows() {
    const flows = {
      triggers: [],
      actions: [],
      conditions: []
    };

    // Load from flow/ directory
    ['triggers', 'actions', 'conditions'].forEach(type => {
      const filePath = path.join(this.flowPath, `${type}.json`);
      if (fs.existsSync(filePath)) {
        flows[type] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        this.stats[`${type}InFlow`] = flows[type].length;
      }
    });

    return flows;
  }

  /**
   * Load app.json flows
   */
  loadAppJsonFlows() {
    const appJson = JSON.parse(fs.readFileSync(this.appJsonPath, 'utf8'));
    return appJson.flow || {};
  }

  /**
   * Check for missing args (device filter)
   */
  checkMissingArgs(flowCard, type) {
    if (!flowCard.args || flowCard.args.length === 0) {
      this.warnings.push({
        type: 'MISSING_ARGS',
        flowType: type,
        flowId: flowCard.id,
        message: `Flow card has no args (device filter missing)`,
        severity: 'medium'
      });
      this.stats.missingArgs++;
      return false;
    }

    // Check device filter
    const deviceArg = flowCard.args.find(a => a.type === 'device');
    if (!deviceArg) {
      this.warnings.push({
        type: 'NO_DEVICE_ARG',
        flowType: type,
        flowId: flowCard.id,
        message: `No device argument found`,
        severity: 'low'
      });
      return false;
    }

    return true;
  }

  /**
   * Check for missing translations
   */
  checkTranslations(flowCard, type) {
    const hasFrench = flowCard.title?.fr || flowCard.titleFormatted?.fr;
    
    if (!hasFrench) {
      this.warnings.push({
        type: 'MISSING_FRENCH',
        flowType: type,
        flowId: flowCard.id,
        message: `Missing French translation`,
        severity: 'low'
      });
      this.stats.missingTranslations++;
      return false;
    }

    return true;
  }

  /**
   * Extract driver ID from flow card ID
   */
  extractDriverId(flowId) {
    // Patterns:
    // button_wireless_2_button_pressed → button_wireless_2
    // usb_outlet_3gang_port1_turned_on → usb_outlet_3gang
    
    const patterns = [
      /_button_\d+_pressed$/,
      /_turned_on$/,
      /_turned_off$/,
      /_measure_\w+_changed$/,
      /_alarm_\w+$/
    ];

    let driverId = flowId;
    patterns.forEach(pattern => {
      driverId = driverId.replace(pattern, '');
    });

    return driverId;
  }

  /**
   * Check if driver exists
   */
  driverExists(driverId) {
    const driverPath = path.join(this.driversPath, driverId);
    return fs.existsSync(driverPath);
  }

  /**
   * Analyze trigger coherence
   */
  analyzeTriggers(flowTriggers, appTriggers) {
    this.log('\n🔍 Analyzing Triggers...', 'info');

    const flowIds = new Set(flowTriggers.map(t => t.id));
    const appIds = new Set(appTriggers.map(t => t.id));

    // Find duplicates in flow/triggers.json
    const duplicates = flowTriggers.filter((t, i, arr) => 
      arr.findIndex(x => x.id === t.id) !== i
    );
    
    if (duplicates.length > 0) {
      duplicates.forEach(dup => {
        this.issues.push({
          type: 'DUPLICATE_TRIGGER',
          flowId: dup.id,
          message: `Duplicate trigger in flow/triggers.json`,
          severity: 'high'
        });
        this.stats.duplicateIds++;
      });
    }

    // Check each trigger
    flowTriggers.forEach(trigger => {
      // Check if in app.json
      if (!appIds.has(trigger.id)) {
        this.issues.push({
          type: 'MISSING_IN_APPJSON',
          flowType: 'trigger',
          flowId: trigger.id,
          message: `Trigger in flow/triggers.json but not in app.json`,
          severity: 'critical'
        });
      }

      // Check args
      this.checkMissingArgs(trigger, 'trigger');

      // Check translations
      this.checkTranslations(trigger, 'trigger');

      // Check if driver exists (for device-specific triggers)
      if (trigger.id.includes('_')) {
        const driverId = this.extractDriverId(trigger.id);
        if (!this.driverExists(driverId)) {
          this.warnings.push({
            type: 'DRIVER_NOT_FOUND',
            flowType: 'trigger',
            flowId: trigger.id,
            driverId: driverId,
            message: `Driver ${driverId} not found for trigger`,
            severity: 'medium'
          });
        }
      }
    });

    // Check for orphaned triggers in app.json
    appTriggers.forEach(trigger => {
      if (!flowIds.has(trigger.id)) {
        this.warnings.push({
          type: 'ORPHANED_IN_APPJSON',
          flowType: 'trigger',
          flowId: trigger.id,
          message: `Trigger in app.json but not in flow/triggers.json (auto-generated)`,
          severity: 'low'
        });
        this.stats.orphanedFlows++;
      }
    });
  }

  /**
   * Analyze device.js trigger usage
   */
  analyzeDeviceTriggers() {
    this.log('\n🔍 Analyzing Device.js Trigger Usage...', 'info');

    const drivers = fs.readdirSync(this.driversPath, { withFileTypes: true })
      .filter(d => d.isDirectory() && !d.name.startsWith('.'));

    drivers.forEach(driver => {
      const devicePath = path.join(this.driversPath, driver.name, 'device.js');
      
      if (!fs.existsSync(devicePath)) return;

      const deviceCode = fs.readFileSync(devicePath, 'utf8');
      this.stats.driversChecked++;

      // Check for triggerFlow calls
      const triggerMatches = deviceCode.match(/triggerFlow\(['"]([^'"]+)['"]/g);
      
      if (triggerMatches) {
        triggerMatches.forEach(match => {
          const flowId = match.match(/['"]([^'"]+)['"]/)[1];
          
          // Check if this flow exists
          const appJson = JSON.parse(fs.readFileSync(this.appJsonPath, 'utf8'));
          const flowExists = appJson.flow?.triggers?.some(t => t.id === flowId);

          if (!flowExists) {
            this.issues.push({
              type: 'TRIGGER_CALL_NOT_FOUND',
              driver: driver.name,
              flowId: flowId,
              message: `device.js calls triggerFlow('${flowId}') but flow doesn't exist`,
              severity: 'critical'
            });
          }
        });
      }
    });
  }

  /**
   * Check button flow patterns
   */
  checkButtonFlowPatterns() {
    this.log('\n🔍 Checking Button Flow Patterns...', 'info');

    const appJson = JSON.parse(fs.readFileSync(this.appJsonPath, 'utf8'));
    const triggers = appJson.flow?.triggers || [];

    // Button patterns should be consistent
    const buttonTriggers = triggers.filter(t => t.id.includes('button_wireless'));

    const patterns = {
      generic: [], // button_wireless_X_button_pressed
      specific: [] // button_wireless_X_button_N_pressed
    };

    buttonTriggers.forEach(t => {
      if (t.id.match(/_button_\d+_pressed$/)) {
        patterns.specific.push(t.id);
      } else if (t.id.match(/_button_pressed$/)) {
        patterns.generic.push(t.id);
      }
    });

    // Check consistency
    const buttonDrivers = ['button_wireless_1', 'button_wireless_2', 'button_wireless_3', 
                          'button_wireless_4', 'button_wireless_6', 'button_wireless_8'];

    buttonDrivers.forEach(driver => {
      const hasGeneric = patterns.generic.some(id => id === `${driver}_button_pressed`);
      
      if (!hasGeneric) {
        this.warnings.push({
          type: 'MISSING_GENERIC_BUTTON',
          driver: driver,
          message: `Missing generic button_pressed trigger for ${driver}`,
          severity: 'medium'
        });
      }
    });
  }

  /**
   * Generate report
   */
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      stats: this.stats,
      issues: this.issues,
      warnings: this.warnings,
      summary: {
        totalIssues: this.issues.length,
        criticalIssues: this.issues.filter(i => i.severity === 'critical').length,
        highIssues: this.issues.filter(i => i.severity === 'high').length,
        totalWarnings: this.warnings.length
      }
    };

    const reportPath = path.join(this.rootPath, 'reports', 'FLOW_COHERENCE_REPORT.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

    return report;
  }

  /**
   * Display results
   */
  displayResults(report) {
    this.log('\n' + '='.repeat(80), 'info');
    this.log('📊 FLOW COHERENCE ANALYSIS - RESULTS', 'info');
    this.log('='.repeat(80) + '\n', 'info');

    // Stats
    this.log('📈 Statistics:', 'info');
    console.log(`   Triggers (flow/): ${this.stats.triggersInFlow}`);
    console.log(`   Triggers (app.json): ${this.stats.triggersInAppJson}`);
    console.log(`   Actions (flow/): ${this.stats.actionsInFlow}`);
    console.log(`   Actions (app.json): ${this.stats.actionsInAppJson}`);
    console.log(`   Conditions (flow/): ${this.stats.conditionsInFlow}`);
    console.log(`   Conditions (app.json): ${this.stats.conditionsInAppJson}`);
    console.log(`   Drivers checked: ${this.stats.driversChecked}`);

    // Issues
    if (report.summary.criticalIssues > 0) {
      this.log(`\n❌ CRITICAL ISSUES (${report.summary.criticalIssues}):`, 'error');
      this.issues.filter(i => i.severity === 'critical').slice(0, 10).forEach((issue, idx) => {
        console.log(`\n${idx + 1}. ${issue.type}`);
        console.log(`   Flow ID: ${issue.flowId || issue.driver}`);
        console.log(`   Message: ${issue.message}`);
      });
    }

    if (report.summary.highIssues > 0) {
      this.log(`\n⚠️  HIGH PRIORITY ISSUES (${report.summary.highIssues}):`, 'warning');
      this.issues.filter(i => i.severity === 'high').slice(0, 5).forEach((issue, idx) => {
        console.log(`\n${idx + 1}. ${issue.type}`);
        console.log(`   Flow ID: ${issue.flowId}`);
        console.log(`   Message: ${issue.message}`);
      });
    }

    // Warnings
    if (this.warnings.length > 0) {
      this.log(`\n⚠️  WARNINGS (${this.warnings.length}):`, 'warning');
      this.warnings.slice(0, 10).forEach((warn, idx) => {
        console.log(`${idx + 1}. ${warn.type}: ${warn.flowId || warn.driver} - ${warn.message}`);
      });
      if (this.warnings.length > 10) {
        console.log(`... and ${this.warnings.length - 10} more warnings`);
      }
    }

    // Summary
    this.log('\n' + '='.repeat(80), 'info');
    this.log('📄 Report saved: reports/FLOW_COHERENCE_REPORT.json', 'info');
    this.log('='.repeat(80) + '\n', 'info');

    if (report.summary.criticalIssues === 0 && report.summary.highIssues === 0) {
      this.log('✅ NO CRITICAL ISSUES FOUND', 'success');
    } else {
      this.log(`❌ FOUND ${report.summary.criticalIssues + report.summary.highIssues} ISSUES`, 'error');
    }
  }

  /**
   * Main execution
   */
  async run() {
    this.log('\n🔍 FLOW COHERENCE ANALYZER - Starting...', 'info');
    this.log('='.repeat(80) + '\n', 'info');

    // Load flows
    const flows = this.loadFlows();
    const appFlows = this.loadAppJsonFlows();

    // Analyze
    this.analyzeTriggers(flows.triggers, appFlows.triggers || []);
    this.analyzeDeviceTriggers();
    this.checkButtonFlowPatterns();

    // Generate report
    const report = this.generateReport();

    // Display
    this.displayResults(report);
  }
}

// Run
if (require.main === module) {
  const analyzer = new FlowCoherenceAnalyzer();
  analyzer.run().catch(console.error);
}

module.exports = FlowCoherenceAnalyzer;
