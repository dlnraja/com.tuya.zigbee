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
 *  9. duplicate-fingerprints    — Flag ambiguity in driver pairing
 *  10. punycode-deprecation    — Replace node-internal with userland
 *  11. hybrid-flow-id-prefixing — Fix collisions in driver.flow.compose.json
 *  12. capability-init-sanity   — Ensure _registerCapabilityListeners and initPhysicalButtonDetection are called
 *  13. naked-flow-cards       — Flag Flow card calls missing ID argument
 *  14. logic-case-audit       — Flag suspected case-sensitive comparisons
 *  15. this-prefix-safety     — Replace global SDK method calls with 'this.' (ReferenceError prevention)
 *  16. defensive-get-device   — Inject defensive getDeviceById override in drivers
 *  17. safe-flow-lookup       — Wrap getDeviceTriggerCard in try-catch
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

    // v5.13.3: SDK3 MANDATORY NORMALIZATION (REVERSED)
    // Athom SDK3 REQUIRES getDevice*Card() for driver-specific flow cards
    // Using simple get*Card() for these cards results in null/unlinked cards
    code = code.replace(/\.getConditionCard\s*\(/g, '.getDeviceConditionCard(');
    code = code.replace(/\.getActionCard\s*\(/g, '.getDeviceActionCard(');
    code = code.replace(/\.getTriggerCard\s*\(/g, '.getDeviceTriggerCard(');

    if (code !== original) {
      safeWrite(file, code);
      fixes++;
      addFix('sdk3-device-flow-cards', file, 'Normalized to SDK3 getDevice*Card methods for driver-specific flows');
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
  log('\n📋 Rule 5: Energy Batteries Enforcement (SDK3 Publish Compliance)');
  const composeFiles = findFiles(DRIVERS_DIR, '.json').filter(f => f.endsWith('driver.compose.json'));
  let fixes = 0;

  const DEFAULT_BATTERIES = ['AAA', 'AAA']; // Most Tuya hybrid sensors use 2xAAA

  for (const file of composeFiles) {
    try {
      const compose = JSON.parse(fs.readFileSync(file, 'utf8'));
      const caps = compose.capabilities || [];

      // SDK3 MANDATORY: If measure_battery is present, energy.batteries MUST be defined
      // Source: SDK3 Validation Error "missing an array 'energy.batteries' because the capability measure_battery is being used"
      if (!caps.includes('measure_battery') && !caps.includes('alarm_battery')) continue;

      if (!compose.energy || !compose.energy.batteries || compose.energy.batteries.length === 0) {
        if (!compose.energy) compose.energy = {};
        if (!compose.energy.batteries || compose.energy.batteries.length === 0) {
          compose.energy.batteries = DEFAULT_BATTERIES;
          safeWrite(file, JSON.stringify(compose, null, 2) + '\n');
          fixes++;
          addFix('energy-batteries', file, 'Added energy.batteries array for SDK3 compliance');
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
  let fixes = 0;

  for (const file of jsFiles) {
    let code = fs.readFileSync(file, 'utf8');
    const original = code;
    
    // Replace require('punycode') with require('punycode/') - forces npm package over built-in
    code = code.replace(/require\s*\(\s*['"]punycode['"]\s*\)/g, "require('punycode/')");

    if (code !== original) {
      safeWrite(file, code);
      fixes++;
      addFix('punycode-deprecation', file, 'Replaced internal punycode with userland punycode/');
      log(`  ✅ Fixed: ${path.relative(ROOT, file)}`);
    }
  }

  log(`  → ${fixes} files fixed`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// RULE 11: HYBRID FLOW ID PREFIXING
// Ensure all flow cards in driver.flow.compose.json start with {driverId}_
// ═══════════════════════════════════════════════════════════════════════════════

function rule_flowIdPrefixing() {
  log('\n📋 Rule 11: Hybrid Flow ID Prefixing');
  const flowFiles = findFiles(DRIVERS_DIR, '.json').filter(f => f.endsWith('driver.flow.compose.json'));
  let fixes = 0;

  for (const file of flowFiles) {
    try {
      const driverId = path.basename(path.dirname(file));
      const raw = fs.readFileSync(file, 'utf8');
      const flow = JSON.parse(raw);
      let changed = false;

      const prefix = `${driverId}_`;
      const processCategory = (category) => {
        if (!Array.isArray(flow[category])) return;
        flow[category].forEach(card => {
          if (card.id && !card.id.startsWith(prefix)) {
            const oldId = card.id;
            card.id = prefix + card.id;
            changed = true;
            if (VERBOSE) log(`    [FIX] ${oldId} -> ${card.id}`);
          }
        });
      };

      processCategory('triggers');
      processCategory('conditions');
      processCategory('actions');

      if (changed) {
        safeWrite(file, JSON.stringify(flow, null, 2) + '\n');
        fixes++;
        addFix('hybrid-flow-id-prefixing', file, `Prefixed flow cards with ${prefix}`);
        log(`  ✅ Fixed: ${path.relative(ROOT, file)}`);
      }
    } catch (e) {
      report.errors.push({ rule: 'hybrid-flow-id-prefixing', file, error: e.message });
    }
  }

  log(`  → ${fixes} files fixed`);
}


// ═══════════════════════════════════════════════════════════════════════════════
// RULE 12: CAPABILITY REGISTRATION SANITY
// Ensure _registerCapabilityListeners() and initPhysicalButtonDetection() are called
// ═══════════════════════════════════════════════════════════════════════════════

function rule_capabilityInitSanity() {
  log('\n📋 Rule 12: Capability Registration Sanity');
  const jsFiles = findFiles(DRIVERS_DIR, '.js').filter(f => f.endsWith('device.js'));
  let fixes = 0;

  for (const file of jsFiles) {
    try {
      let code = fs.readFileSync(file, 'utf8');
      const original = code;
      
      // Check if it's a HybridSwitchBase or HybridSensorBase (most need these)
      if (!/HybridSwitchBase|HybridSensorBase|BaseHybridDevice/.test(code)) continue;
      if (!/async onNodeInit/.test(code)) continue;

      // Rule 12a: Ensure _registerCapabilityListeners() is called somewhere in onNodeInit
      if (!/_registerCapabilityListeners\s*\(/.test(code)) {
         // Append it before the end of onNodeInit or before super.onNodeInit
         if (/await super\.onNodeInit/.test(code)) {
           code = code.replace(/await super\.onNodeInit\s*\(\s*\{.*?\}\s*\);/s, (match) => {
             return `${match}\n    this._registerCapabilityListeners(); // rule-12a injected`;
           });
         } else if (/onNodeInit\s*\(\{.*?\}\)\s*\{/.test(code)) {
           code = code.replace(/onNodeInit\s*\(\{.*?\}\)\s*\{/, (match) => {
             return `${match}\n    this._registerCapabilityListeners(); // rule-12a injected`;
           });
         }
      }

      if (code !== original) {
        safeWrite(file, code);
        fixes++;
        addFix('capability-init-sanity', file, 'Injected missing capability listener registration');
        log(`  ✅ Fixed: ${path.relative(ROOT, file)}`);
      }
    } catch (e) {
      report.errors.push({ rule: 'capability-init-sanity', file, error: e.message });
    }
  }

  log(`  → ${fixes} files fixed`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// RULE 13: FINGERPRINT WILDCARD CLEANUP (NO-AI)
// Remove '*' from manufacturerName/productId (SDK v3 crashes on them)
// ═══════════════════════════════════════════════════════════════════════════════

function rule_fingerprintWildcardCleanup() {
  log('\n📋 Rule 13: Fingerprint Wildcard Cleanup');
  const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory());
  let fixes = 0;

  for (const driver of drivers) {
    const composeFile = path.join(DRIVERS_DIR, driver, 'driver.compose.json');
    if (!fs.existsSync(composeFile)) continue;

    try {
      let raw = fs.readFileSync(composeFile, 'utf8');
      const compose = JSON.parse(raw);
      if (!compose.zigbee) continue;

      let changed = false;
      const cleanArray = (arr) => {
        if (!Array.isArray(arr)) return arr;
        const filtered = arr.filter(v => typeof v === 'string' && !v.includes('*'));
        if (filtered.length !== arr.length) changed = true;
        return filtered;
      };

      if (compose.zigbee.manufacturerName) {
        compose.zigbee.manufacturerName = cleanArray(compose.zigbee.manufacturerName);
      }
      if (compose.zigbee.productId) {
        compose.zigbee.productId = cleanArray(compose.zigbee.productId);
      }

      if (changed) {
        safeWrite(composeFile, JSON.stringify(compose, null, 2) + '\n');
        fixes++;
        addFix('fingerprint-wildcard-cleanup', composeFile, 'Removed SDK3-incompatible wildcard (*) from fingerprints');
        log(`  ✅ Fixed: ${path.relative(ROOT, composeFile)}`);
      }
    } catch (e) {
      report.errors.push({ rule: 'fingerprint-wildcard-cleanup', file: composeFile, error: e.message });
    }
  }

  log(`  → ${fixes} files fixed`);
}

/**
 * Rule 13: Find "naked" getDeviceTriggerCard() calls without arguments.
 * These are ALWAYS invalid in SDK 3 but common after automated refactoring.
 */
function rule_nakedFlowCards() {
  log('\n🔍 Rule 13: Detecting naked Flow card calls (missing ID)...');
  const files = findFiles(ROOT, '.js');
  let issues = 0;

  files.forEach(file => {
    if (file.includes('node_modules') || file.includes('scripts')) return;
    try {
      const content = fs.readFileSync(file, 'utf8');
      const nakedCall = /\.getDevice(Trigger|Action|Condition)Card\(\)/g;
      const matches = content.match(nakedCall);
      if (matches) {
        issues += matches.length;
        addFix('naked-flow-cards', file, `Found ${matches.length} naked flow card call(s) missing ID argument`);
        log(`  ⚠️  Naked call in: ${path.relative(ROOT, file)}`);
      }
    } catch (e) {
      report.errors.push({ rule: 'naked-flow-cards', file, error: e.message });
    }
  });
  log(`  → ${issues} issues found (Manual fix required)`);
}

/**
 * Rule 14: Case-insensitive logic audit.
 * Detect usage of comparison logic that doesn't respect case on manufacturerName.
 */
function rule_logicCaseAudit() {
  log('\n🔍 Rule 14: Case-insensitive logic audit (manufacturerName comparisons)...');
  const files = findFiles(ROOT, '.js');
  let warnings = 0;

  files.forEach(file => {
    if (file.includes('node_modules') || file.includes('scripts')) return;
    try {
      const content = fs.readFileSync(file, 'utf8');
      // Look for comparison with manufacturerName that isn't using a CI method
      const badComparisons = [
        /manufacturerName\s*===[^']*'[^']+'(?!\s*===)/g, // Match equality with strings, but avoid complex ones
        /manufacturerName\s*!==[^']*'[^']+'(?!\s*!==)/g,
        /\.includes\(\s*this\.(driver\.)?manufacturerName/g
      ];

      // Filter out safe comparisons (undefined, null, typeof)
      const contentFiltered = content.replace(/manufacturerName\s*===\s*(undefined|null)/g, '')
                                     .replace(/manufacturerName\s*!==\s*(undefined|null)/g, '')
                                     .replace(/typeof\s+[\s\S]+?manufacturerName/g, '');

      badComparisons.forEach(regex => {
        if (regex.test(content)) {
          warnings++;
          addFix('logic-case-audit', file, `Suspected case-sensitive comparison of manufacturerName`);
          log(`  ⚠️  Bad comparison in: ${path.relative(ROOT, file)}`);
        }
      });
    } catch (e) { /* ignore */ }
  });
  log(`  → ${warnings} suspect code blocks found`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// RULE 15: THIS-PREFIX SAFETY
// Replace global SDK method calls (addCapability, setCapabilityValue, etc.) with this.
// ═══════════════════════════════════════════════════════════════════════════════

function rule_thisPrefixSafety() {
  log('\n📋 Rule 15: This-Prefix Safety (ReferenceError prevention)');
  const jsFiles = [...findFiles(DRIVERS_DIR, '.js'), ...findFiles(LIB_DIR, '.js')];
  let fixes = 0;

  const methods = [
    'addCapability',
    'removeCapability',
    'setCapabilityValue',
    'getCapabilityValue',
    'hasCapability',
    'getCapabilities',
    'setSettings',
    'getSettings',
    'setStoreValue',
    'getStoreValue',
  ];

  for (const file of jsFiles) {
    let code = fs.readFileSync(file, 'utf8');
    const original = code;

    methods.forEach(method => {
      // Regex explanation:
      // (^|[^a-zA-Z0-9_.$])  -> Not preceded by a character that would make it part of another property access or name
      // (${method})          -> The specific method name
      // \\s*\\(              -> Followed by an opening parenthesis
      // Exclude matches that are already calls on 'this', 'super', 'device', 'args.device', or 'node'
      // ALSO exclude definitions: preceded by 'async ', 'function ', or 'static '
      const regex = new RegExp(`(^|[^a-zA-Z0-9_.$])(?<!this\\.|super\\.|device\\.|node\\.|args\\.device\\.|async\\s+|function\\s+|static\\s+)(${method})\\s*\\(`, 'g');
      
      code = code.replace(regex, (match, p1, p2) => {
        // Double check we are not in a comment or string (very basic check)
        const linesBefore = code.substring(0, code.indexOf(match)).split('\n');
        const currentLine = linesBefore[linesBefore.length - 1];
        if (currentLine.includes('//') || currentLine.includes('/*')) return match;
        
        // Final sanity check: if followed by { on same line, it's likely a definition
        const restOfLine = code.substring(code.indexOf(match) + match.length).split('\n')[0];
        if (restOfLine.trim().startsWith('{') || restOfLine.includes('=>')) return match;

        return `${p1}this.${p2}(`;
      });
    });

    if (code !== original) {
      safeWrite(file, code);
      fixes++;
      addFix('this-prefix-safety', file, 'Prefixed global SDK method calls with this.');
      if (VERBOSE) log(`    [FIX] Added 'this.' prefix in ${path.relative(ROOT, file)}`);
    }
  }
  log(`  → ${fixes} files fixed`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// RULE 16: DEFENSIVE GETDEVICEBYID OVERRIDE
// Inject a try-catch wrapper for getDeviceById into all driver classes
// ═══════════════════════════════════════════════════════════════════════════════

function rule_defensiveGetDeviceById() {
  log('\n📋 Rule 16: Defensive getDeviceById override');
  const driverFiles = findFiles(DRIVERS_DIR, 'driver.js');
  let fixes = 0;

  const injection = `
  /**
   * v7.0.12: Defensive getDeviceById override to prevent crashes during deserialization.
   * If a device cannot be found (e.g. removed while flow is triggering), return null instead of throwing.
   */
  getDeviceById(id) {
    try {
      return super.getDeviceById(id);
    } catch (err) {
      this.error(\`[CRASH-PREVENTION] Could not get device by id: \${id} - \${err.message}\`);
      return null;
    }
  }
`;

  for (const file of driverFiles) {
    let code = fs.readFileSync(file, 'utf8');
    const original = code;

    // Target TuyaZigbeeDriver or any class extending ZigBeeDriver/Driver
    if (!/extends\s+(ZigBeeDriver|Driver|TuyaLocalDriver)/.test(code)) continue;
    if (/getDeviceById\s*\(/.test(code)) continue; // Already has it

    // Inject after the class declaration line
    code = code.replace(/(class\s+\w+\s+extends\s+(?:ZigBeeDriver|Driver|TuyaLocalDriver)\s*\{)/, `$1${injection}`);

    if (code !== original) {
      safeWrite(file, code);
      fixes++;
      addFix('defensive-get-device', file, 'Injected defensive getDeviceById override');
      if (VERBOSE) log(`    [FIX] Injected getDeviceById in ${path.relative(ROOT, file)}`);
    }
  }
  log(`  → ${fixes} files fixed`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// RULE 17: SAFE FLOW LOOKUP
// Wrap Flow card lookups in try-catch to prevent crashes when cards are missing
// ═══════════════════════════════════════════════════════════════════════════════

function rule_safeFlowLookup() {
  log('\n📋 Rule 17: Safe Flow Lookup (try-catch wrapper)');
  const jsFiles = [...findFiles(DRIVERS_DIR, '.js'), ...findFiles(LIB_DIR, '.js')];
  let fixes = 0;

  const methods = ['getDeviceTriggerCard', 'getDeviceActionCard', 'getDeviceConditionCard'];

  for (const file of jsFiles) {
    let code = fs.readFileSync(file, 'utf8');
    const original = code;

    methods.forEach(m => {
      // v7.0.13: Use a more restrictive lookbehind and check for already wrapped code
      // We avoid wrapping if it's preceded by "return " and part of a try-catch pattern
      const regex = new RegExp(`(?<!(?:try\\s*\\{\\s*|return\\s+))this\\.homey\\.flow\\.${m}\\s*\\(([^)]+)\\)`, 'g');
      
      code = code.replace(regex, (match, args) => {
        return `(() => { try { return this.homey.flow.${m}(${args}); } catch (e) { this.error('[FLOW-SAFE] Failed to load card:', e.message); return null; } })()`;
      });
    });

    if (code !== original) {
      safeWrite(file, code);
      fixes++;
      addFix('safe-flow-lookup', file, 'Wrapped Flow card lookups in try-catch.');
    }
  }
  log(`  → ${fixes} files fixed`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// RULE 18: MULTI-GANG CAPABILITY OPTIONS (SDK3 Publish Compliance)
// Subcapabilities like onoff.gang1 MUST have a title in capabilitiesOptions
// ═══════════════════════════════════════════════════════════════════════════════

function rule_multiGangCapOptions() {
  log('\n📋 Rule 18: Multi-Gang Capability Options (SDK3 Publish Compliance)');
  const composeFiles = findFiles(DRIVERS_DIR, '.json').filter(f => f.endsWith('driver.compose.json'));
  let fixes = 0;

  for (const file of composeFiles) {
    try {
      const raw = fs.readFileSync(file, 'utf8');
      const compose = JSON.parse(raw);
      const caps = compose.capabilities || [];
      const subCaps = caps.filter(c => c.includes('.'));
      
      if (subCaps.length === 0) continue;

      if (!compose.capabilitiesOptions) compose.capabilitiesOptions = {};
      let changed = false;

      for (const cap of subCaps) {
        if (!compose.capabilitiesOptions[cap]) {
          // Generate a sensible title
          const parts = cap.split('.');
          const base = parts[0];
          const sub = parts[1];
          const gangMatch = sub.match(/gang(\d+)/i) || sub.match(/ch(\d+)/i) || sub.match(/_(\d+)/);
          const gangNum = gangMatch ? gangMatch[1] : sub;
          
          let title = '';
          if (base === 'onoff') title = `Gang ${gangNum}`;
          else if (base === 'measure_temperature') title = `Temperature ${gangNum}`;
          else if (base === 'measure_humidity') title = `Humidity ${gangNum}`;
          else if (base === 'target_temperature') title = `Target Temp ${gangNum}`;
          else title = `${base.split('_').slice(1).join(' ')} ${gangNum}`;

          compose.capabilitiesOptions[cap] = {
            title: {
              en: title.charAt(0).toUpperCase() + title.slice(1)
            }
          };
          changed = true;
        }
      }

      if (changed) {
        safeWrite(file, JSON.stringify(compose, null, 2) + '\n');
        fixes++;
        addFix('multigang-cap-options', file, 'Added missing capabilitiesOptions for sub-capabilities');
        log(`  ✅ Fixed: ${path.relative(ROOT, file)}`);
      }
    } catch (e) {
      report.errors.push({ rule: 'multigang-cap-options', file, error: e.message });
    }
  }

  log(`  → ${fixes} files fixed`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// RULE 19: PHYSICAL BUTTON DETECTION INITIALIZATION (v7.0 MAX Stability)
// Ensure devices using PhysicalButtonMixin call this.initPhysicalButtonDetection()
// ═══════════════════════════════════════════════════════════════════════════════

function rule_physicalButtonDetection() {
  log('\n📋 Rule 19: Physical Button Detection Initialization');
  const jsFiles = findFiles(DRIVERS_DIR, '.js').filter(f => f.endsWith('device.js'));
  let fixes = 0;

  for (const file of jsFiles) {
    try {
      let code = fs.readFileSync(file, 'utf8');
      const original = code;
      
      if (!code.includes('PhysicalButtonMixin')) continue;
      if (code.includes('this.initPhysicalButtonDetection()')) continue;

      // Inject into onNodeInit
      if (/await super\.onNodeInit/.test(code)) {
        code = code.replace(/(await super\.onNodeInit\s*\(\s*\{.*?\}\s*\);)/s, `$1\n    this.initPhysicalButtonDetection(); // rule-19 injected`);
      } else if (/async onNodeInit/.test(code)) {
        code = code.replace(/(async onNodeInit\s*\(\s*\{.*?\}\s*\)\s*\{)/, `$1\n    this.initPhysicalButtonDetection(); // rule-19 injected`);
      }

      if (code !== original) {
        safeWrite(file, code);
        fixes++;
        addFix('physical-button-init', file, 'Injected missing initPhysicalButtonDetection() call');
        log(`  ✅ Fixed: ${path.relative(ROOT, file)}`);
      }
    } catch (e) {
      report.errors.push({ rule: 'physical-button-init', file, error: e.message });
    }
  }

  log(`  → ${fixes} files fixed`);
}


async function main() {
  log('╔══════════════════════════════════════════════════════════════════════════════╗');
  log('║  MASTER SELF-HEAL ENGINE v1.1 — Universal Tuya Zigbee                      ║');
  log('║  Encoding all session discoveries into automated self-repair               ║');
  log(`║  Mode: ${DRY ? 'DRY RUN (preview)' : 'LIVE (applying fixes)'}${' '.repeat(54 - (DRY ? 21 : 22))}║`);
  log('╚══════════════════════════════════════════════════════════════════════════════╝');

  // AUTO-FIX RULES (safe, idempotent)
  rule_phantomMethods();
  // rule_fingerprintCase(); // DISABLED: Breaks case-sensitive Tuya discovery
  rule_probeDedup();
  rule_energyBatteries();
  rule_fingerprintWildcardCleanup();

  // DETECTION RULES (report only, manual fixes recommended)
  rule_flowCardTryCatch();
  rule_multigangFlowRouting();
  rule_dpVariantDocs();
  rule_caseInsensitiveMatching();
  rule_duplicateFingerprints();
  rule_punycodeDeprecation();
  rule_flowIdPrefixing();
  rule_capabilityInitSanity();
  rule_nakedFlowCards();
  rule_logicCaseAudit();

  // v7.0.12: CRITICAL ARCHITECTURAL REINFORCEMENTS
  rule_thisPrefixSafety();
  rule_defensiveGetDeviceById();
  rule_safeFlowLookup();
  rule_multiGangCapOptions(); 
  rule_physicalButtonDetection();

  // ═══════════════════════════════════════════════════════════════════════════
  // REPORT SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════
  log('\n═══════════════════════════════════════════════════════════════════════');
  log('  SELF-HEAL REPORT');
  log('═══════════════════════════════════════════════════════════════════════');

  const autoFixed = [
    'sdk3-phantom-methods', 
    'fingerprint-case', 
    'probe-dedup-static', 
    'energy-batteries', 
    'hybrid-flow-id-prefixing', 
    'capability-init-sanity', 
    'fingerprint-wildcard-cleanup',
    'this-prefix-safety',
    'defensive-get-device',
    'safe-flow-lookup',
    'multigang-cap-options',
    'physical-button-init'
  ];
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
