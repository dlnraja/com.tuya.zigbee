#!/usr/bin/env node
'use strict';

/**
 * FIX GOOGLE ANTIGRAVITY DAMAGE
 * Repair systematic errors introduced by automated refactoring
 *
 * Errors fixed:
 * 1. Missing catch/finally clauses
 * 2. Await outside async function
 * 3. Indentation errors
 * 4. Duplicate keys
 * 5. CRLF line endings
 */

const fs = require('fs');
const path = require('path');

// ========================================
// CONFIGURATION
// ========================================

const ERRORS = {
  MISSING_CATCH: [
    'drivers/air_quality_comprehensive/device.js',
    'drivers/air_quality_pm25/device.js',
    'drivers/climate_monitor_co2/device.js',
    'drivers/climate_sensor_temp_humidity_advanced/device.js',
    'drivers/humidity_controller/device.js',
    'drivers/motion_sensor_multi/device.js',
    'drivers/motion_sensor_pir_radar/device.js',
    'drivers/radiator_valve/device.js',
    'drivers/smoke_detector_climate/device.js',
    'drivers/smoke_detector_temp_humidity/device.js'
  ],
  AWAIT_OUTSIDE_ASYNC: [
    'drivers/contact_sensor/device.js',
    'drivers/contact_sensor_basic/device.js',
    'drivers/contact_sensor_multipurpose/device.js',
    'drivers/contact_sensor_vibration/device.js',
    'drivers/door_controller/device.js',
    'drivers/doorbell/device.js',
    'drivers/doorbell_camera/device.js',
    'drivers/garage_door_controller/device.js',
    'drivers/gas_detector/device.js',
    'drivers/gas_sensor/device.js',
    'drivers/led_strip_outdoor_rgb/device.js',
    'drivers/light_controller_outdoor/device.js',
    'drivers/lock_smart_basic/device.js',
    'drivers/motion_sensor/device.js',
    'drivers/motion_sensor_mmwave/device.js',
    'drivers/motion_sensor_outdoor/device.js',
    'drivers/motion_sensor_pir/device.js',
    'drivers/motion_sensor_pir_advanced/device.js',
    'drivers/motion_sensor_radar_advanced/device.js',
    'drivers/motion_sensor_radar_mmwave/device.js',
    'drivers/plug_outdoor/device.js',
    'drivers/siren/device.js',
    'drivers/siren_outdoor/device.js',
    'drivers/smoke_detector_advanced/device.js'
  ],
  UNEXPECTED_TOKEN: [
    'drivers/button_wireless/device.js',
    'drivers/climate_monitor/device.js',
    'drivers/curtain_motor/device.js',
    'drivers/doorbell_button/device.js',
    'drivers/hvac_air_conditioner/device.js',
    'drivers/hvac_dehumidifier/device.js',
    'drivers/radiator_valve_smart/device.js',
    'drivers/scene_controller_wireless/device.js',
    'drivers/switch_1gang/device.js',
    'drivers/switch_2gang/device.js',
    'drivers/switch_2gang_alt/device.js',
    'drivers/switch_3gang/device.js',
    'drivers/switch_4gang/device.js'
  ]
};

// ========================================
// FIX FUNCTIONS
// ========================================

/**
 * Fix: Missing catch or finally clause
 * Pattern: try { ... } without catch/finally
 */
function fixMissingCatch(content) {
  let fixed = content;

  // Pattern: try { ... } followed by next statement without catch
  // Add: catch (err) { this.error(err); }

  const tryBlockRegex = /(try\s*\{[^}]*\}\s*)(\n\s*)(async\s+\w+|\/\*|\/\/|$)/g;

  fixed = fixed.replace(tryBlockRegex, (match, tryBlock, whitespace, next) => {
    // Check if catch already exists
    if (match.includes('catch')) return match;

    return `${tryBlock} catch (err) { this.error(err); }\n${whitespace}${next}`;
  });

  return fixed;
}

