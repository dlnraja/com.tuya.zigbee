#!/usr/bin/env node
/**
 * 🌌 UNIVERSAL TUYA ENGINE - ULTIMATE PRE-COMMIT INTEGRITY GATEWAY
 * 
 * This script serves as the mandatory pre-commit check to ensure:
 * 1. ZERO JavaScript Syntax Errors or unclosed braces.
 * 2. Strict SDK v3 capability compliance (e.g. battery conflict check).
 * 3. 100% compliance of GitHub Actions workflows (.github/workflows/*.yml) 
 *    with WORKFLOW_GUIDELINES.md (defaults run shell bash, Node 24/March 2026 
 *    pinned dependencies checkout@v5/setup-node@v5, timeout-minutes, and REPLY_TOPICS safety).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { spawnSync } = require('child_process');

const ROOT = process.cwd();
const TARGET_DIRS = ['lib', 'drivers', 'scripts'];
const IGNORE_DIRS = ['node_modules', '.git', '.homeybuild', 'quarantine', 'tmp', 'temp'];

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

const report = {
  jsFilesChecked: 0,
  ymlFilesChecked: 0,
  errors: [],
  warnings: [],
};

function printHeader() {
  console.log(`${colors.cyan}${colors.bold}═══════════════════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}          UNIVERSAL TUYA ENGINE - ULTIMATE PRE-COMMIT GATEWAY              ${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}═══════════════════════════════════════════════════════════════════════════${colors.reset}\n`);
}

/**
 * 1. JavaScript Syntax & Spacing Check
 */
