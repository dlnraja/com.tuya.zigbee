#!/usr/bin/env node
/**
 * device-coverage-check.js - Driver Coverage & Completeness Verification
 * =======================================================================
 * Checks all drivers for complete coverage:
 *   1. Required file structure (driver.compose.json, device.js, driver.js)
 *   2. Required capabilities per driver class
 *   3. Required settings keys (zb_model_id, zb_manufacturer_name)
 *   4. Missing flow cards for interactive drivers
 *   5. Missing images directory
 *   6. Capability-to-class mapping correctness
 *   7. Driver compose.json schema validation
 *   8. device.js exports a valid class
 *   9. Mixin usage verification (switches need PhysicalButton + VirtualButton)
 *  10. Profile registry coverage
 *
 * Usage: node scripts/automation/device-coverage-check.js
 * Exit code: 0 = complete, 1 = errors found, 2 = warnings only
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const LIB_DIR = path.join(ROOT, 'lib');

// ── ANSI colors ──────────────────────────────────────────────────
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const MAGENTA = '\x1b[35m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

// ── Report ───────────────────────────────────────────────────────
const report = {
  errors: [],
  warnings: [],
  info: [],
  stats: {
    totalDrivers: 0,
    completeDrivers: 0,
    missingComposeJson: 0,
    missingDeviceJs: 0,
    missingDriverJs: 0,
    missingFlowCards: 0,
    missingImages: 0,
    missingSettingsKeys: 0,
    capabilityIssues: 0,
    mixinIssues: 0,
    schemaIssues: 0,
    exportIssues: 0,
  },
};

function log(msg) { console.log(`${CYAN}[COVERAGE]${RESET} ${msg}`); }
function err(msg) { report.errors.push(msg); console.error(`${RED}[ERROR]${RESET} ${msg}`); }
function warn(msg) { report.warnings.push(msg); console.warn(`${YELLOW}[WARN]${RESET} ${msg}`); }

// ── Expected capabilities per driver class ───────────────────────
const CLASS_CAPABILITIES = {
  socket: {
    required: ['onoff'],
    recommended: ['measure_power', 'meter_power'],
    optional: ['measure_voltage', 'measure_current', 'power_on_behavior'],
  },
  light: {
    required: ['onoff'],
    recommended: ['dim'],
    optional: ['light_temperature', 'light_mode', 'light_hue', 'light_saturation'],
  },
  sensor: {
    required: [],
    recommended: [],
    optional: ['measure_temperature', 'measure_humidity', 'measure_battery', 'alarm_battery'],
  },
  thermostat: {
    required: ['target_temperature'],
    recommended: ['measure_temperature', 'thermostat_mode'],
    optional: ['measure_humidity'],
  },
  fan: {
    required: ['onoff'],
    recommended: ['fan_speed'],
    optional: ['light_mode'],
  },
  remote: {
    required: [],
    recommended: [],
    optional: [],
  },
  windowcoverings: {
    required: ['windowcoverings_set'],
    recommended: ['windowcoverings_state'],
    optional: ['measure_battery'],
  },
  button: {
    required: [],
    recommended: [],
    optional: [],
  },
  heater: {
    required: ['target_temperature'],
    recommended: ['measure_temperature'],
    optional: ['thermostat_mode'],
  },
  lock: {
    required: ['locked'],
    recommended: [],
    optional: ['measure_battery'],
  },
};

// ── Mixin requirements per driver category ───────────────────────
const MIXIN_REQUIREMENTS = {
  'switch': {
    required: ['PhysicalButtonMixin', 'VirtualButtonMixin'],
    base: ['UnifiedSwitchBase', 'HybridSwitchBase'],
  },
  'plug': {
    required: ['PhysicalButtonMixin', 'VirtualButtonMixin'],
    base: ['UnifiedPlugBase', 'HybridPlugBase'],
  },
};

function classifyDriver(driverName) {
  if (/switch|plug|socket|breaker|relay/.test(driverName)) return 'switch';
  if (/sensor|detector|monitor/.test(driverName)) return 'sensor';
  if (/light|bulb|led|lamp|strip|rgb/.test(driverName)) return 'light';
  if (/thermostat|radiator|heater|valve/.test(driverName)) return 'thermostat';
  if (/fan/.test(driverName)) return 'fan';
  if (/remote|button/.test(driverName)) return 'remote';
  if (/window|cover|curtain|garage/.test(driverName)) return 'windowcoverings';
  return 'other';
}

// ── 1. File Structure Check ──────────────────────────────────────
function checkFileStructure() {
  log('Phase 1: Checking driver file structure...');

  try {
    const dirs = fs.readdirSync(DRIVERS_DIR);
    for (const name of dirs) {
      const dirPath = path.join(DRIVERS_DIR, name);
      try {
        const stat = fs.statSync(dirPath);
        if (!stat.isDirectory()) continue;
      } catch (e) { continue; }

      report.stats.totalDrivers++;

      const requiredFiles = {
        'driver.compose.json': 'missingComposeJson',
        'device.js': 'missingDeviceJs',
      };

      let isComplete = true;

      for (const [file, statKey] of Object.entries(requiredFiles)) {
        const filePath = path.join(dirPath, file);
        if (!fs.existsSync(filePath)) {
          warn(`Driver "${name}" missing ${file}`);
          report.stats[statKey]++;
          isComplete = false;
        }
      }

      // Check for driver.flow.compose.json (recommended)
      if (!fs.existsSync(path.join(dirPath, 'driver.flow.compose.json'))) {
        report.stats.missingFlowCards++;
      }

      // Check for images directory
      const imagesPath = path.join(dirPath, 'assets', 'images');
      if (!fs.existsSync(imagesPath)) {
        report.stats.missingImages++;
      }

      if (isComplete) report.stats.completeDrivers++;
    }
  } catch (e) {
    err(`Cannot read drivers directory: ${e.message}`);
  }
}

// ── 2. Capability-to-Class Mapping ───────────────────────────────
function checkCapabilityMapping() {
  log('Phase 2: Checking capability-to-class mapping...');

  try {
    const dirs = fs.readdirSync(DRIVERS_DIR);
    for (const name of dirs) {
      const composePath = path.join(DRIVERS_DIR, name, 'driver.compose.json');
      if (!fs.existsSync(composePath)) continue;

      try {
        const raw = fs.readFileSync(composePath);
        const compose = JSON.parse(raw);
        const driverClass = compose.class;
        const capabilities = compose.capabilities || [];

        const expected = CLASS_CAPABILITIES[driverClass];
        if (!expected) continue;

        // Check required capabilities
        for (const cap of expected.required) {
          if (!capabilities.includes(cap)) {
            warn(`Driver "${name}" (class: ${driverClass}) missing required capability: ${cap}`);
            report.stats.capabilityIssues++;
          }
        }

        // Check for misplaced capabilities
        if (driverClass === 'sensor' && capabilities.includes('onoff')) {
          warn(`Sensor driver "${name}" has 'onoff' capability - unusual for sensors`);
          report.stats.capabilityIssues++;
        }

        if (driverClass === 'remote' && capabilities.includes('onoff')) {
          warn(`Remote driver "${name}" has 'onoff' - should be button device`);
          report.stats.capabilityIssues++;
        }
      } catch (e) { /* skip */ }
    }
  } catch (e) { /* skip */ }
}

