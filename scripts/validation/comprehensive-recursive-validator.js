#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  COMPREHENSIVE RECURSIVE VALIDATOR v1.0                                      ║
 * ║  Verifies JS Syntax, SDK3 Compliance, Energy Management, & Battery Status    ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const LIB_DIR = path.join(ROOT, 'lib');

const report = {
  timestamp: new Date().toISOString(),
  totalDrivers: 0,
  passedDrivers: 0,
  failedDrivers: 0,
  checksRun: 0,
  criticalErrors: [],
  warnings: [],
};

// ANSI Color helper functions
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function printHeader() {
  console.log(`${colors.cyan}${colors.bold}═══════════════════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}              UNIVERSAL TUYA COMPREHENSIVE RECURSIVE VALIDATOR             ${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}═══════════════════════════════════════════════════════════════════════════${colors.reset}\n`);
}

function findDirectories(baseDir) {
  if (!fs.existsSync(baseDir)) return [];
  return fs.readdirSync(baseDir)
    .filter(name => fs.statSync(path.join(baseDir, name)).isDirectory());
}

function validateFileSyntax(filePath) {
  report.checksRun++;
  try {
    const code = fs.readFileSync(filePath, 'utf8');
    // Compile using Node's vm module to ensure absolute syntax validity without execution
    new vm.Script(code, { filename: filePath });
    return { valid: true };
  } catch (err) {
    return {
      valid: false,
      message: err.message,
      line: err.stack ? err.stack.split('\n')[0] : 'Unknown',
    };
  }
}

