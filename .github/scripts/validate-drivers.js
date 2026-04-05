#!/usr/bin/env node
/**
 * validate-drivers.js — Driver Integrity Validator
 *
 * Checks discovered from forum reports and debugging sessions:
 * 1. Multi-gang drivers must call super.onNodeInit() (Forum: Rikjes #1676)
 * 2. All driver.compose.json must be valid JSON
 * 3. Multi-gang capabilities must map to endpoints (Forum: endpoint routing discussion)
 * 4. Flow cards defined in driver.flow.compose.json must have matching listeners
 * 5. No duplicate manufacturer IDs across incompatible drivers
 *
 * Usage: node validate-drivers.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '..', '..', 'drivers');
const LIB_DIR = path.join(__dirname, '..', '..', 'lib');

let errors = 0;
let warnings = 0;

function error(driver, msg) {
  console.error(`❌ [${driver}] ${msg}`);
  errors++;
}

function warn(driver, msg) {
  console.warn(`⚠️  [${driver}] ${msg}`);
  warnings++;
}

function ok(driver, msg) {
  // Only log in verbose mode
  if (process.env.VERBOSE) console.log(`✅ [${driver}] ${msg}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHECK 1: Valid JSON for all compose files
// ═══════════════════════════════════════════════════════════════════════════════
function checkValidJSON() {
  console.log('\n📋 Check 1: Valid JSON...');
  const drivers = fs.readdirSync(DRIVERS_DIR).filter(d =>
    fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory()
  );

  for (const driver of drivers) {
    const composeFile = path.join(DRIVERS_DIR, driver, 'driver.compose.json');
    if (!fs.existsSync(composeFile)) {
      warn(driver, 'No driver.compose.json found');
      continue;
    }
    try {
      const data = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
      ok(driver, 'driver.compose.json valid');

      // Check flow compose too
      const flowFile = path.join(DRIVERS_DIR, driver, 'driver.flow.compose.json');
      if (fs.existsSync(flowFile)) {
        JSON.parse(fs.readFileSync(flowFile, 'utf8'));
        ok(driver, 'driver.flow.compose.json valid');
      }
    } catch (e) {
      error(driver, `JSON parse error: ${e.message}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHECK 2: Multi-gang switch drivers must call super.onNodeInit()
// Discovered: switch_2gang was missing this → "Missing Capability Listener: onoff"
// ═══════════════════════════════════════════════════════════════════════════════
function checkSuperOnNodeInit() {
  console.log('\n📋 Check 2: super.onNodeInit() in HybridSwitchBase subclasses...');

  // Drivers that extend HybridSwitchBase and MUST call super.onNodeInit()
  const switchDrivers = fs.readdirSync(DRIVERS_DIR).filter(d => {
    const deviceFile = path.join(DRIVERS_DIR, d, 'device.js');
    if (!fs.existsSync(deviceFile)) return false;
    const content = fs.readFileSync(deviceFile, 'utf8');
    return content.includes('HybridSwitchBase') || content.includes('HybridCoverBase');
  });

  for (const driver of switchDrivers) {
    const deviceFile = path.join(DRIVERS_DIR, driver, 'device.js');
    const content = fs.readFileSync(deviceFile, 'utf8');

    // Check if it overrides onNodeInit
    if (content.includes('onNodeInit')) {
      // It must call super.onNodeInit() somewhere, OR have a ZCL-only bail path
      const hasSuper = content.includes('super.onNodeInit');
      const hasZclOnlyReturn = content.includes('_initZclOnlyMode') && content.includes('return');

      if (!hasSuper && !hasZclOnlyReturn) {
        error(driver, 'Overrides onNodeInit but NEVER calls super.onNodeInit() — capability listeners will NOT register!');
      } else if (hasSuper) {
        ok(driver, 'Correctly calls super.onNodeInit()');
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHECK 3: Multi-gang capabilities must exist in driver.compose.json
// ═══════════════════════════════════════════════════════════════════════════════
function checkMultiGangCapabilities() {
  console.log('\n📋 Check 3: Multi-gang capability declarations...');

  const switchDrivers = fs.readdirSync(DRIVERS_DIR).filter(d =>
    d.includes('gang') || d.includes('switch')
  );

  for (const driver of switchDrivers) {
    const composeFile = path.join(DRIVERS_DIR, driver, 'driver.compose.json');
    if (!fs.existsSync(composeFile)) continue;

    try {
      const compose = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
      const capabilities = compose.capabilities || [];

      // Check if multi-gang capabilities are declared
      const gangMatch = driver.match(/(\d)gang/);
      if (gangMatch) {
        const gangCount = parseInt(gangMatch[1]);
        for (let i = 2; i <= gangCount; i++) {
          const gangCap = `onoff.gang${i}`;
          if (!capabilities.includes(gangCap)) {
            warn(driver, `Missing capability '${gangCap}' in driver.compose.json for ${gangCount}-gang device`);
          }
        }
      }
    } catch (e) {
      // JSON error already caught in check 1
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHECK 4: Duplicate manufacturer IDs across drivers
// ═══════════════════════════════════════════════════════════════════════════════
function checkDuplicateFingerprints() {
  console.log('\n📋 Check 4: TRUE Fingerprint Collisions (mfr + pid)...');

  const fpMap = new Map(); // "mfr|pid" → [driverNames]

  const drivers = fs.readdirSync(DRIVERS_DIR).filter(d =>
    fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory()
  );

  for (const driver of drivers) {
    const composeFile = path.join(DRIVERS_DIR, driver, 'driver.compose.json');
    if (!fs.existsSync(composeFile)) continue;

    try {
      const compose = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
      const mfrNames = compose.zigbee?.manufacturerName || [];
      const pIdNames = compose.zigbee?.productId || [];

      for (const mfr of mfrNames) {
        for (const pid of pIdNames) {
          const key = `${mfr}|${pid}`;
          if (!fpMap.has(key)) fpMap.set(key, []);
          fpMap.get(key).push(driver);
        }
      }
    } catch (e) { /* already reported */ }
  }

  // Report TRUE duplicates (same mfr AND same pid in multiple drivers)
  let dupCount = 0;
  for (const [key, drvs] of fpMap) {
    // Unique list of drivers
    const uniqueDrivers = [...new Set(drvs)];
    if (uniqueDrivers.length > 1) {
      const [mfr, pid] = key.split('|');
      error('GLOBAL', `TRUE COLLISION: FP '${mfr}' with '${pid}' exists in multiple drivers: ${uniqueDrivers.join(', ')}. SDK matches both! You MUST move this into a new combined hybrid category folder (e.g. switch_dimmer_custom) to prevent random routing!`);
      dupCount++;
    }
  }

  if (dupCount === 0) {
    console.log('  No true FP collisions found (mfr+pid).');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHECK 5: Flow cards have matching IDs
// ═══════════════════════════════════════════════════════════════════════════════
function checkFlowCards() {
  console.log('\n📋 Check 5: Flow card consistency...');

  const drivers = fs.readdirSync(DRIVERS_DIR).filter(d =>
    fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory()
  );

  for (const driver of drivers) {
    const flowFile = path.join(DRIVERS_DIR, driver, 'driver.flow.compose.json');
    const driverJs = path.join(DRIVERS_DIR, driver, 'driver.js');

    if (!fs.existsSync(flowFile) || !fs.existsSync(driverJs)) continue;

    try {
      const flow = JSON.parse(fs.readFileSync(flowFile, 'utf8'));
      const driverCode = fs.readFileSync(driverJs, 'utf8');

      // Check action cards
      const actions = flow.actions || [];
      for (const action of actions) {
        if (!driverCode.includes(action.id)) {
          warn(driver, `Flow action '${action.id}' defined but not referenced in driver.js`);
        }
      }

      // Check condition cards
      const conditions = flow.conditions || [];
      for (const condition of conditions) {
        if (!driverCode.includes(condition.id)) {
          warn(driver, `Flow condition '${condition.id}' defined but not referenced in driver.js`);
        }
      }
    } catch (e) { /* already reported */ }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHECK 6: HybridSwitchBase/PlugBase subclasses with defensive init wrapping
// v5.11.182: Root cause of "Driver Not Initialized" (Wiosenna_26, Rikjes)
// ═══════════════════════════════════════════════════════════════════════════════
function checkDefensiveInit() {
  console.log('\n📋 Check 6: Defensive init wrapping (register listeners on error)...');

  const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => {
    const deviceFile = path.join(DRIVERS_DIR, d, 'device.js');
    if (!fs.existsSync(deviceFile)) return false;
    const content = fs.readFileSync(deviceFile, 'utf8');
    return content.includes('HybridSwitchBase') || content.includes('HybridPlugBase');
  });

  for (const driver of drivers) {
    const deviceFile = path.join(DRIVERS_DIR, driver, 'device.js');
    const content = fs.readFileSync(deviceFile, 'utf8');

    // If it overrides onNodeInit, it must either:
    // 1. Call super.onNodeInit() (which now has defensive wrapping), or
    // 2. Register its own capability listeners
    if (content.includes('async onNodeInit')) {
      const hasSuper = content.includes('super.onNodeInit');
      const hasOwnListeners = content.includes('registerCapabilityListener');
      const hasZclOnly = content.includes('_initZclOnlyMode');

      if (!hasSuper && !hasOwnListeners && !hasZclOnly) {
        error(driver, 'Overrides onNodeInit without calling super.onNodeInit() or registering listeners directly');
      } else {
        ok(driver, 'Init chain properly handled');
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHECK 7: Endpoint-capability alignment for multi-gang devices
// Forum issue: onoff.2 must map to endpoint 2, onoff.gang3 to endpoint 3, etc.
// Without this, Homey SDK defaults all commands to EP1 or throws undefined
// ═══════════════════════════════════════════════════════════════════════════════
function checkEndpointAlignment() {
  console.log('\n📋 Check 7: Endpoint-capability alignment...');

  const drivers = fs.readdirSync(DRIVERS_DIR).filter(d =>
    fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory()
  );

  for (const driver of drivers) {
    const composeFile = path.join(DRIVERS_DIR, driver, 'driver.compose.json');
    if (!fs.existsSync(composeFile)) continue;

    try {
      const compose = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
      const capabilities = compose.capabilities || [];
      const endpoints = compose.zigbee?.endpoints || {};

      // Find multi-gang capabilities
      for (const cap of capabilities) {
        const gangMatch = cap.match(/\.(?:gang)?(\d+)$/);
        if (gangMatch) {
          const expectedEP = parseInt(gangMatch[1]);
          if (!endpoints[String(expectedEP)]) {
            warn(driver, `Capability '${cap}' implies EP${expectedEP} but no endpoint ${expectedEP} defined in zigbee.endpoints`);
          }
        }
      }
    } catch (e) { /* already reported */ }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUN ALL CHECKS
// ═══════════════════════════════════════════════════════════════════════════════
console.log('═══════════════════════════════════════════════════════════════');
console.log('  TUYA ZIGBEE DRIVER VALIDATOR v5.11.182');
console.log('  Based on forum reports + debugging discoveries');
console.log('═══════════════════════════════════════════════════════════════');

checkValidJSON();
checkSuperOnNodeInit();
checkMultiGangCapabilities();
checkDuplicateFingerprints();
checkFlowCards();
checkDefensiveInit();
checkEndpointAlignment();

console.log('\n═══════════════════════════════════════════════════════════════');
console.log(`  RESULTS: ${errors} errors, ${warnings} warnings`);
console.log('═══════════════════════════════════════════════════════════════');

process.exit(errors > 0 ? 1 : 0);