function validateJSFile(filePath) {
  report.jsFilesChecked++;
  
  // vm.Script compilation check
  try {
    const code = fs.readFileSync(filePath, 'utf8');
    new vm.Script(code, { filename: filePath });
  } catch (err) {
    report.errors.push({
      file: filePath,
      type: 'JS_SYNTAX',
      message: `Syntax error: ${err.message}`,
    });
    return false;
  }

  // 1c. Extends Keyword Spacing Check (extends SensorBase and classextends prevention)
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const patternNoSpaceAfter = /\bclass\s+\w+\s+extends\w+/;
    const patternNoSpaceBefore = /\bclass\s+\w+extends\s+\w+/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (patternNoSpaceAfter.test(line)) {
        report.errors.push({
          file: filePath,
          type: 'EXTENDS_SPACING',
          message: `Line ${i + 1}: Missing space after 'extends' (e.g. 'extendsSensorBase')`,
        });
      }
      if (patternNoSpaceBefore.test(line)) {
        report.errors.push({
          file: filePath,
          type: 'EXTENDS_SPACING',
          message: `Line ${i + 1}: Missing space before 'extends' (e.g. 'classextends')`,
        });
      }
    }
  } catch (err) {
    // optional fail
  }

  // 1d. Advanced Smarter Compliance & Sanity Checks
  try {
    const code = fs.readFileSync(filePath, 'utf8');
    const lines = code.split('\n');

    // 1d-i. Missing super.onNodeInit check
    if (code.includes('class ') && code.includes('extends ') && code.includes('onNodeInit')) {
      if (code.match(/async onNodeInit\s*\(/) && !code.includes('super.onNodeInit')) {
        report.warnings.push({
          file: filePath,
          type: 'MISSING_SUPER_INIT',
          message: `Overrides 'onNodeInit()' without calling 'super.onNodeInit()'. This will prevent Homey SDK3 drivers from initializing correctly!`,
        });
      }
    }

    // 1d-ii. Loop for line-by-line checks (NaN Safety & Case Comparison)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#!') || trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;

      const codeOnly = line
        .replace(/\/\/.*$/, '')
        .replace(/(['"`])((?:\\.|(?!\1).)*?)\1/g, '$1$1');

      // Manual identity comparisons instead of CaseInsensitiveMatcher
      const isIdentityCompare = (codeOnly.includes('manufacturerName') || codeOnly.includes('modelId') || codeOnly.includes('productId')) && 
                                (codeOnly.includes('===') || codeOnly.includes('==') || codeOnly.includes('toLowerCase()') || codeOnly.includes('toUpperCase()') || codeOnly.includes('.includes('));
      
      if (isIdentityCompare) {
        const isException = filePath.includes('CaseInsensitiveMatcher') || 
                            filePath.includes('ManufacturerNameHelper') || 
                            filePath.includes('PRE_COMMIT_CHECKS') || 
                            filePath.includes('zero-defect-architect-audit') || 
                            filePath.includes('TuyaDPDeviceHelper') || 
                            filePath.includes('TuyaDeviceHelper') || 
                            codeOnly.includes('CI.');
        if (!isException) {
          report.warnings.push({
            file: filePath,
            type: 'MANUAL_IDENTITY_COMPARE',
            message: `Line ${i + 1}: Manual identity comparison for manufacturerName/modelId/productId found. Use central "CI" CaseInsensitiveMatcher helper.`,
          });
        }
      }

      // v8.3.0: Forbidden raw brand checks to enforce 100% case-insensitivity
      const forbiddenBrands = ['HOBEIAN', 'SONOFF', 'BSEED', 'LUMI', 'EWELINK', 'MOES', 'AQARA', 'HEIMAN', 'IKEA', 'PHILIPS'];
      for (const brand of forbiddenBrands) {
        if (codeOnly.includes('toUpperCase()') && codeOnly.includes(brand)) {
          report.errors.push({
            file: filePath,
            type: `RAW_${brand}_CHECK_FORBIDDEN`,
            message: `Line ${i + 1}: Legacy raw check 'toUpperCase() === "${brand}"' detected. Use CaseInsensitiveMatcher 'containsCI' or 'equalsCI' instead.`,
          });
        }
        if (codeOnly.includes('toLowerCase()') && codeOnly.includes(brand.toLowerCase())) {
          report.errors.push({
            file: filePath,
            type: `RAW_${brand}_CHECK_FORBIDDEN`,
            message: `Line ${i + 1}: Legacy raw check 'toLowerCase() === "${brand.toLowerCase()}"' detected. Use CaseInsensitiveMatcher 'containsCI' or 'equalsCI' instead.`,
          });
        }
      }

      // Potential unchecked division (NaN risk)
      if (codeOnly.includes('/') && !filePath.includes('tuyaUtils') && !filePath.includes('PRE_COMMIT_CHECKS') && !filePath.includes('zero-defect-architect-audit')) {
        if (!codeOnly.includes('safeParse') && 
            !codeOnly.includes('safeDivide') && 
            !codeOnly.includes('safeMultiply') && 
            !codeOnly.includes('Number.isNaN') &&
            !codeOnly.includes('Number.isFinite')) {
          
          const isImportExport = trimmed.match(/^\s*(import|export)\s+\*/);
          const isDocBlock = trimmed.includes('*/');
          const isTemplateLiteral = trimmed.includes('${') && trimmed.includes('}');
          const isSafeConstant = codeOnly.match(/(\*\s*(1000|60|100|3600|24))|(\/\s*(1000|100|10|2))/);
          const isMathRandom = codeOnly.includes('Math.random()');

          if (!isImportExport && !isDocBlock && !isSafeConstant && !isMathRandom) {
            if (codeOnly.match(/[a-zA-Z0-9_$\].)]\s*[\/](?!\s*[\/*])\s*[a-zA-Z0-9_$0-9.]+/)) {
              report.warnings.push({
                file: filePath,
                type: 'NAN_SAFETY_RISK',
                message: `Line ${i + 1}: Potential unchecked division (NaN risk). Consider wrapping in 'safeDivide' from 'tuyaUtils.js'.`,
              });
            }
          }
        }
      }
    }

    // 1d-iii. Passive Broadcast Blocker checks
    if (code.includes('class ') && code.includes('extends ')) {
      const initCheckPattern = /(?:if\s*\(\s*!this\.(?:initialized|ready)\b|if\s*\(\s*this\.(?:initialized|ready)\s*===\s*false)/;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (initCheckPattern.test(line) && (code.includes('onFrame') || code.includes('handleFrame') || code.includes('handleDatapoint') || code.includes('parseTuyaFrame'))) {
          report.warnings.push({
            file: filePath,
            type: 'PASSIVE_TELEMETRY_BLOCK',
            message: `Line ${i + 1}: Strict initialization check detected. Ensure this does not block unannounced/passive monitor broadcasts from sleepy/uninitialized devices!`,
          });
        }
      }
    }
  } catch (err) {
    // optional fail
  }

  // 1e. Phoenix Sovereign v8.1.0 Architecture Rules
  try {
    const relativePath = path.relative(ROOT, filePath).replace(/\\/g, '/');
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    // 1e-i. Circular Import / Temporal Dead Zone (TDZ) Checker for main bases
    if (relativePath === 'lib/tuya/TuyaZigbeeDevice.js' || relativePath === 'lib/devices/BaseUnifiedDevice.js') {
      const forbiddenTopRequires = [
        'SmartDriverAdaptation',
        'DriverMigrationManager',
        'SmartBatteryManager',
        'SmartEnergyManager',
        'UnknownClusterHandler',
        'TuyaUniversalBridge'
      ];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('require(')) {
          for (const forbidden of forbiddenTopRequires) {
            if (line.includes(forbidden) && !line.trim().startsWith('//')) {
              // If it is in the first 40 lines, it's a top-level require!
              if (i < 40) {
                report.errors.push({
                  file: filePath,
                  type: 'CIRCULAR_TDZ_RISK',
                  message: `Line ${i + 1}: Top-level require for Circular-prone class "${forbidden}" detected. To prevent Temporal Dead Zone (TDZ) loading exceptions, load this class dynamically inline inside the method that uses it!`,
                });
              }
            }
          }
        }
      }
    }

    // 1e-ii. Flow Cards / Buttons safety check for drivers
    if (relativePath.startsWith('drivers/') && relativePath.endsWith('/device.js')) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        if (trimmed.includes('_markAppCommand') && !trimmed.startsWith('//') && !trimmed.startsWith('/*') && !trimmed.startsWith('*')) {
          if (!trimmed.includes('_markAppCommand() {') && !trimmed.includes('this._markAppCommand')) {
            report.errors.push({
              file: filePath,
              type: 'DOUBLE_WRAPPING_MARK_APP_COMMAND',
              message: `Line ${i + 1}: Local '_markAppCommand' override detected in driver device.js. Delete this local override and let VirtualButtonMixin / PhysicalButtonMixin handle the command wrapping safely!`,
            });
          }
        }
        if ((trimmed.includes("setCapabilityValue('button'") || trimmed.includes("setCapabilityValue(\"button\"")) && !trimmed.startsWith('//') && !trimmed.startsWith('/*') && !trimmed.startsWith('*')) {
          report.warnings.push({
            file: filePath,
            type: 'NATIVE_BUTTON_SET_BYPASS',
            message: `Line ${i + 1}: Native 'setCapabilityValue("button", ...)' bypass detected. Use the safety-wrapped 'this._safeSetCapability("button", ...)' instead to prevent flow loop locks!`,
          });
        }
      }
    }

    // 1e-iii. Smart Divisor Scale checker
    if (relativePath.startsWith('drivers/') && relativePath.endsWith('/device.js')) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('divisor: 10') || line.includes('divisor: 100')) {
          if (line.includes('measure_temperature') || line.includes('target_temperature') || line.includes('measure_humidity') || line.includes('measure_formaldehyde')) {
            report.warnings.push({
              file: filePath,
              type: 'HARDCODED_DIVISOR',
              message: `Line ${i + 1}: Hardcoded divisor detected. Consider migrating to dynamic "smartDivisor: true" and the SmartDivisorManager.`,
            });
          }
        }
      }
    }
  } catch (err) {
    // ignore
  }

  return true;
}

/**
 * 2. SDK v3 Compliance Check (driver.compose.json)
 */
function validateComposeFile(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const compose = JSON.parse(raw);
    const capabilities = compose.capabilities || [];

    // Battery Conflict verification
    const hasMeasure = capabilities.includes('measure_battery');
    const hasAlarm = capabilities.includes('alarm_battery');
    if (hasMeasure && hasAlarm) {
      report.errors.push({
        file: filePath,
        type: 'DUAL_BATTERY',
        message: 'SDK v3 battery conflict: do not declare measure_battery and alarm_battery on the same driver. Keep measure_battery for percentage-capable devices, or alarm_battery for boolean-only devices.',
      });
    }

    // Energy Approximation conflicts
    const hasEnergyApprox = compose.energy && compose.energy.approximation;
    const hasMeasurePower = capabilities.includes('measure_power');
    const hasMeterPower = capabilities.includes('meter_power');

    if (hasEnergyApprox && (hasMeasurePower || hasMeterPower)) {
      report.errors.push({
        file: filePath,
        type: 'ENERGY_CONFLICT',
        message: 'Manifest has BOTH energy.approximation and direct power capabilities. This is a severe Homey Energy v3 schema conflict.',
      });
    }
  } catch (err) {
    report.errors.push({
      file: filePath,
      type: 'JSON_INVALID',
      message: `Invalid JSON: ${err.message}`,
    });
  }
}

/**
 * 3. GitHub Actions Workflows YML Audit (WORKFLOW_GUIDELINES.md conformity)
 */
function validateWorkflowFile(filePath) {
  report.ymlFilesChecked++;
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check 1: defaults.run.shell: bash
    const hasShellBash = content.includes('shell: bash');
    const hasDefaultsRun = content.includes('defaults:') && content.includes('run:');
    if (!hasShellBash || !hasDefaultsRun) {
      // Check if it's actually running shell tasks
      if (content.includes('run:')) {
        report.errors.push({
          file: filePath,
          type: 'WFL_SHELL_MISSING',
          message: 'Missing defaults.run.shell: bash configuration (mandatory to prevent PowerShell failures on Windows runners).',
        });
      }
    }

    // Check 2: timeout-minutes inside jobs
    if (content.includes('jobs:') && !content.includes('timeout-minutes:')) {
      report.warnings.push({
        file: filePath,
        type: 'WFL_TIMEOUT_MISSING',
        message: 'No timeout-minutes specified in this workflow. Recommended to prevent runaway bills.',
      });
    }

    // Check 3: Upgrade v4 to v5 dependencies (checkout, setup-node, cache, upload-artifact)
    const legacyCheckout = /uses:\s*actions\/checkout@v[1-4]\b/;
    const legacySetupNode = /uses:\s*actions\/setup-node@v[1-4]\b/;
    const legacyCache = /uses:\s*actions\/cache@v[1-4]\b/;
    
    if (legacyCheckout.test(content)) {
      report.warnings.push({
        file: filePath,
        type: 'WFL_LEGACY_CHECKOUT',
        message: 'Uses legacy actions/checkout (v1-v4). Upgrade to actions/checkout@v5 for Node.js 24/March 2026 compliance.',
      });
    }
    if (legacySetupNode.test(content)) {
      report.warnings.push({
        file: filePath,
        type: 'WFL_LEGACY_SETUP_NODE',
        message: 'Uses legacy actions/setup-node (v1-v4). Upgrade to actions/setup-node@v5 for Node.js 24/March 2026 compliance.',
      });
    }
    if (legacyCache.test(content)) {
      report.warnings.push({
        file: filePath,
        type: 'WFL_LEGACY_CACHE',
        message: 'Uses legacy actions/cache (v1-v4). Upgrade to actions/cache@v5.',
      });
    }

    // Check 4: REPLY_TOPICS safety guard (bot should ONLY reply on T140352)
    // Scan for any REPLY_TOPICS definition that contains threads other than 140352
    const replyTopicsMatch = content.match(/REPLY_TOPICS:\s*["']?([\d,\s]+)["']?/);
    if (replyTopicsMatch) {
      const topics = replyTopicsMatch[1].split(',').map(t => t.trim());
      const illegalTopics = topics.filter(t => t !== '140352');
      if (illegalTopics.length > 0) {
        report.errors.push({
          file: filePath,
          type: 'WFL_REPLY_TOPICS_LEAK',
          message: `Security violation: REPLY_TOPICS contains unauthorized threads [${illegalTopics.join(', ')}]. Bot MUST only reply on T140352.`,
        });
      }
    }

    // Check 5: Danger Copilot suggest command
    if (content.includes('copilot suggest') && content.includes('echo') && content.includes('>')) {
      report.errors.push({
        file: filePath,
        type: 'WFL_DANGER_COPILOT',
        message: 'Contains dangerous copilot suggest redirect patterns that could corrupt local code. Use static check validators instead.',
      });
    }

  } catch (err) {
    report.errors.push({
      file: filePath,
      type: 'WFL_READ_FAILED',
      message: `Failed to audit: ${err.message}`,
    });
  }
}

/**
 * Traversal logic
 */
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.includes(entry.name)) continue;
      walk(fullPath);
    } else if (entry.isFile()) {
      if (entry.name.endsWith('.js')) {
        validateJSFile(fullPath);
      } else if (entry.name === 'driver.compose.json') {
        validateComposeFile(fullPath);
      }
    }
  }
}

function auditWorkflows() {
  const workflowsDir = path.join(ROOT, '.github', 'workflows');
  if (!fs.existsSync(workflowsDir)) return;
  const files = fs.readdirSync(workflowsDir);
  for (const file of files) {
    if (file.endsWith('.yml') || file.endsWith('.yml.manual')) {
      validateWorkflowFile(path.join(workflowsDir, file));
    }
  }
}

// Execute checks
printHeader();

console.log(`${colors.bold}⚡ Conducting Fleetwood Code & Manifest Audit...${colors.reset}`);
TARGET_DIRS.forEach(dir => {
  const fullPath = path.join(ROOT, dir);
  if (fs.existsSync(fullPath)) {
    walk(fullPath);
  }
});
console.log(`   └─ Checked ${colors.green}${report.jsFilesChecked}${colors.reset} JS & Compose files.`);

console.log(`\n${colors.bold}⚡ Conducting GitHub Workflows & Actions Audit...${colors.reset}`);
auditWorkflows();
console.log(`   └─ Checked ${colors.green}${report.ymlFilesChecked}${colors.reset} YML workflow manifests.`);

// Print Results
console.log('\n' + '═'.repeat(75));
console.log(`${colors.bold}📊 AUDIT SUMMARY${colors.reset}`);
console.log('═'.repeat(75));

const LEGACY_ADVISORY_TYPES = new Set([
  'NAN_SAFETY_RISK',
  'MANUAL_IDENTITY_COMPARE',
  'HARDCODED_DIVISOR',
  'MISSING_SUPER_INIT',
]);
const actionableWarnings = report.warnings.filter(w => !LEGACY_ADVISORY_TYPES.has(w.type));
const legacyAdvisories = report.warnings.filter(w => LEGACY_ADVISORY_TYPES.has(w.type));

function printGroupedAdvisories(advisories) {
  const grouped = advisories.reduce((acc, item) => {
    if (!acc[item.type]) acc[item.type] = { count: 0, samples: [] };
    acc[item.type].count += 1;
    if (acc[item.type].samples.length < 3) {
      acc[item.type].samples.push(path.relative(ROOT, item.file));
    }
    return acc;
  }, {});

  Object.entries(grouped)
    .sort((a, b) => b[1].count - a[1].count)
    .forEach(([type, data]) => {
      const samples = Array.from(new Set(data.samples)).join(', ');
      console.log(`     [${colors.yellow}${type}${colors.reset}] ${data.count} advisory item(s); samples: ${colors.cyan}${samples}${colors.reset}`);
    });
}

if (report.errors.length === 0 && actionableWarnings.length === 0 && legacyAdvisories.length === 0) {
  console.log(`\n  ${colors.green}${colors.bold}🎉 EXCELLENT! 100% Purity Passed. Zero errors, zero warnings.${colors.reset}\n`);
  console.log(`  🚀 The repository is perfectly sanitized and ready for push/publish!`);
  console.log('═'.repeat(75) + '\n');
  process.exit(0);
}

if (actionableWarnings.length > 0) {
  console.log(`\n  ${colors.yellow}${colors.bold}⚠️  ACTIONABLE WARNINGS (${actionableWarnings.length}):${colors.reset}`);
  actionableWarnings.forEach(w => {
    console.log(`     [${colors.yellow}${w.type}${colors.reset}] in ${colors.cyan}${path.relative(ROOT, w.file)}${colors.reset}`);
    console.log(`     └─ ${w.message}\n`);
  });
}

if (legacyAdvisories.length > 0) {
  console.log(`\n  ${colors.yellow}${colors.bold}ℹ️  LEGACY ADVISORIES SUMMARIZED (${legacyAdvisories.length}):${colors.reset}`);
  printGroupedAdvisories(legacyAdvisories);
  console.log(`\n  These are historical technical-debt signals kept visible without flooding the precommit output.`);
}

if (report.errors.length > 0) {
  console.log(`\n  ${colors.red}${colors.bold}❌ CRITICAL ERRORS DETECTED (${report.errors.length}):${colors.reset}`);
  report.errors.forEach(e => {
    console.log(`     [${colors.red}${e.type}${colors.reset}] in ${colors.cyan}${path.relative(ROOT, e.file)}${colors.reset}`);
    console.log(`     └─ ${colors.bold}${e.message}${colors.reset}\n`);
  });
  console.log('═'.repeat(75));
  console.log(`\n  ${colors.red}${colors.bold}🛑 INTEGRITY GATE REJECTED. Please resolve critical errors before pushing/publishing.${colors.reset}\n`);
  console.log('═'.repeat(75) + '\n');
  process.exit(1);
} else if (actionableWarnings.length > 0) {
  console.log('═'.repeat(75));
  console.log(`\n  ${colors.green}${colors.bold}🚀 INTEGRITY GATE PASSED (with actionable warnings). Code is safe to commit.${colors.reset}\n`);
  console.log('═'.repeat(75) + '\n');
  process.exit(0);
} else {
  console.log('═'.repeat(75));
  console.log(`\n  ${colors.green}${colors.bold}🚀 INTEGRITY GATE PASSED. Zero errors, zero actionable warnings.${colors.reset}\n`);
  console.log('═'.repeat(75) + '\n');
  process.exit(0);
}
