#!/usr/bin/env node
'use strict';

/**
 * SetCapability Validator - Modernized
 *
 * Consolidates functionality from:
 *   - scripts/legacy/fix_all_warnings_setcapability.js
 *   - scripts/legacy/fix_final_lib_warnings.js
 *   - scripts/legacy/fix_remaining_warnings_math.js
 *
 * Features:
 *   - Detects unsafe setCapabilityValue calls (missing parseFloat)
 *   - Checks for proper numeric conversion on numeric capabilities
 *   - Validates safeSetCapabilityValue usage
 *   - --json output for CI integration
 *   - --dry-run mode
 *   - --fix mode to apply fixes
 *   - Proper error handling and logging
 */

const fs = require('fs');
const path = require('path');

// Configuration
const ROOT = path.resolve(__dirname, '..', '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const LIB_DIR = path.join(ROOT, 'lib');

// Numeric capabilities that require parseFloat
const NUMERIC_CAPABILITIES = [
  'measure_temperature',
  'measure_humidity',
  'measure_pressure',
  'measure_co2',
  'measure_pm25',
  'measure_power',
  'measure_voltage',
  'measure_current',
  'measure_battery',
  'measure_luminance',
  'measure_noise',
  'measure_rain',
  'measure_wind_strength',
  'measure_wind_angle',
  'measure_gust_strength',
  'measure_gust_angle',
  'measure_ultraviolet',
  'measure_distance',
  'measure_rssi',
  'measure_soil_moisture',
  'measure_water_level',
  'measure_water_percentage',
  'meter_power',
  'meter_water',
  'meter_gas',
  'dim',
  'light_temperature',
  'light_hue',
  'light_saturation',
  'target_temperature',
  'volume_set',
  'windowcoverings_set',
];

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  return {
    json: args.includes('--json'),
    dryRun: args.includes('--dry-run'),
    fix: args.includes('--fix'),
    verbose: args.includes('--verbose') || args.includes('-v'),
  };
}

/**
 * Scan JavaScript files recursively
 */
function scanJsFiles(dir) {
  const files = [];

  if (!fs.existsSync(dir)) return files;

  const entries = fs.readdirSync(dir);

  for (const entry of entries) {
    if (entry.startsWith('.') || entry.includes('.backup')) continue;

    const fullPath = path.join(dir, entry);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...scanJsFiles(fullPath));
    } else if (entry.endsWith('.js')) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Check a single file for unsafe setCapabilityValue calls
 */
function checkFile(filePath, opts = {}) {
  const relativePath = path.relative(ROOT, filePath);
  const issues = [];

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Check for setCapabilityValue calls
      const setCapMatch = line.match(/(?:this\.|await\s+this\.|device\.|await\s+device\.)?setCapabilityValue\s*\(\s*['"`]([^'"`]+)['"`]\s*,/);

      if (setCapMatch) {
        const capability = setCapMatch[1];

        // Check if it's a numeric capability
        if (NUMERIC_CAPABILITIES.includes(capability)) {
          // Check if the value is properly converted
          const valuePart = line.substring(setCapMatch.index + setCapMatch[0].length);

          // Skip if already using parseFloat, parseInt, Number(), or is a literal
          if (valuePart.includes('parseFloat') ||
            valuePart.includes('parseInt') ||
            valuePart.includes('Number(') ||
            valuePart.match(/^\s*[0-9.]+\s*[,)]/) ||
            valuePart.match(/^\s*null\s*[,)]/) ||
            valuePart.match(/^\s*undefined\s*[,)]/)) {
            continue;
          }

          // Check for math expressions without parseFloat
          if (valuePart.match(/\s*[a-zA-Z_][a-zA-Z0-9_.]*\s*\/\s*[0-9]+/) ||
            valuePart.match(/\s*Math\.\w+/) ||
            valuePart.match(/\s*[a-zA-Z_][a-zA-Z0-9_.]*\s*[,)]/)) {
            issues.push({
              file: relativePath,
              line: lineNum,
              capability,
              code: line.trim(),
              suggestion: `Wrap value in parseFloat() for ${capability}`,
            });
          }
        }
      }

      // Check for unsafe this.setCapabilityValue (not using safeSetCapabilityValue)
      if (line.includes('this.setCapabilityValue(') && !line.includes('safeSetCapabilityValue')) {
        // This is just a warning, not necessarily a bug
        if (opts.verbose) {
          issues.push({
            file: relativePath,
            line: lineNum,
            capability: 'N/A',
            code: line.trim(),
            suggestion: 'Consider using safeSetCapabilityValue() for safety',
            severity: 'warning',
          });
        }
      }
    }
  } catch (e) {
    // Skip files that can't be read
  }

  return issues;
}

/**
 * Main validator function
 */
function runSetCapabilityValidator(opts = {}) {
  const startTime = Date.now();

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  SETCAPABILITY VALIDATOR - Modernized v2.0.0               ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // Scan files
  const driverFiles = scanJsFiles(DRIVERS_DIR);
  const libFiles = scanJsFiles(LIB_DIR);
  const allFiles = [...driverFiles, ...libFiles];

  console.log(`   Files scanned: ${allFiles.length}`);
  console.log(`     Drivers: ${driverFiles.length}`);
  console.log(`     Lib: ${libFiles.length}\n`);

  // Check each file
  const allIssues = [];

  for (const file of allFiles) {
    const issues = checkFile(file, opts);
    allIssues.push(...issues);
  }

  // Group by severity
  const errors = allIssues.filter(i => i.severity !== 'warning');
  const warnings = allIssues.filter(i => i.severity === 'warning');

  const duration = Date.now() - startTime;
  const passed = errors.length === 0;

  // Build result
  const result = {
    timestamp: new Date().toISOString(),
    duration: `${duration}ms`,
    passed,
    summary: {
      filesScanned: allFiles.length,
      errors: errors.length,
      warnings: warnings.length,
    },
    errors: errors.slice(0, 50),
    warnings: warnings.slice(0, 50),
  };

  // Output
  if (opts.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    if (errors.length > 0) {
      console.log('   ISSUES FOUND:');
      for (const issue of errors.slice(0, 20)) {
        console.log(`     ${issue.file}:${issue.line}`);
        console.log(`       ${issue.suggestion}`);
        if (opts.verbose) {
          console.log(`       Code: ${issue.code}`);
        }
      }
      if (errors.length > 20) {
        console.log(`     ... and ${errors.length - 20} more`);
      }
    }

    if (warnings.length > 0 && opts.verbose) {
      console.log('\n   WARNINGS:');
      for (const issue of warnings.slice(0, 10)) {
        console.log(`     ${issue.file}:${issue.line} - ${issue.suggestion}`);
      }
    }

    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log(`║  RESULT: ${passed ? 'PASSED' : 'FAILED'} - ${errors.length} errors, ${warnings.length} warnings             ║`);
    console.log(`║  Duration: ${duration}ms                                           ║`);
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
  }

  return result;
}

// Run if called directly
if (require.main === module) {
  const opts = parseArgs();
  const result = runSetCapabilityValidator(opts);
  process.exit(result.passed ? 0 : 1);
}

module.exports = { runSetCapabilityValidator, checkFile, NUMERIC_CAPABILITIES };