/**
 * Fix: await outside async function
 * Wrap listeners in async
 */
function fixAwaitOutsideAsync(content) {
  let fixed = content;

  // Pattern: IAS Zone listener without async
  const iasListenerRegex = /(this\.zclNode\.endpoints\[\d+\]\.clusters\.iasZone\.on\('zoneStatusChangeNotification',\s*)(\([^)]*\)\s*=>\s*\{)/g;

  fixed = fixed.replace(iasListenerRegex, (match, before, arrow) => {
    if (arrow.includes('async')) return match;
    return `${before}async ${arrow}`;
  });

  return fixed;
}

/**
 * Fix: Unexpected token (syntax errors)
 * Common patterns from lint report
 */
function fixUnexpectedToken(content, filename) {
  let fixed = content;

  // Pattern 1: Missing closing parentheses
  if (filename.includes('switch_') || filename.includes('curtain_')) {
    // Specific fixes based on context
    fixed = fixed.replace(/\.catch\(err => this\.error\(err\)\)\s*\)/g, '.catch(err => this.error(err))');
  }

  // Pattern 2: Extra parentheses in hvac files
  if (filename.includes('hvac_')) {
    fixed = fixed.replace(/\(\s*\)\s*\)/g, ')');
  }

  return fixed;
}

/**
 * Fix: Duplicate keys (reportParser)
 */
function fixDuplicateKeys(content) {
  let fixed = content;

  // Find duplicate reportParser in capability config
  const lines = fixed.split('\n');
  const seen = new Set();
  const result = [];

  let inCapabilityConfig = false;

  for (const line of lines) {
    if (line.includes('registerCapability')) {
      inCapabilityConfig = true;
      seen.clear();
    }

    if (inCapabilityConfig && line.includes('reportParser:')) {
      if (seen.has('reportParser')) {
        // Skip duplicate
        continue;
      }
      seen.add('reportParser');
    }

    if (inCapabilityConfig && line.includes('});')) {
      inCapabilityConfig = false;
    }

    result.push(line);
  }

  return result.join('\n');
}

/**
 * Fix: CRLF line endings
 */
function fixLineEndings(content) {
  return content.replace(/\r\n/g, '\n');
}

/**
 * Fix: Indentation errors (2-space standard)
 */
function fixIndentation(content) {
  const lines = content.split('\n');
  let level = 0;
  const result = [];

  for (let line of lines) {
    const trimmed = line.trim();

    // Decrease level before closing braces
    if (trimmed.startsWith('}') || trimmed.startsWith(']') || trimmed.startsWith(')')) {
      level = Math.max(0, level - 1);
    }

    // Apply indentation (only if line has content)
    if (trimmed) {
      result.push(' '.repeat(level * 2) + trimmed);
    } else {
      result.push('');
    }

    // Increase level after opening braces
    if (trimmed.endsWith('{') || trimmed.endsWith('[') || trimmed.endsWith('(')) {
      level++;
    }

    // Handle special cases
    if (trimmed === '};' || trimmed === ');') {
      level = Math.max(0, level - 1);
    }
  }

  return result.join('\n');
}

// ========================================
// MAIN EXECUTION
// ========================================

