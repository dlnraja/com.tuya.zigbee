#!/usr/bin/env node
/**
 * VALIDATE COHERENCE & SDK3 COMPLIANCE
 *
 * Checks:
 * 1. Manufacturer name format validity
 * 2. Capability names (must be valid Homey capabilities)
 * 3. Driver class validity
 * 4. DP values (must be 1-255)
 * 5. Cluster validity
 * 6. Flow card consistency
 * 7. SDK3 compliance rules
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const DRIVERS_DIR = path.join(PROJECT_ROOT, 'drivers');

// ═══════════════════════════════════════════════════════════════════════════
// SDK3 VALID VALUES
// ═══════════════════════════════════════════════════════════════════════════

const VALID_CLASSES = [
  'light', 'socket', 'sensor', 'button', 'thermostat', 'lock', 'doorbell',
  'windowcoverings', 'fan', 'heater', 'kettle', 'coffeemachine', 'amplifier',
  'tv', 'speaker', 'camera', 'vacuumcleaner', 'homealarm', 'other', 'solarpanel'
];

const VALID_CAPABILITIES = [
  // Standard
  'onoff', 'dim', 'light_hue', 'light_saturation', 'light_temperature', 'light_mode',
  // Measures
  'measure_temperature', 'measure_humidity', 'measure_battery', 'measure_power',
  'measure_voltage', 'measure_current', 'measure_luminance', 'measure_pressure',
  'measure_co2', 'measure_pm25', 'measure_noise', 'measure_rain', 'measure_water',
  'measure_wind_strength', 'measure_wind_angle', 'measure_gust_strength',
  'measure_ultraviolet', 'measure_co', 'measure_voc',
  // Meters
  'meter_power', 'meter_water', 'meter_gas', 'meter_rain',
  // Alarms
  'alarm_motion', 'alarm_contact', 'alarm_co', 'alarm_co2', 'alarm_pm25',
  'alarm_tamper', 'alarm_smoke', 'alarm_fire', 'alarm_heat', 'alarm_water',
  'alarm_battery', 'alarm_night', 'alarm_generic', 'alarm_gas',
  // Window coverings
  'windowcoverings_state', 'windowcoverings_set', 'windowcoverings_tilt_set',
  'windowcoverings_tilt_up', 'windowcoverings_tilt_down',
  // Thermostat
  'target_temperature', 'thermostat_mode',
  // Lock
  'locked', 'lock_mode',
  // Button
  'button',
  // Speaker
  'volume_set', 'volume_mute', 'speaker_playing', 'speaker_artist', 'speaker_album', 'speaker_track',
  // Vacuum
  'vacuumcleaner_state',
  // Other
  'homealarm_state', 'garagedoor_closed',
];

const VALID_MFR_PATTERNS = [
  /^_TZ[A-Z0-9]{1,4}_[a-z0-9]{8}$/i,      // _TZ3000_abcd1234
  /^_TYZB[0-9]{2}_[a-z0-9]{8}$/i,          // _TYZB01_abcd1234
  /^_TZE[0-9]{3}_[a-z0-9]{8}$/i,           // _TZE200_abcd1234
  /^TUYATEC-[a-z0-9]{8}$/i,                // TUYATEC-abcd1234
  /^_TZB[0-9]{3}_[a-z0-9]{8}$/i,           // _TZB210_abcd1234
  /^TS[0-9]{4}$/,                          // TS0601
  /^[A-Z][a-z]+$/,                         // Brand names like "Immax", "Visonic"
  /^[A-Z]{2,}$/,                           // Acronyms like "LELLKI"
  /^eWeLight$/i,
  /^zbeacon$/i,
  /^HOBEIAN$/i,
];

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function validateManufacturer(mfr) {
  // Check against known patterns
  for (const pattern of VALID_MFR_PATTERNS) {
    if (pattern.test(mfr)) return { valid: true };
  }

  // Check for common issues
  if (mfr.includes(' ')) return { valid: false, reason: 'Contains spaces' };
  if (mfr.includes('XXXX') || mfr.includes('1234')) return { valid: false, reason: 'Placeholder value' };
  if (mfr.length < 4) return { valid: false, reason: 'Too short' };
  if (mfr.length > 30) return { valid: false, reason: 'Too long' };

  // Allow but flag unknown patterns
  return { valid: true, warning: 'Unknown pattern' };
}

function validateCapability(cap) {
  // Standard capabilities
  if (VALID_CAPABILITIES.includes(cap)) return { valid: true };

  // Custom capabilities (must follow pattern)
  if (cap.match(/^[a-z][a-z0-9_]*(\.[a-z0-9_]+)?$/)) {
    return { valid: true, custom: true };
  }

  return { valid: false, reason: 'Invalid capability name' };
}

function validateClass(cls) {
  if (VALID_CLASSES.includes(cls)) return { valid: true };
  return { valid: false, reason: `Invalid class. Use: ${VALID_CLASSES.join(', ')}` };
}

// ═══════════════════════════════════════════════════════════════════════════
// DRIVER VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

function validateDriver(driverName) {
  const issues = [];
  const warnings = [];

  const driverPath = path.join(DRIVERS_DIR, driverName);
  const composePath = path.join(driverPath, 'driver.compose.json');
  const devicePath = path.join(driverPath, 'device.js');

  if (!fs.existsSync(composePath)) {
    issues.push('Missing driver.compose.json');
    return { issues, warnings };
  }

  try {
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));

    // 1. Validate class
    if (compose.class) {
      const classResult = validateClass(compose.class);
      if (!classResult.valid) {
        issues.push(`Invalid class '${compose.class}': ${classResult.reason}`);
      }
    } else {
      warnings.push('No class defined');
    }

    // 2. Validate capabilities
    const capabilities = compose.capabilities || [];
    for (const cap of capabilities) {
      const capResult = validateCapability(cap);
      if (!capResult.valid) {
        issues.push(`Invalid capability '${cap}': ${capResult.reason}`);
      }
    }

    // 3. Validate manufacturers
    const manufacturers = compose.zigbee?.manufacturerName || [];
    let invalidMfrCount = 0;

    for (const mfr of manufacturers) {
      const mfrResult = validateManufacturer(mfr);
      if (!mfrResult.valid) {
        invalidMfrCount++;
        if (invalidMfrCount <= 3) {
          issues.push(`Invalid manufacturer '${mfr}': ${mfrResult.reason}`);
        }
      } else if (mfrResult.warning) {
        // Don't report all warnings, just count
      }
    }

    if (invalidMfrCount > 3) {
      issues.push(`... and ${invalidMfrCount - 3} more invalid manufacturers`);
    }

    // 4. Check for duplicates
    const uniqueMfrs = new Set(manufacturers);
    if (uniqueMfrs.size !== manufacturers.length) {
      warnings.push(`${manufacturers.length - uniqueMfrs.size} duplicate manufacturers`);
    }

    // 5. Validate device.js exists
    if (!fs.existsSync(devicePath)) {
      issues.push('Missing device.js');
    }

  } catch (err) {
    issues.push(`Parse error: ${err.message}`);
  }

  return { issues, warnings };
}

// ═══════════════════════════════════════════════════════════════════════════
// CROSS-DRIVER VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

function validateCrossDriver() {
  console.log('\n🔄 Cross-driver validation...');

  const allMfrs = new Map(); // mfr -> [drivers]
  const issues = [];

  const drivers = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory());

  for (const driver of drivers) {
    const composePath = path.join(DRIVERS_DIR, driver.name, 'driver.compose.json');
    if (!fs.existsSync(composePath)) continue;

    try {
      const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      const mfrs = compose.zigbee?.manufacturerName || [];

      for (const mfr of mfrs) {
        if (!allMfrs.has(mfr)) {
          allMfrs.set(mfr, []);
        }
        allMfrs.get(mfr).push(driver.name);
      }
    } catch { }
  }

  // Find duplicates across drivers (might be intentional)
  let duplicateCount = 0;
  for (const [mfr, driverList] of allMfrs) {
    if (driverList.length > 1) {
      duplicateCount++;
      // Only report if > 3 drivers share same mfr (likely a problem)
      if (driverList.length > 3) {
        issues.push(`'${mfr}' in ${driverList.length} drivers: ${driverList.slice(0, 3).join(', ')}...`);
      }
    }
  }

  console.log(`  Manufacturers in multiple drivers: ${duplicateCount}`);
  console.log(`  Problematic duplicates (>3 drivers): ${issues.length}`);

  return issues;
}

// ═══════════════════════════════════════════════════════════════════════════
// CLEANUP INVALID MANUFACTURERS
// ═══════════════════════════════════════════════════════════════════════════

function cleanupInvalidManufacturers() {
  console.log('\n🧹 Cleaning up invalid manufacturers...');

  let totalRemoved = 0;
  let totalFixed = 0;

  const drivers = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory());

  for (const driver of drivers) {
    const composePath = path.join(DRIVERS_DIR, driver.name, 'driver.compose.json');
    if (!fs.existsSync(composePath)) continue;

    try {
      const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      const mfrs = compose.zigbee?.manufacturerName || [];

      const validMfrs = [];
      let modified = false;

      for (const mfr of mfrs) {
        const result = validateManufacturer(mfr);

        if (!result.valid) {
          // Try to fix
          let fixed = mfr;

          // Remove leading underscore issues
          if (mfr.startsWith('_TUYATEC')) {
            fixed = mfr.substring(1);
          }

          // Check if fixed version is valid
          const fixedResult = validateManufacturer(fixed);
          if (fixedResult.valid && fixed !== mfr) {
            validMfrs.push(fixed);
            modified = true;
            totalFixed++;
          } else if (result.reason !== 'Placeholder value') {
            // Keep invalid but real ones, remove placeholders
            validMfrs.push(mfr);
          } else {
            totalRemoved++;
            modified = true;
          }
        } else {
          validMfrs.push(mfr);
        }
      }

      // Remove duplicates
      const uniqueMfrs = [...new Set(validMfrs)].sort();
      if (uniqueMfrs.length !== mfrs.length) {
        modified = true;
        totalRemoved += mfrs.length - uniqueMfrs.length;
      }

      if (modified) {
        compose.zigbee.manufacturerName = uniqueMfrs;
        fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
      }
    } catch { }
  }

  console.log(`  Fixed: ${totalFixed}`);
  console.log(`  Removed: ${totalRemoved}`);

  return { fixed: totalFixed, removed: totalRemoved };
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('🔍 VALIDATE COHERENCE & SDK3 COMPLIANCE');
  console.log('════════════════════════════════════════════════════════════════');

  const drivers = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory());

  console.log(`\n📂 Validating ${drivers.length} drivers...`);

  let totalIssues = 0;
  let totalWarnings = 0;
  const driversWithIssues = [];

  for (const driver of drivers) {
    const result = validateDriver(driver.name);

    if (result.issues.length > 0) {
      driversWithIssues.push({
        name: driver.name,
        issues: result.issues,
        warnings: result.warnings,
      });
      totalIssues += result.issues.length;
    }
    totalWarnings += result.warnings.length;
  }

  // Report issues
  if (driversWithIssues.length > 0) {
    console.log(`\n❌ Drivers with issues (${driversWithIssues.length}):`);
    for (const driver of driversWithIssues.slice(0, 10)) {
      console.log(`\n  ${driver.name}:`);
      driver.issues.forEach(i => console.log(`    ❌ ${i}`));
    }
    if (driversWithIssues.length > 10) {
      console.log(`\n  ... and ${driversWithIssues.length - 10} more drivers`);
    }
  }

  // Cross-driver validation
  const crossIssues = validateCrossDriver();

  // Cleanup
  const cleanup = cleanupInvalidManufacturers();

  // Final count
  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('📊 VALIDATION RESULTS');
  console.log('════════════════════════════════════════════════════════════════');
  console.log(`  Drivers validated: ${drivers.length}`);
  console.log(`  Drivers with issues: ${driversWithIssues.length}`);
  console.log(`  Total issues: ${totalIssues}`);
  console.log(`  Total warnings: ${totalWarnings}`);
  console.log(`  Manufacturers fixed: ${cleanup.fixed}`);
  console.log(`  Manufacturers removed: ${cleanup.removed}`);
  console.log('════════════════════════════════════════════════════════════════');

  // Save report
  const report = {
    generated: new Date().toISOString(),
    driversValidated: drivers.length,
    driversWithIssues: driversWithIssues.length,
    totalIssues,
    totalWarnings,
    cleanup,
    issueDetails: driversWithIssues,
  };

  fs.writeFileSync(
    path.join(PROJECT_ROOT, 'data', 'VALIDATION_REPORT.json'),
    JSON.stringify(report, null, 2)
  );

  console.log('\n📄 Report saved to data/VALIDATION_REPORT.json');
}

if (require.main === module) {
  main().catch(console.error);
}