function runValidation() {
  const drivers = findDirectories(DRIVERS_DIR);
  report.totalDrivers = drivers.length;

  for (const driverName of drivers) {
    const driverPath = path.join(DRIVERS_DIR, driverName);
    const composePath = path.join(driverPath, 'driver.compose.json');
    const deviceJsPath = path.join(driverPath, 'device.js');
    const driverJsPath = path.join(driverPath, 'driver.js');

    let driverHasError = false;
    const driverIssues = [];

    // 1. Verify existence & syntax of device.js
    if (!fs.existsSync(deviceJsPath)) {
      driverIssues.push({ level: 'error', rule: 'device-missing', message: 'Missing device.js file' });
      driverHasError = true;
    } else {
      const syntaxCheck = validateFileSyntax(deviceJsPath);
      if (!syntaxCheck.valid) {
        driverIssues.push({ level: 'error', rule: 'js-syntax', message: `Syntax error in device.js: ${syntaxCheck.message}` });
        driverHasError = true;
      } else {
        // SDK3 Static checks inside device.js
        const code = fs.readFileSync(deviceJsPath, 'utf8');
        if (/\bManagerDrivers\b/.test(code)) {
          driverIssues.push({ level: 'error', rule: 'deprecated-manager-drivers', message: 'Uses deprecated ManagerDrivers global' });
          driverHasError = true;
        }
        if (/this\.homey\.zigbee\.getDevice/.test(code)) {
          driverIssues.push({ level: 'error', rule: 'deprecated-get-device', message: 'Uses deprecated v2 API this.homey.zigbee.getDevice' });
          driverHasError = true;
        }
        if (/\.getDeviceConditionCard\s*\(/.test(code) || /\.getDeviceActionCard\s*\(/.test(code)) {
          driverIssues.push({ level: 'error', rule: 'phantom-flow-methods', message: 'Uses phantom flow card methods (getDeviceConditionCard / getDeviceActionCard)' });
          driverHasError = true;
        }
        
        // v5.13.7: Deprecation Guard for Crash Prevention
        if (code.includes("require('../../lib/tuya/BatteryMixin')") || code.includes("require('../../lib/mixins/BatteryMixin')") || code.includes('BatteryMixin(')) {
          driverIssues.push({ level: 'error', rule: 'deprecated-battery-mixin', message: 'Uses DEPRECATED BatteryMixin (Causes MODULE_NOT_FOUND). Use UnifiedBatteryHandler or BaseUnifiedDevice.' });
          driverHasError = true;
        }
        if (code.includes('extends TuyaZigbeeDevice') && (code.includes('sendTuyaCommand') || code.includes('_tuyaEF00Manager'))) {
          driverIssues.push({ level: 'error', rule: 'invalid-device-extension', message: 'Extends TuyaZigbeeDevice but uses DP commands. Must extend BaseUnifiedDevice or TuyaSpecificClusterDevice.' });
          driverHasError = true;
        }
      }
    }

    // 2. Verify syntax of driver.js if exists
    if (fs.existsSync(driverJsPath)) {
      const syntaxCheck = validateFileSyntax(driverJsPath);
      if (!syntaxCheck.valid) {
        driverIssues.push({ level: 'error', rule: 'js-syntax', message: `Syntax error in driver.js: ${syntaxCheck.message}` });
        driverHasError = true;
      }
    }

    // 3. Verify driver.compose.json content and rules
    if (!fs.existsSync(composePath)) {
      driverIssues.push({ level: 'error', rule: 'compose-missing', message: 'Missing driver.compose.json' });
      driverHasError = true;
    } else {
      try {
        const composeRaw = fs.readFileSync(composePath, 'utf8');
        const compose = JSON.parse(composeRaw);
        report.checksRun++;

        const capabilities = compose.capabilities || [];

        // Dual Battery Capability Verification (Adaptive battery paradigm)
        const hasMeasureBattery = capabilities.includes('measure_battery');
        const hasAlarmBattery = capabilities.includes('alarm_battery');
        if (hasMeasureBattery || hasAlarmBattery) {
          if (!hasMeasureBattery || !hasAlarmBattery) {
            driverIssues.push({
              level: 'warning',
              rule: 'dual-battery-mismatch',
              message: 'Adaptive Power Paradigm warning: Declare BOTH measure_battery and alarm_battery statically for dynamic runtime pruning.',
            });
          }
        }

        // Energy Management & Approximation Conflicts
        const hasEnergyApproximation = compose.energy && compose.energy.approximation;
        const hasMeasurePower = capabilities.includes('measure_power');
        const hasMeterPower = capabilities.includes('meter_power');

        if (hasEnergyApproximation && (hasMeasurePower || hasMeterPower)) {
          driverIssues.push({
            level: 'error',
            rule: 'energy-approximation-conflict',
            message: 'Manifest contains BOTH real electrical measurement capabilities and energy.approximation. This is a severe Homey Energy v3 schema conflict.',
          });
          driverHasError = true;
        }

        // Verify valid structure for Energy Approximation if defined
        if (hasEnergyApproximation) {
          const approx = compose.energy.approximation;
          if (approx.usageOn === undefined && approx.usageConstant === undefined) {
            driverIssues.push({
              level: 'error',
              rule: 'invalid-energy-approximation',
              message: 'Energy approximation declared but missing both usageOn and usageConstant keys.',
            });
            driverHasError = true;
          }
        }

        // Fingerprint case robustness check
        const manufacturerNames = compose.zigbee?.manufacturerName || [];
        const missingVariants = [];
        for (const mfr of manufacturerNames) {
          if (typeof mfr === 'string') {
            const lower = mfr.toLowerCase();
            const upper = mfr.toUpperCase();
            if (!manufacturerNames.includes(lower) || !manufacturerNames.includes(upper)) {
              missingVariants.push(mfr);
            }
          }
        }
        if (missingVariants.length > 0) {
          driverIssues.push({
            level: 'warning',
            rule: 'fingerprint-casing-warning',
            message: `Fingerprint casing warning: Recommended to declare lowercase and uppercase variant permutations of "${missingVariants[0]}".`,
          });
        }

      } catch (err) {
        driverIssues.push({ level: 'error', rule: 'compose-invalid-json', message: `Invalid JSON in driver.compose.json: ${err.message}` });
        driverHasError = true;
      }
    }

    // Process results for this driver
    if (driverHasError) {
      report.failedDrivers++;
      console.log(`  ❌ Driver [${colors.red}${driverName}${colors.reset}]:`);
      for (const issue of driverIssues) {
        if (issue.level === 'error') {
          console.log(`     └─ ${colors.red}[ERROR]${colors.reset} ${issue.message}`);
          report.criticalErrors.push({ driver: driverName, rule: issue.rule, message: issue.message });
        } else {
          console.log(`     └─ ${colors.yellow}[WARN]${colors.reset} ${issue.message}`);
          report.warnings.push({ driver: driverName, rule: issue.rule, message: issue.message });
        }
      }
    } else if (driverIssues.length > 0) {
      report.passedDrivers++;
      console.log(`  ⚠️  Driver [${colors.yellow}${driverName}${colors.reset}]:`);
      for (const issue of driverIssues) {
        console.log(`     └─ ${colors.yellow}[WARN]${colors.reset} ${issue.message}`);
        report.warnings.push({ driver: driverName, rule: issue.rule, message: issue.message });
      }
    } else {
      report.passedDrivers++;
      if (process.env.VERBOSE === 'true') {
        console.log(`  ✅ Driver [${colors.green}${driverName}${colors.reset}] passes all compliance audits.`);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RECURSIVE GENERAL APP SYNTAX VERIFICATION
  // ═══════════════════════════════════════════════════════════════════════════
  const rootFiles = ['app.js', 'package.json', 'app.json'];
  for (const rf of rootFiles) {
    const fullRf = path.join(ROOT, rf);
    if (fs.existsSync(fullRf)) {
      if (rf.endsWith('.js')) {
        const syntaxCheck = validateFileSyntax(fullRf);
        if (!syntaxCheck.valid) {
          console.log(`  ❌ Root File [${colors.red}${rf}${colors.reset}]: Syntax Error: ${syntaxCheck.message}`);
          report.criticalErrors.push({ file: rf, rule: 'root-js-syntax', message: syntaxCheck.message });
        }
      } else if (rf.endsWith('.json')) {
        try {
          JSON.parse(fs.readFileSync(fullRf, 'utf8'));
          report.checksRun++;
        } catch (err) {
          console.log(`  ❌ Root File [${colors.red}${rf}${colors.reset}]: Invalid JSON: ${err.message}`);
          report.criticalErrors.push({ file: rf, rule: 'root-json-syntax', message: err.message });
        }
      }
    }
  }

  // Final Output Reporting
  console.log(`\n${colors.cyan}${colors.bold}═══════════════════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`  VALIDATION SUMMARY`);
  console.log(`${colors.cyan}${colors.bold}═══════════════════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`  Total Drivers Checked  : ${report.totalDrivers}`);
  console.log(`  Passed Drivers         : ${colors.green}${report.passedDrivers}${colors.reset}`);
  console.log(`  Failed Drivers         : ${report.failedDrivers > 0 ? colors.red : colors.green}${report.failedDrivers}${colors.reset}`);
  console.log(`  Total Checks Executed  : ${report.checksRun}`);
  console.log(`  Critical Errors Found  : ${report.criticalErrors.length > 0 ? colors.red : colors.green}${report.criticalErrors.length}${colors.reset}`);
  console.log(`  Warnings Logged        : ${colors.yellow}${report.warnings.length}${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}═══════════════════════════════════════════════════════════════════════════${colors.reset}\n`);

  if (report.criticalErrors.length > 0) {
    console.log(`${colors.red}${colors.bold}  ❌ Validation Failed. Resolve critical errors before publishing to Homey Pro App Store.${colors.reset}\n`);
    process.exit(1);
  } else {
    console.log(`${colors.green}${colors.bold}  🎉 Complete SDK3 and Zigbee Compliance Audit passed successfully.${colors.reset}\n`);
    process.exit(0);
  }
}

printHeader();
runValidation();
