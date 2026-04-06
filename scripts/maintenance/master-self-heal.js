#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  MASTER SELF-HEAL ENGINE v1.0                                              ║
 * ║  Orchestrates ALL discovered fixes across the Universal Tuya Zigbee App     ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Run:  node scripts/maintenance/master-self-heal.js                        ║
 * ║  CI:   Integrated into daily-everything.yml Step 6a-ter                     ║
 * ║  Env:  DRY_RUN=true for preview mode                                       ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 *
 * RULES ENCODED (from all sessions):
 *  1. sdk3-phantom-methods   — Replace getDeviceConditionCard/getDeviceActionCard
 *  2. fingerprint-case       — Lowercase ALL fingerprints in driver.compose.json
 *  3. probe-dedup-static     — Remove measure_temperature.probe from pure-ZCL drivers
 *  4. flow-card-try-catch    — Wrap bare getDeviceTriggerCard in try-catch
 *  5. energy-batteries       — Add energy.batteries if measure_battery is declared
 *  6. multigang-flow-routing — Replace raw ZCL onOff.setOn() with triggerCapabilityListener
 *  7. dp-variant-doc         — Flag DP mappings missing variant comments
 *  8. case-insensitive-matching — Ensure all manufacturer comparisons use .toLowerCase()
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const LIB_DIR = path.join(ROOT, 'lib');
const DRY = process.env.DRY_RUN === 'true';
const VERBOSE = process.env.VERBOSE === 'true';

// Report tracking
const report = {
  timestamp: new Date().toISOString(),
  totalFiles: 0,
  totalFixes: 0,
  rules: {},
  errors: [],
};

function log(msg) { console.log(msg); }
function warn(msg) { console.warn(`  ⚠️  ${msg}`); }

function addFix(ruleId, file, detail) {
  if (!report.rules[ruleId]) report.rules[ruleId] = { count: 0, files: [] };
  report.rules[ruleId].count++;
  report.rules[ruleId].files.push({ file: path.relative(ROOT, file), detail });
  report.totalFixes++;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FILE UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

function findFiles(dir, ext, results = []) {
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory() && e.name !== 'node_modules' && e.name !== '.git') {
      findFiles(full, ext, results);
    } else if (e.isFile() && e.name.endsWith(ext)) {
      results.push(full);
    }
  }
  return results;
}