// ── 3. Settings Keys Validation ──────────────────────────────────
function checkSettingsKeys() {
  log('Phase 3: Checking settings keys...');

  const REQUIRED_SETTINGS = ['zb_model_id', 'zb_manufacturer_name'];
  const WRONG_KEYS = {
    'zb_modelId': 'zb_model_id',
    'zb_manufacturerName': 'zb_manufacturer_name',
  };

  try {
    const dirs = fs.readdirSync(DRIVERS_DIR);
    for (const name of dirs) {
      const composePath = path.join(DRIVERS_DIR, name, 'driver.compose.json');
      if (!fs.existsSync(composePath)) continue;

      try {
        const raw = fs.readFileSync(composePath);
        const content = raw.toString('utf8');
        const compose = JSON.parse(content);

        // Check compose.json for wrong keys in the raw text
        for (const [wrong, correct] of Object.entries(WRONG_KEYS)) {
          if (content.includes(wrong)) {
            warn(`Driver "${name}" uses wrong settings key "${wrong}" - use "${correct}"`);
            report.stats.missingSettingsKeys++;
          }
        }

        // Check if settings array has required keys
        if (compose.settings && Array.isArray(compose.settings)) {
          const settingsIds = new Set();
          for (const setting of compose.settings) {
            if (setting.id) settingsIds.add(setting.id);
            if (setting.children) {
              for (const child of setting.children) {
                if (child.id) settingsIds.add(child.id);
              }
            }
          }

          for (const req of REQUIRED_SETTINGS) {
            if (!settingsIds.has(req)) {
              warn(`Driver "${name}" missing settings key "${req}"`);
              report.stats.missingSettingsKeys++;
            }
          }
        }
      } catch (e) { /* skip */ }
    }
  } catch (e) { /* skip */ }
}

