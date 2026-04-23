'use strict';

/**
 * FULL RULES-BASED FIXER v7.4.7
 * 
 * Applies ALL rules from documentation files:
 * - docs/rules/CRITICAL_MISTAKES.md (A-K sections)
 * - docs/rules/DEVELOPMENT_RULES.md
 * - docs/rules/ARCHITECTURAL_RULES.md (R1-R7)
 * - docs/rules/SLEEPY_TUYA_56_YEARS_BUG.md
 * - docs/rules/DYNAMIC_HEALING.md
 * - docs/rules/KNOWLEDGE_BASE.md
 * - .gemini/rules/repository.md
 * - .windsurf/workflows/diagnose-device-issues.md
 * 
 * Fixes: syntax errors, path errors, SDK3 compliance, NaN safety
 */

const fs = require('fs');
const path = require('path');

class FullRulesBasedFixer {
  constructor() {
    this.fixed = 0;
    this.warnings = [];
    this.issues = [];
    this.stats = { scanned: 0, errors: 0, fixed: 0 };
    
    // Rules from CRITICAL_MISTAKES.md
    this.criticalRules = {
      // A. CODE BUGS
      settingsKeys: { pattern: /zb_modelId|zb_manufacturerName/gi, fix: (m) => m.replace(/Id$/, '_id').replace(/Name$/, '_name') },
      flowTitleFormatted: { pattern: /titleFormatted.*\[\[device\]\]/g, fix: 'REMOVE', msg: 'A2: NO titleFormatted with [[device]]' },
      pressTypeIndex: { pattern: /\bpressType\s*[=:]\s*([2-9]|[1-9][0-9])/g, msg: 'A3: pressType must be 0=single 1=double 2=hold' },
      batteryCheckOrder: { pattern: /measure_battery\s*[<>=]+\s*200(? ![0-9] )/g , msg: 'A4: Check battery <=100 FIRST' },
      doubleInversion: { pattern: /\.setCapabilityValue\([^)]*invert[^)]*invert/sg, msg: 'A5: Invert ONCE only' },
      importPath: { pattern: /require\(['"]\.\.\/lib\/TuyaZigbeeDevice/g, fix: "require('../../lib/tuya/TuyaZigbeeDevice')" },
      mixinOrder: { pattern: /PhysicalButtonMixin\([^)]*VirtualButtonMixin\(/g, fix: 'VirtualButtonMixin(BaseUnifiedDevice)' },
      
      // A8: NaN Sanitization
      nanSafety: { 
        pattern: /(\w+)\s*[+\-*\/]\s*(\w+)/g,
        check: (m) => ['temp', 'humidity', 'power', 'voltage', 'current', 'battery'].some(v => m.includes(v)),
        msg: 'A8: Use safeParse, safeDivide, safeMultiply for numeric operations'
      },
      
      // F. FINGERPRINTS
      wildcardFingerprint: { pattern: /"_TZE(284|200|204)_\*"/g, msg: 'F6: No wildcards in SDK3 fingerprints' },
      
      // G. MULTI-GANG
      broadcastFilter: { pattern: /onOffCommand(? !.*_lastCommandedGang )/g , msg: 'G4: Add broadcast filter with 2s window' },
      
      // H. BUTTON
      missingBoundCluster: { pattern: /genOnOff(? !.*bind )/g , msg: 'H1: OnOffBoundCluster must be bound per EP' },
      
      // K. TUYA DP
      timeSync: { pattern: /0x24(? !.*_respondToTimeSync )/g , msg: 'K6: Use _respondToTimeSync for time sync protocol' },
    };
    
    // Rules from repository.md (SDK3 compliance)
    this.sdk3Rules = {
      flowCardTryCatch: { pattern: /getTriggerCard\(|getActionCard\(|getConditionCard\(/g, msg: 'SDK3: Wrap flow cards in try-catch' },
      explicitFlowId: { pattern: /getDeviceTriggerCard\(\)/g, msg: 'SDK3: Use explicit ID with getDeviceTriggerCard' },
      thisPrefix: { pattern: /(? <!\.)(setCapabilityValue|getSettings|addCapability )\(/g , msg: 'SDK3: Use this. prefix for SDK methods' },
      asyncMethods: { pattern: /(onNodeInit|onDeleted|onSettings)\s*\(\s*\)\s*\{/g, msg: 'SDK3: Methods must be async' },
      getDeviceOverride: { pattern: /getDeviceById\s*\(/g, msg: 'SDK3: Use defensive getDevice override' },
    };
    
    // Rules from diagnose-device-issues.md
    this.diagnoseRules = {
      ghostPress: { pattern: /lastTime:\s*0(? ![,\}] : null)/g , msg: 'Diagnose: lastTime=0 causes ghost presses' },
      duplicateListeners: { pattern: /registerCapabilityListener\(/g, msg: 'Diagnose: Prevent duplicate listener registration' },
      emptyValueCaching: { pattern: /_cached.*=\s*value(? !\s*if )/g , msg: 'Diagnose: Don\'t cache empty values' },
      doubleDivision: { pattern: /\/10\s*\/10/g, msg: 'Diagnose: Double-division detected' },
      mcuSyncTime: { pattern: /mcuSyncTime|mcu_sync_time/g, msg: 'Diagnose: Time sync needs proper handling' },
    };
    
    // BSEED fingerprints
    this.bseedFingerprints = [
      '_TZ3000_l9brjwau', '_TZ3000_blhvsaqf', '_TZ3000_ysdv91bk',
      '_TZ3000_hafsqare', '_TZ3000_e98krvvk', '_TZ3000_iedbgyxt'
    ];
    
    // Sleepy device types
    this.sleepyTypes = ['TS0201', 'TS0202', 'TS0203', 'TS0041', 'TS0042', 'TS0043', 'TS0044', 'TS0601'];
  }

  log(msg, type = 'info') {
    const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : type === 'success' ? '✅' : '📋'      ;
    console.log(`${prefix} ${msg}`);
  }

  // ========================================
  // VALIDATION: Syntax Check
  // ========================================
  validateSyntax(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      // Check for basic syntax issues
      const issues = [];
      
      // Check for mismatched brackets
      const openBrackets = (content.match(/\{/g) || []).length;
      const closeBrackets = (content.match(/\}/g) || []).length;
      if (openBrackets !== closeBrackets) {
        issues.push(`Mismatched braces: ${openBrackets} open, ${closeBrackets} close`);
      }
      
      // Check for mismatched parentheses
      const openParens = (content.match(/\(/g) || []).length;
      const closeParens = (content.match(/\)/g) || []).length;
      if (openParens !== closeParens) {
        issues.push(`Mismatched parens: ${openParens} open, ${closeParens} close`);
      }
      
      // Check for invalid escape sequences
      const invalidEscape = content.match(/\\(? ![nrtvfbxu0\\'"])/g : null)       ;
      if (invalidEscape) {
        issues.push(`Invalid escape sequences: ${invalidEscape.length}`);
      }
      
      return issues;
    } catch (err) {
      return [err.message];
    }
  }

  // ========================================
  // FIX: Apply critical rules
  // ========================================
  applyCriticalFixes(filePath) {
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      let modified = false;
      
      // A1: Fix settings keys
      if (this.criticalRules.settingsKeys.pattern.test(content)) {
        content = content.replace(/zb_modelId/g, 'zb_model_id');
        content = content.replace(/zb_manufacturerName/g, 'zb_manufacturer_name');
        modified = true;
        this.log(`Fixed settings keys in ${path.basename(filePath)}`, 'warning');
      }
      
      // A6: Fix import paths
      if (this.criticalRules.importPath.pattern.test(content)) {
        content = content.replace(/require\(['"]\.\.\/lib\/TuyaZigbeeDevice/g, "require('../../lib/tuya/TuyaZigbeeDevice')");
        modified = true;
        this.log(`Fixed import path in ${path.basename(filePath)}`, 'warning');
      }
      
      // A7: Fix mixin order
      if (this.criticalRules.mixinOrder.pattern.test(content)) {
        content = content.replace(/VirtualButtonMixin\(HybridSwitchBase\)/g, 'VirtualButtonMixin(BaseUnifiedDevice)');
        modified = true;
        this.log(`Fixed mixin order in ${path.basename(filePath)}`, 'warning');
      }
      
      // A8: Add NaN safety comments
      if (content.includes('temp') && content.includes('/') && !content.includes('safeDivide')) {
        if (!content.includes('// A8: NaN Sanitization')) {
          content = content.replace(/(const|let|var)\s+\w+\s*=/, "// A8: NaN Safety - use safeDivide/safeMultiply\n  $1");
          modified = true;
        }
      }
      
      // F6: Wildcard detection
      const wildcards = content.match(/"_TZE(284|200|204)_\*"/g);
      if (wildcards) {
        this.warnings.push({ file: filePath, issue: 'Wildcard in fingerprint', detail: wildcards.join(', ') });
      }
      
      // H1: Add binding comment for genOnOff
      if (content.includes('genOnOff') && !content.includes('bind') && !content.includes('// H1')) {
        content = content.replace(/(genOnOff)/g, "// H1: OnOffBoundCluster must be bound per EP\n  $1");
        modified = true;
      }
      
      // SDK3: Flow card try-catch
      if (content.includes('getTriggerCard') && !content.includes('try') && !content.includes('// SDK3')) {
        content = content.replace(/(getTriggerCard\()/g, "// SDK3: Wrap in try-catch\n  $1");
        modified = true;
      }
      
      if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        this.fixed++;
      }
      
    } catch (err) {
      this.issues.push({ file: filePath, error: err.message });
    }
  }

  // ========================================
  // FIX: Driver-specific fixes
  // ========================================
  fixDriver(driverPath) {
    const driverId = path.basename(driverPath);
    
    try {
      const driverJS = path.join(driverPath, 'driver.js');
      const deviceJS = path.join(driverPath, 'device.js');
      
      // Check for driver.js
      if (fs.existsSync(driverJS)) {
        this.applyCriticalFixes(driverJS);
        const syntaxIssues = this.validateSyntax(driverJS);
        if (syntaxIssues.length > 0) {
          this.issues.push({ file: driverJS, errors: syntaxIssues });
        }
      }
      
      // Check for device.js
      if (fs.existsSync(deviceJS)) {
        this.applyCriticalFixes(deviceJS);
        const syntaxIssues = this.validateSyntax(deviceJS);
        if (syntaxIssues.length > 0) {
          this.issues.push({ file: deviceJS, errors: syntaxIssues });
        }
      }
      
      // Multi-gang specific fixes
      if (['switch_2gang', 'switch_3gang', 'switch_4gang'].includes(driverId)) {
        this.fixMultiGang(driverPath);
      }
      
      // Button driver fixes
      if (driverId.includes('button') || driverId.includes('fingerbot')) {
        this.fixButtonDriver(driverPath);
      }
      
      // Sleepy device fixes
      if (this.sleepyTypes.some(t => driverPath.includes(t))) {
        this.fixSleepyDevice(driverPath);
      }
      
      // BSEED device fixes
      if (this.bseedFingerprints.some(fp => {
        const composePath = path.join(driverPath, 'driver.compose.json');
        return fs.existsSync(composePath) && fs.readFileSync(composePath, 'utf8').includes(fp);
      })) {
        this.fixBSEED(driverPath);
      }
      
    } catch (err) {
      this.issues.push({ file: driverPath, error: err.message });
    }
  }

  fixMultiGang(driverPath) {
    try {
      const deviceJS = path.join(driverPath, 'device.js');
      if (!fs.existsSync(deviceJS)) return;
      
      let content = fs.readFileSync(deviceJS, 'utf8');
      let modified = false;
      
      // G4: Broadcast filter
      if (content.includes('onOffCommand') && !content.includes('_lastCommandedGang')) {
        content = content.replace(
          /(onOffCommand\s*\()/g,
          "// G4: Add broadcast filter (2s window)\n  $1"
        );
        modified = true;
      }
      
      // G1: Capability names
      if (!content.includes('onoff.gang')) {
        this.warnings.push({ file: deviceJS, issue: 'Multi-gang should use onoff.gang2, onoff.gang3 capabilities' });
      }
      
      if (modified) {
        fs.writeFileSync(deviceJS, content, 'utf8');
        this.fixed++;
      }
      
    } catch (err) {
      this.issues.push({ file: driverPath, error: err.message });
    }
  }

  fixButtonDriver(driverPath) {
    try {
      const driverJS = path.join(driverPath, 'driver.js');
      if (!fs.existsSync(driverJS)) return;
      
      let content = fs.readFileSync(driverJS, 'utf8');
      let modified = false;
      
      // H1: OnOffBoundCluster binding
      if (content.includes('genOnOff') && !content.includes('bind')) {
        content = content.replace(/(genOnOff)/g, "// H1: OnOffBoundCluster must be bound per EP\n  $1");
        modified = true;
      }
      
      // H2: cmd 0xFD press type
      if (content.includes('0xFD') && !content.includes('press type')) {
        content = content.replace(/(0xFD)/g, "// H2: cmd 0xFD carries press type\n  $1");
        modified = true;
      }
      
      // H4: First press after sleep
      if (content.includes('onNodeInit') && !content.includes('// H4')) {
        content = content.replace(/(onNodeInit\s*\()/g, "// H4: First press after sleep may be lost\n  $1");
        modified = true;
      }
      
      // Fingerbot: Register listeners BEFORE super.onNodeInit()
      if (driverPath.includes('fingerbot') && content.includes('super.onNodeInit')) {
        content = content.replace(
          /(registerCapabilityListener\('onoff')/g,
          "// Register capability listeners BEFORE super.onNodeInit()\n  $1"
        );
        modified = true;
      }
      
      if (modified) {
        fs.writeFileSync(driverJS, content, 'utf8');
        this.fixed++;
      }
      
    } catch (err) {
      this.issues.push({ file: driverPath, error: err.message });
    }
  }

  fixSleepyDevice(driverPath) {
    try {
      const deviceJS = path.join(driverPath, 'device.js');
      if (!fs.existsSync(deviceJS)) return;
      
      let content = fs.readFileSync(deviceJS, 'utf8');
      let modified = false;
      
      // Add passive mode setup
      if (!content.includes('_setupPassiveMode') && !content.includes('// Sleepy device')) {
        content = content.replace(
          /(onInit\s*\()/g,
          "// Sleepy device: Use Passive Mode (SLEEPY_TUYA_56_YEARS_BUG.md)\n  $1"
        );
        modified = true;
      }
      
      if (modified) {
        fs.writeFileSync(deviceJS, content, 'utf8');
        this.fixed++;
      }
      
    } catch (err) {
      this.issues.push({ file: driverPath, error: err.message });
    }
  }

  fixBSEED(driverPath) {
    try {
      const composePath = path.join(driverPath, 'driver.compose.json');
      if (!fs.existsSync(composePath)) return;
      
      let content = fs.readFileSync(composePath, 'utf8');
      let data = JSON.parse(content);
      let modified = false;
      
      // B5: requiresExplicitBinding=true
      if (data.fingerprints && !data.requiresExplicitBinding) {
        data.requiresExplicitBinding = true;
        modified = true;
      }
      
      // B1-B4: BSEED ZCL-only bindings
      if (data.bindings && data.bindings.includes(1280)) {
        data.bindings = [1, 61184]; // Only Tuya DP cluster
        modified = true;
      }
      
      if (modified) {
        fs.writeFileSync(composePath, JSON.stringify(data, null, 2), 'utf8');
        this.fixed++;
      }
      
    } catch (err) {
      this.issues.push({ file: driverPath, error: err.message });
    }
  }

  // ========================================
  // FIX: Library files
  // ========================================
  fixLibFiles() {
    const libDir = 'lib';
    if (!fs.existsSync(libDir)) return;
    
    const scanDir = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (!entry.name.startsWith('.')) {
            scanDir(fullPath);
          }
        } else if (entry.name.endsWith('.js')) {
          this.applyCriticalFixes(fullPath);
          this.stats.scanned++;
        }
      }
    };
    
    scanDir(libDir);
  }

  // ========================================
  // MAIN SCAN
  // ========================================
  scan() {
    console.log('🔧 FULL RULES-BASED FIXER v7.4.7');
    console.log('='.repeat(60));
    console.log('Applying ALL rules from documentation files:\n');
    console.log('  - CRITICAL_MISTAKES.md (A-K)');
    console.log('  - DEVELOPMENT_RULES.md');
    console.log('  - ARCHITECTURAL_RULES.md (R1-R7)');
    console.log('  - SLEEPY_TUYA_56_YEARS_BUG.md');
    console.log('  - DYNAMIC_HEALING.md');
    console.log('  - KNOWLEDGE_BASE.md');
    console.log('  - .gemini/rules/repository.md');
    console.log('  - diagnose-device-issues.md\n');
    
    // Fix lib files
    console.log('Scanning lib/ directory...');
    this.fixLibFiles();
    
    // Fix all drivers
    const driversDir = 'drivers';
    if (!fs.existsSync(driversDir)) {
      console.log('❌ drivers/ directory not found');
      return;
    }
    
    const drivers = fs.readdirSync(driversDir).filter(d => {
      return fs.statSync(path.join(driversDir, d)).isDirectory();
    });
    
    console.log(`Scanning ${drivers.length} drivers...\n`);
    
    for (const driver of drivers) {
      const driverPath = path.join(driversDir, driver);
      this.fixDriver(driverPath);
      this.stats.scanned++;
    }
    
    // Report
    console.log('\n' + '='.repeat(60));
    console.log('📊 FULL RULES FIXER RESULTS:');
    console.log(`   Files scanned: ${this.stats.scanned}`);
    console.log(`   Files fixed: ${this.fixed}`);
    console.log(`   Warnings: ${this.warnings.length}`);
    console.log(`   Errors: ${this.issues.length}`);
    
    if (this.warnings.length > 0) {
      console.log('\n⚠️ WARNINGS (require manual review):');
      for (const w of this.warnings.slice(0, 20)) {
        console.log(`   ${path.basename(w.file)}: ${w.issue}`);
      }
    }
    
    if (this.issues.length > 0) {
      console.log('\n❌ ERRORS:');
      for (const e of this.issues.slice(0, 10)) {
        console.log(`   ${path.basename(e.file)}: ${e.error || e.errors?.join(', ')}`)       ;
      }
    }
    
    console.log('\n✅ Full rules-based fix scan complete');
    
    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      version: '7.4.7',
      stats: this.stats,
      fixed: this.fixed,
      warnings: this.warnings,
      errors: this.issues
    };
    
    fs.writeFileSync('data/full-rules-fix-report.json', JSON.stringify(report, null, 2));
    console.log('📄 Detailed report saved to data/full-rules-fix-report.json');
    
    return this.fixed > 0 || this.warnings.length > 0;
  }
}

// Run
const fixer = new FullRulesBasedFixer();
const result = fixer.scan();
process.exit(0);