function safeWrite(file, content) {
  if (DRY) {
    log(`  [DRY] Would write: ${path.relative(ROOT, file)}`);
    return false;
  }
  fs.writeFileSync(file, content, 'utf8');
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RULE 1: SDK3 PHANTOM METHODS
// getDeviceConditionCard → getConditionCard
// getDeviceActionCard → getActionCard
// ═══════════════════════════════════════════════════════════════════════════════

function rule_phantomMethods() {
  log('\n📋 Rule 1: SDK3 Phantom Methods');
  const jsFiles = [...findFiles(DRIVERS_DIR, '.js'), ...findFiles(LIB_DIR, '.js')];
  let fixes = 0;

  for (const file of jsFiles) {
    let code = fs.readFileSync(file, 'utf8');
    const original = code;

    code = code.replace(/\.getDeviceConditionCard\s*\(/g, '.getConditionCard(');
    code = code.replace(/\.getDeviceActionCard\s*\(/g, '.getActionCard(');
    code = code.replace(/\.getDeviceTriggerCard\s*\(/g, '.getTriggerCard(');

    if (code !== original) {
      safeWrite(file, code);
      fixes++;
      addFix('sdk3-phantom-methods', file, 'Replaced phantom flow card methods');
      log(`  ✅ Fixed: ${path.relative(ROOT, file)}`);
    }
  }

  log(`  → ${fixes} files fixed`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// RULE 2: FINGERPRINT CASE NORMALIZATION
// All fingerprints in driver.compose.json must be lowercase
// ═══════════════════════════════════════════════════════════════════════════════

function rule_fingerprintCase() {
  log('\n📋 Rule 2: Fingerprint Case Normalization');
  const composeFiles = findFiles(DRIVERS_DIR, '.json').filter(f => f.endsWith('driver.compose.json'));
  let fixes = 0;

  for (const file of composeFiles) {
    try {
      const raw = fs.readFileSync(file, 'utf8');
      const compose = JSON.parse(raw);
      const mfrs = compose?.zigbee?.manufacturerName;
      if (!Array.isArray(mfrs)) continue;

      let changed = false;
      const fixed = mfrs.map(m => {
        if (typeof m !== 'string') return m;
        const lower = m.toLowerCase();
        if (m !== lower) { changed = true; return lower; }
        return m;
      });

      if (changed) {
        compose.zigbee.manufacturerName = fixed;
        const uppercaseCount = mfrs.filter(m => m !== m.toLowerCase()).length;
        safeWrite(file, JSON.stringify(compose, null, 2) + '\n');
        fixes++;
        addFix('fingerprint-case', file, `Lowercased ${uppercaseCount} fingerprints`);
        log(`  ✅ Fixed: ${path.relative(ROOT, file)} (${uppercaseCount} fingerprints)`);
      }
    } catch (e) {
      report.errors.push({ rule: 'fingerprint-case', file, error: e.message });
    }
  }

  log(`  → ${fixes} files fixed`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// RULE 3: PROBE DEDUP FOR PURE-ZCL DRIVERS
// Remove measure_temperature.probe from pure-ZCL drivers (no DP38 possible)
// Keep for DP-capable drivers (may have legitimate internal + external probe)
// ═══════════════════════════════════════════════════════════════════════════════

function rule_probeDedup() {
  log('\n📋 Rule 3: Probe Dedup for Pure-ZCL Drivers');
  const composeFiles = findFiles(DRIVERS_DIR, '.json').filter(f => f.endsWith('driver.compose.json'));
  let fixes = 0;

  for (const file of composeFiles) {
    try {
      const compose = JSON.parse(fs.readFileSync(file, 'utf8'));
      const caps = compose.capabilities || [];
      if (!caps.includes('measure_temperature.probe')) continue;

      const mfrs = compose?.zigbee?.manufacturerName || [];
      const hasPureZCL = mfrs.some(m => /^_tz3[02]/i.test(m) || /^owon/i.test(m));
      const hasDP = mfrs.some(m => /^_tze/i.test(m) || /^_tyst/i.test(m));

      // Only remove for PURE ZCL drivers (no DP fingerprints at all)
      if (hasPureZCL && !hasDP) {
        compose.capabilities = caps.filter(c => c !== 'measure_temperature.probe');
        safeWrite(file, JSON.stringify(compose, null, 2) + '\n');
        fixes++;
        addFix('probe-dedup-static', file, 'Removed static probe from pure-ZCL driver');
        log(`  ✅ Fixed: ${path.relative(ROOT, file)}`);
      } else if (hasPureZCL && hasDP) {
        // Hybrid driver with both ZCL and DP fingerprints — keep probe, it's variant-dependent
        if (VERBOSE) log(`  ℹ️  Hybrid driver: ${path.relative(ROOT, file)} — keeping probe (variant-aware)`);
      }
    } catch (e) {
      report.errors.push({ rule: 'probe-dedup-static', file, error: e.message });
    }
  }

  log(`  → ${fixes} files fixed`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// RULE 4: FLOW CARD TRY-CATCH SAFETY
// Wrap bare getDeviceTriggerCard calls in try-catch blocks
// ═══════════════════════════════════════════════════════════════════════════════

function rule_flowCardTryCatch() {
  log('\n📋 Rule 4: Flow Card Try-Catch Safety');
  const jsFiles = [...findFiles(DRIVERS_DIR, '.js'), ...findFiles(LIB_DIR, '.js')];
  let warnings = 0;

  for (const file of jsFiles) {
    const code = fs.readFileSync(file, 'utf8');
    const lines = code.split('\n');

    for (let i = 0; i < lines.length; i++) {
      if (/getDeviceTriggerCard/.test(lines[i])) {
        let inTry = false;
        for (let j = Math.max(0, i - 5); j <= i; j++) {
          if (/try\s*\{/.test(lines[j])) inTry = true;
        }
        if (!inTry) {
          warnings++;
          addFix('flow-card-try-catch', file, `Line ${i + 1}: getDeviceTriggerCard without try-catch`);
          if (VERBOSE) warn(`${path.relative(ROOT, file)}:${i + 1} — bare getDeviceTriggerCard`);
        }
      }
    }
  }

  log(`  → ${warnings} warnings (manual fix recommended)`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// RULE 5: ENERGY.BATTERIES ENFORCEMENT
// If driver declares measure_battery, it MUST have energy.batteries array
// ═══════════════════════════════════════════════════════════════════════════════

function rule_energyBatteries() {
  log('\n📋 Rule 5: Energy Batteries Enforcement');
  const composeFiles = findFiles(DRIVERS_DIR, '.json').filter(f => f.endsWith('driver.compose.json'));
  let fixes = 0;

  const DEFAULT_BATTERIES = ['AAA', 'AAA', 'AAA']; // Most Tuya sensors use 2-3 AAA

  for (const file of composeFiles) {
    try {
      const compose = JSON.parse(fs.readFileSync(file, 'utf8'));
      const caps = compose.capabilities || [];

      if (!caps.includes('measure_battery') && !caps.includes('alarm_battery')) continue;

      // Check if device is battery-powered (not mains-powered via class)
      const deviceClass = compose.class || '';
      const mainsPowered = ['socket', 'light', 'fan', 'heater', 'other'].includes(deviceClass);

      if (mainsPowered) continue; // Mains devices don't need batteries array

      if (!compose.energy || !compose.energy.batteries || compose.energy.batteries.length === 0) {
        if (!compose.energy) compose.energy = {};
        if (!compose.energy.batteries || compose.energy.batteries.length === 0) {
          compose.energy.batteries = DEFAULT_BATTERIES;
          safeWrite(file, JSON.stringify(compose, null, 2) + '\n');
          fixes++;
          addFix('energy-batteries', file, 'Added energy.batteries array');
          log(`  ✅ Fixed: ${path.relative(ROOT, file)}`);
        }
      }
    } catch (e) {
      report.errors.push({ rule: 'energy-batteries', file, error: e.message });
    }
  }

  log(`  → ${fixes} files fixed`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// RULE 6: MULTI-GANG FLOW ACTION ROUTING
// Detect raw ZCL onOff.setOn() in flow action handlers
// Should use triggerCapabilityListener('onoff.gangX', true/false) instead
// ═══════════════════════════════════════════════════════════════════════════════

function rule_multigangFlowRouting() {
  log('\n📋 Rule 6: Multi-Gang Flow Action Routing');
  const jsFiles = findFiles(DRIVERS_DIR, '.js');
  let warnings = 0;

  for (const file of jsFiles) {
    const code = fs.readFileSync(file, 'utf8');

    // Only check files that have registerRunListener AND raw ZCL
    if (!/registerRunListener/.test(code)) continue;

    const rawZclPattern = /zclNode\.endpoints\[.*?\]\.clusters\.onOff\.set(?:On|Off)\s*\(/gs;
    const matches = code.match(rawZclPattern);
    if (matches && matches.length > 0) {
      warnings++;
      addFix('multigang-flow-routing', file, `${matches.length} raw ZCL calls in flow handlers — should use triggerCapabilityListener`);
      log(`  ⚠️  ${path.relative(ROOT, file)}: ${matches.length} raw ZCL calls in flow actions`);
    }
  }

  log(`  → ${warnings} warnings (manual fix recommended)`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// RULE 7: DP VARIANT DOCUMENTATION
// Flag DP mappings that serve multiple TZE prefixes without variant comments
// ═══════════════════════════════════════════════════════════════════════════════

function rule_dpVariantDocs() {
  log('\n📋 Rule 7: DP Variant Documentation');
  const jsFiles = findFiles(DRIVERS_DIR, '.js').filter(f => f.endsWith('device.js'));
  let warnings = 0;

  for (const file of jsFiles) {
    const code = fs.readFileSync(file, 'utf8');
    if (!/dpMappings/.test(code)) continue;
    if (/variant/i.test(code)) continue; // Already has variant comments

    const hasTZE200 = /_TZE200/i.test(code);
    const hasTZE204 = /_TZE204/i.test(code);
    const hasTZE284 = /_TZE284/i.test(code);
    const prefixCount = [hasTZE200, hasTZE204, hasTZE284].filter(Boolean).length;

    if (prefixCount >= 2) {
      warnings++;
      addFix('dp-variant-docs', file, 'Multiple TZE prefixes without variant documentation');
      if (VERBOSE) warn(`${path.relative(ROOT, file)}: multi-variant DP mappings without docs`);
    }
  }

  log(`  → ${warnings} drivers need variant documentation`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// RULE 8: CASE-INSENSITIVE MANUFACTURER MATCHING
// Ensure all manufacturer comparisons use .toLowerCase()
// Prevents case mismatches between device reports and our fingerprints
// ═══════════════════════════════════════════════════════════════════════════════

function rule_caseInsensitiveMatching() {
  log('\n📋 Rule 8: Case-Insensitive Manufacturing Matching');
  const jsFiles = [...findFiles(DRIVERS_DIR, '.js'), ...findFiles(LIB_DIR, '.js')];
  let warnings = 0;

  for (const file of jsFiles) {
    const code = fs.readFileSync(file, 'utf8');
    const lines = code.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Detect direct string comparisons with manufacturer names without toLowerCase
      if (/manufacturerName\s*===?\s*['"]_T/i.test(line) && !/toLowerCase/.test(line)) {
        warnings++;
        addFix('case-insensitive-matching', file, `Line ${i + 1}: manufacturer comparison without toLowerCase()`);
        if (VERBOSE) warn(`${path.relative(ROOT, file)}:${i + 1}: direct manufacturer comparison`);
      }
    }
  }

  log(`  → ${warnings} case-sensitive comparisons found`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// RULE 9: DUPLICATE FINGERPRINTS ACROSS DRIVERS
// Same fingerprint in multiple driver.compose.json → pairing ambiguity
// ═══════════════════════════════════════════════════════════════════════════════

function rule_duplicateFingerprints() {
  log('\n📋 Rule 9: Duplicate Fingerprints Across Drivers');
  const composeFiles = findFiles(DRIVERS_DIR, '.json').filter(f => f.endsWith('driver.compose.json'));
  const fpMap = {}; // fingerprint → [driver1, driver2, ...]
  let dupeCount = 0;

  for (const file of composeFiles) {
    try {
      const compose = JSON.parse(fs.readFileSync(file, 'utf8'));
      const mfrs = compose?.zigbee?.manufacturerName || [];
      const pids = compose?.zigbee?.productId || [];
      const driverName = path.basename(path.dirname(file));

      for (const m of mfrs) {
        const key = (typeof m === 'string' ? m : '').toLowerCase();
        if (!key) continue;
        if (!fpMap[key]) fpMap[key] = [];
        fpMap[key].push(driverName);
      }
    } catch (e) { /* skip */ }
  }

  // Find duplicates
  for (const [fp, drivers] of Object.entries(fpMap)) {
    if (drivers.length > 1) {
      dupeCount++;
      addFix('duplicate-fingerprints', DRIVERS_DIR, `${fp} found in: ${drivers.join(', ')}`);
      if (VERBOSE || dupeCount <= 5) {
        log(`  ⚠️  ${fp} → ${drivers.join(', ')}`);
      }
    }
  }

  if (dupeCount > 5) log(`  ... and ${dupeCount - 5} more`);
  log(`  → ${dupeCount} duplicate fingerprints found`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// RULE 10: PUNYCODE DEPRECATION
// Replace require('punycode') with userland alternative
// ═══════════════════════════════════════════════════════════════════════════════

function rule_punycodeDeprecation() {
  log('\n📋 Rule 10: Punycode Deprecation Check');
  const jsFiles = [...findFiles(DRIVERS_DIR, '.js'), ...findFiles(LIB_DIR, '.js')];
  let warnings = 0;

  for (const file of jsFiles) {
    const code = fs.readFileSync(file, 'utf8');
    if (/require\s*\(\s*['"]punycode['"]\s*\)/.test(code)) {
      warnings++;
      addFix('punycode-deprecation', file, 'Uses deprecated punycode module');
      log(`  ⚠️  ${path.relative(ROOT, file)}: uses deprecated punycode`);
    }
  }

  log(`  → ${warnings} files using deprecated punycode`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  log('╔══════════════════════════════════════════════════════════════════════════════╗');
  log('║  MASTER SELF-HEAL ENGINE v1.0 — Universal Tuya Zigbee                      ║');
  log('║  Encoding all session discoveries into automated self-repair               ║');
  log(`║  Mode: ${DRY ? 'DRY RUN (preview)' : 'LIVE (applying fixes)'}${' '.repeat(54 - (DRY ? 21 : 22))}║`);
  log('╚══════════════════════════════════════════════════════════════════════════════╝');

  // AUTO-FIX RULES (safe, idempotent)
  rule_phantomMethods();
  // rule_fingerprintCase(); // DISABLED: Breaks case-sensitive Tuya discovery
  rule_probeDedup();
  rule_energyBatteries();

  // DETECTION RULES (report only, manual fixes recommended)
  rule_flowCardTryCatch();
  rule_multigangFlowRouting();
  rule_dpVariantDocs();
  rule_caseInsensitiveMatching();
  rule_duplicateFingerprints();
  rule_punycodeDeprecation();

  // ═══════════════════════════════════════════════════════════════════════════
  // REPORT SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════
  log('\n═══════════════════════════════════════════════════════════════════════');
  log('  SELF-HEAL REPORT');
  log('═══════════════════════════════════════════════════════════════════════');

  const autoFixed = ['sdk3-phantom-methods', 'fingerprint-case', 'probe-dedup-static', 'energy-batteries'];
  const manualReview = Object.keys(report.rules).filter(r => !autoFixed.includes(r));

  let totalAutoFixes = 0;
  let totalWarnings = 0;

  for (const ruleId of autoFixed) {
    const r = report.rules[ruleId];
    if (r) {
      totalAutoFixes += r.count;
      log(`  ✅ ${ruleId}: ${r.count} fixes applied`);
    }
  }

  for (const ruleId of manualReview) {
    const r = report.rules[ruleId];
    if (r) {
      totalWarnings += r.count;
      log(`  ⚠️  ${ruleId}: ${r.count} issues found`);
    }
  }

  log('');
  log(`  Total auto-fixes: ${totalAutoFixes}`);
  log(`  Total warnings:   ${totalWarnings}`);
  log(`  Errors:           ${report.errors.length}`);
  log('═══════════════════════════════════════════════════════════════════════');

  // Write report
  const reportDir = path.join(ROOT, '.github', 'state');
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, 'self-heal-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log(`\n📄 Report saved: ${path.relative(ROOT, reportPath)}`);

  // Exit code based on auto-fixes vs errors
  if (report.errors.length > 0) {
    process.exit(2);
  } else if (totalAutoFixes > 0) {
    process.exit(0); // Success with fixes
  } else {
    process.exit(0); // Clean
  }
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