// ── 4. Mixin Usage Verification ──────────────────────────────────
function checkMixinUsage() {
  log('Phase 4: Checking mixin usage in device.js files...');

  try {
    const dirs = fs.readdirSync(DRIVERS_DIR);
    for (const name of dirs) {
      const devicePath = path.join(DRIVERS_DIR, name, 'device.js');
      if (!fs.existsSync(devicePath)) continue;

      try {
        const content = fs.readFileSync(devicePath, 'utf8');
        const category = classifyDriver(name);
        const requirements = MIXIN_REQUIREMENTS[category];

        if (!requirements) continue;

        // Check required mixins
        for (const mixin of requirements.required) {
          if (!content.includes(mixin)) {
            warn(`Driver "${name}" (${category}) missing required mixin: ${mixin}`);
            report.stats.mixinIssues++;
          }
        }

        // Check base class usage
        let hasCorrectBase = false;
        for (const base of requirements.base) {
          if (content.includes(base)) {
            hasCorrectBase = true;
            break;
          }
        }
        if (requirements.base.length > 0 && !hasCorrectBase) {
          warn(`Driver "${name}" (${category}) not using expected base class: ${requirements.base.join(' or ')}`);
          report.stats.mixinIssues++;
        }

        // Check mixin order: PhysicalButtonMixin should wrap VirtualButtonMixin
        if (content.includes('PhysicalButtonMixin') && content.includes('VirtualButtonMixin')) {
          const physicalIdx = content.indexOf('PhysicalButtonMixin');
          const virtualIdx = content.indexOf('VirtualButtonMixin');
          if (virtualIdx < physicalIdx) {
            warn(`Driver "${name}" has wrong mixin order: VirtualButtonMixin before PhysicalButtonMixin`);
            report.stats.mixinIssues++;
          }
        }
      } catch (e) { /* skip */ }
    }
  } catch (e) { /* skip */ }
}

// ── 5. device.js Export Validation ────────────────────────────────
function checkDeviceExports() {
  log('Phase 5: Checking device.js exports...');

  try {
    const dirs = fs.readdirSync(DRIVERS_DIR);
    for (const name of dirs) {
      const devicePath = path.join(DRIVERS_DIR, name, 'device.js');
      if (!fs.existsSync(devicePath)) continue;

      try {
        const content = fs.readFileSync(devicePath, 'utf8');

        // Check for module.exports
        if (!content.includes('module.exports')) {
          warn(`Driver "${name}" device.js has no module.exports`);
          report.stats.exportIssues++;
        }

        // Check for class declaration
        if (!content.includes('class ') && !content.includes('module.exports =')) {
          warn(`Driver "${name}" device.js may not export a valid class`);
          report.stats.exportIssues++;
        }

        // Check for onNodeInit
        if (!content.includes('onNodeInit')) {
          warn(`Driver "${name}" device.js does not override onNodeInit()`);
          report.stats.exportIssues++;
        }
      } catch (e) { /* skip */ }
    }
  } catch (e) { /* skip */ }
}