async function main() {
  console.log('🔧 FIXING GOOGLE ANTIGRAVITY DAMAGE\n');

  const baseDir = path.join(__dirname, '..');
  let fixedCount = 0;
  let errorCount = 0;

  // 1. Fix missing catch/finally
  console.log('1️⃣ Fixing missing catch/finally clauses...');
  for (const file of ERRORS.MISSING_CATCH) {
    const filePath = path.join(baseDir, file);
    try {
      if (!fs.existsSync(filePath)) {
        console.log(`   ⏭️  Skip: ${file} (not found)`);
        continue;
      }

      let content = fs.readFileSync(filePath, 'utf8');
      const fixed = fixMissingCatch(content);

      if (fixed !== content) {
        fs.writeFileSync(filePath, fixed, 'utf8');
        console.log(`   ✅ Fixed: ${file}`);
        fixedCount++;
      } else {
        console.log(`   ⏭️  Skip: ${file} (no changes)`);
      }
    } catch (err) {
      console.error(`   ❌ Error: ${file} - ${err.message}`);
      errorCount++;
    }
  }

  // 2. Fix await outside async
  console.log('\n2️⃣ Fixing await outside async...');
  for (const file of ERRORS.AWAIT_OUTSIDE_ASYNC) {
    const filePath = path.join(baseDir, file);
    try {
      if (!fs.existsSync(filePath)) {
        console.log(`   ⏭️  Skip: ${file} (not found)`);
        continue;
      }

      let content = fs.readFileSync(filePath, 'utf8');
      const fixed = fixAwaitOutsideAsync(content);

      if (fixed !== content) {
        fs.writeFileSync(filePath, fixed, 'utf8');
        console.log(`   ✅ Fixed: ${file}`);
        fixedCount++;
      } else {
        console.log(`   ⏭️  Skip: ${file} (no changes)`);
      }
    } catch (err) {
      console.error(`   ❌ Error: ${file} - ${err.message}`);
      errorCount++;
    }
  }

  // 3. Fix unexpected tokens
  console.log('\n3️⃣ Fixing unexpected tokens...');
  for (const file of ERRORS.UNEXPECTED_TOKEN) {
    const filePath = path.join(baseDir, file);
    try {
      if (!fs.existsSync(filePath)) {
        console.log(`   ⏭️  Skip: ${file} (not found)`);
        continue;
      }

      let content = fs.readFileSync(filePath, 'utf8');
      const fixed = fixUnexpectedToken(content, file);

      if (fixed !== content) {
        fs.writeFileSync(filePath, fixed, 'utf8');
        console.log(`   ✅ Fixed: ${file}`);
        fixedCount++;
      } else {
        console.log(`   ⏭️  Skip: ${file} (no changes)`);
      }
    } catch (err) {
      console.error(`   ❌ Error: ${file} - ${err.message}`);
      errorCount++;
    }
  }

  // 4. Fix duplicate keys
  console.log('\n4️⃣ Fixing duplicate keys...');
  const duplicateFiles = [
    'drivers/button_shortcut/device.js',
    'drivers/sound_controller/device.js'
  ];

  for (const file of duplicateFiles) {
    const filePath = path.join(baseDir, file);
    try {
      if (!fs.existsSync(filePath)) continue;

      let content = fs.readFileSync(filePath, 'utf8');
      const fixed = fixDuplicateKeys(content);

      if (fixed !== content) {
        fs.writeFileSync(filePath, fixed, 'utf8');
        console.log(`   ✅ Fixed: ${file}`);
        fixedCount++;
      }
    } catch (err) {
      console.error(`   ❌ Error: ${file} - ${err.message}`);
      errorCount++;
    }
  }

  // 5. Fix CRLF line endings
  console.log('\n5️⃣ Fixing CRLF line endings...');
  const crlfFiles = [
    'drivers/switch_basic_2gang_usb/device.js',
    'drivers/switch_generic_3gang/device.js'
  ];

  for (const file of crlfFiles) {
    const filePath = path.join(baseDir, file);
    try {
      if (!fs.existsSync(filePath)) continue;

      let content = fs.readFileSync(filePath, 'utf8');
      const fixed = fixLineEndings(content);

      if (fixed !== content) {
        fs.writeFileSync(filePath, fixed, 'utf8');
        console.log(`   ✅ Fixed: ${file}`);
        fixedCount++;
      }
    } catch (err) {
      console.error(`   ❌ Error: ${file} - ${err.message}`);
      errorCount++;
    }
  }

  // SUMMARY
  console.log('\n' + '='.repeat(50));
  console.log('📊 SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Files fixed: ${fixedCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log('\n💡 Run "npm run lint" to verify fixes\n');
}

main().catch(console.error);