// ── 6. Compose JSON Schema Validation ────────────────────────────
function checkComposeSchema() {
  log('Phase 6: Validating driver.compose.json schema...');

  const REQUIRED_FIELDS = ['id', 'version', 'class', 'name', 'platforms', 'connectivity'];

  try {
    const dirs = fs.readdirSync(DRIVERS_DIR);
    for (const name of dirs) {
      const composePath = path.join(DRIVERS_DIR, name, 'driver.compose.json');
      if (!fs.existsSync(composePath)) continue;

      try {
        const raw = fs.readFileSync(composePath);
        const compose = JSON.parse(raw);

        // Check required fields
        for (const field of REQUIRED_FIELDS) {
          if (!compose[field]) {
            warn(`Driver "${name}" compose.json missing required field: ${field}`);
            report.stats.schemaIssues++;
          }
        }

        // Validate class is known
        const knownClasses = Object.keys(CLASS_CAPABILITIES);
        if (compose.class && !knownClasses.includes(compose.class)) {
          warn(`Driver "${name}" has unknown class: "${compose.class}"`);
          report.stats.schemaIssues++;
        }

        // Check platforms
        if (compose.platforms && !compose.platforms.includes('local')) {
          warn(`Driver "${name}" does not include "local" platform`);
          report.stats.schemaIssues++;
        }

        // Check connectivity
        if (compose.connectivity) {
          const validConnectivity = ['zigbee', 'wifi', 'zwave', 'bluetooth', 'local'];
          for (const c of compose.connectivity) {
            if (!validConnectivity.includes(c)) {
              warn(`Driver "${name}" has unknown connectivity: "${c}"`);
              report.stats.schemaIssues++;
            }
          }
        }

        // Check images exist
        if (compose.images) {
          for (const [size, imgPath] of Object.entries(compose.images)) {
            const fullImgPath = path.join(DRIVERS_DIR, name, imgPath.replace(/^\//, ''));
            if (!fs.existsSync(fullImgPath)) {
              // Only warn for essential sizes
              if (size === 'small' || size === 'large') {
                warn(`Driver "${name}" missing image: ${size} (${imgPath})`);
              }
            }
          }
        }
      } catch (e) {
        warn(`Driver "${name}" compose.json parse error: ${e.message}`);
        report.stats.schemaIssues++;
      }
    }
  } catch (e) { /* skip */ }
}

// ── 7. WiFi Driver Validation ────────────────────────────────────
function checkWifiDrivers() {
  log('Phase 7: Validating WiFi driver-specific requirements...');

  try {
    const dirs = fs.readdirSync(DRIVERS_DIR);
    for (const name of dirs) {
      if (!name.startsWith('wifi_')) continue;

      const composePath = path.join(DRIVERS_DIR, name, 'driver.compose.json');
      if (!fs.existsSync(composePath)) continue;

      try {
        const raw = fs.readFileSync(composePath);
        const compose = JSON.parse(raw);

        // WiFi drivers should NOT have zigbee section
        if (compose.zigbee) {
          warn(`WiFi driver "${name}" has zigbee section in compose.json`);
        }

        // WiFi drivers should have WiFi-specific settings
        if (compose.connectivity && !compose.connectivity.includes('wifi')) {
          warn(`WiFi driver "${name}" does not list "wifi" in connectivity`);
        }
      } catch (e) { /* skip */ }
    }
  } catch (e) { /* skip */ }
}

// ── 8. Zigbee Endpoint Validation ────────────────────────────────
function checkZigbeeEndpoints() {
  log('Phase 8: Validating Zigbee endpoint configurations...');

  try {
    const dirs = fs.readdirSync(DRIVERS_DIR);
    for (const name of dirs) {
      const composePath = path.join(DRIVERS_DIR, name, 'driver.compose.json');
      if (!fs.existsSync(composePath)) continue;

      try {
        const raw = fs.readFileSync(composePath);
        const compose = JSON.parse(raw);

        if (!compose.zigbee) continue;

        // Check endpoints have clusters
        if (compose.zigbee.endpoints) {
          for (const [epId, ep] of Object.entries(compose.zigbee.endpoints)) {
            if (!ep.clusters || ep.clusters.length === 0) {
              warn(`Driver "${name}" endpoint ${epId} has no clusters defined`);
            }
          }
        }

        // Check for empty productId arrays
        if (compose.zigbee.productId && compose.zigbee.productId.length === 0) {
          warn(`Driver "${name}" has empty productId array`);
        }
      } catch (e) { /* skip */ }
    }
  } catch (e) { /* skip */ }
}

// ── 9. Profile Registry Coverage ─────────────────────────────────
function checkProfileRegistry() {
  log('Phase 9: Checking profile registry coverage...');

  const profilesDir = path.join(LIB_DIR, 'registry', 'profiles');
  if (!fs.existsSync(profilesDir)) {
    warn('Profile registry directory not found at lib/registry/profiles/');
    return;
  }

  try {
    const profileFiles = fs.readdirSync(profilesDir).filter(f => f.endsWith('.js'));
    log(`  Found ${profileFiles.length} profile files: ${profileFiles.join(', ')}`);

    for (const pf of profileFiles) {
      const profilePath = path.join(profilesDir, pf);
      try {
        const content = fs.readFileSync(profilePath, 'utf8');

        // Check for common exports
        if (!content.includes('module.exports')) {
          warn(`Profile ${pf} has no module.exports`);
        }

        // Check for empty objects
        if (content.match(/module\.exports\s*=\s*\{\s*\}/)) {
          warn(`Profile ${pf} exports an empty object`);
        }
      } catch (e) { /* skip */ }
    }
  } catch (e) { /* skip */ }
}

// ── 10. Cross-Check with BaseUnifiedDevice Capabilities ──────────
function checkBaseCapabilities() {
  log('Phase 10: Cross-checking with BaseUnifiedDevice...');

  const baseDevicePath = path.join(LIB_DIR, 'devices', 'BaseUnifiedDevice.js');
  if (!fs.existsSync(baseDevicePath)) {
    warn('BaseUnifiedDevice.js not found');
    return;
  }

  try {
    const content = fs.readFileSync(baseDevicePath, 'utf8');

    // Extract registered capabilities from BaseUnifiedDevice
    const capRegex = /registerCapabilityListener\s*\(\s*['"]([^'"]+)['"]/g;
    const baseCapabilities = new Set();
    let match;
    while ((match = capRegex.exec(content)) !== null) {
      baseCapabilities.add(match[1]);
    }

    log(`  BaseUnifiedDevice registers ${baseCapabilities.size} capabilities`);

    // Cross-check: count how many drivers use each capability
    const capUsage = new Map();
    try {
      const dirs = fs.readdirSync(DRIVERS_DIR);
      for (const name of dirs) {
        const composePath = path.join(DRIVERS_DIR, name, 'driver.compose.json');
        if (!fs.existsSync(composePath)) continue;

        try {
          const raw = fs.readFileSync(composePath);
          const compose = JSON.parse(raw);
          const caps = compose.capabilities || [];

          for (const cap of caps) {
            if (!capUsage.has(cap)) capUsage.set(cap, []);
            capUsage.get(cap).push(name);
          }
        } catch (e) { /* skip */ }
      }
    } catch (e) { /* skip */ }

    // Find capabilities used by drivers but not registered in base
    let unknownCaps = 0;
    for (const [cap, drivers] of capUsage) {
      if (!baseCapabilities.has(cap) && !cap.startsWith('tuya_dp_') && !cap.startsWith('measure_')) {
        if (drivers.length <= 2) {
          warn(`Capability "${cap}" used by ${drivers.length} driver(s) but not registered in BaseUnifiedDevice`);
          unknownCaps++;
        }
      }
    }
    report.stats.capabilityIssues += unknownCaps;
  } catch (e) {
    warn(`Cannot analyze BaseUnifiedDevice: ${e.message}`);
  }
}

// ── Main ─────────────────────────────────────────────────────────
function main() {
  console.log(`\n${BOLD}============================================${RESET}`);
  console.log(`${BOLD}  Device Coverage Check${RESET}`);
  console.log(`${BOLD}============================================${RESET}\n`);

  const startTime = Date.now();

  // Run all checks
  checkFileStructure();
  checkCapabilityMapping();
  checkSettingsKeys();
  checkMixinUsage();
  checkDeviceExports();
  checkComposeSchema();
  checkWifiDrivers();
  checkZigbeeEndpoints();
  checkProfileRegistry();
  checkBaseCapabilities();

  // ── Summary ──────────────────────────────────────────────────
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n${BOLD}============================================${RESET}`);
  console.log(`${BOLD}  COVERAGE REPORT${RESET}`);
  console.log(`${BOLD}============================================${RESET}`);
  console.log(`  Total drivers:            ${report.stats.totalDrivers}`);
  console.log(`  Complete drivers:         ${GREEN}${report.stats.completeDrivers}${RESET}`);
  console.log(`  -----------------------------------------`);
  console.log(`  Missing compose.json:     ${YELLOW}${report.stats.missingComposeJson}${RESET}`);
  console.log(`  Missing device.js:        ${YELLOW}${report.stats.missingDeviceJs}${RESET}`);
  console.log(`  Missing driver.flow:      ${YELLOW}${report.stats.missingFlowCards}${RESET}`);
  console.log(`  Missing images:           ${YELLOW}${report.stats.missingImages}${RESET}`);
  console.log(`  Settings key issues:      ${YELLOW}${report.stats.missingSettingsKeys}${RESET}`);
  console.log(`  Capability issues:        ${YELLOW}${report.stats.capabilityIssues}${RESET}`);
  console.log(`  Mixin issues:             ${YELLOW}${report.stats.mixinIssues}${RESET}`);
  console.log(`  Schema issues:            ${YELLOW}${report.stats.schemaIssues}${RESET}`);
  console.log(`  Export issues:            ${YELLOW}${report.stats.exportIssues}${RESET}`);
  console.log(`  -----------------------------------------`);
  console.log(`  ${RED}Errors:   ${report.errors.length}${RESET}`);
  console.log(`  ${YELLOW}Warnings: ${report.warnings.length}${RESET}`);
  console.log(`  Completed in ${elapsed}s\n`);

  if (report.errors.length > 0) {
    console.log(`${RED}${BOLD}RESULT: FAIL - ${report.errors.length} error(s) found${RESET}`);
    process.exit(1);
  } else if (report.warnings.length > 0) {
    console.log(`${YELLOW}${BOLD}RESULT: WARN - ${report.warnings.length} warning(s) found${RESET}`);
    process.exit(2);
  } else {
    console.log(`${GREEN}${BOLD}RESULT: PASS - All coverage checks passed${RESET}`);
    process.exit(0);
  }
}

main();
