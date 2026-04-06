#!/usr/bin/env node
'use strict';

/**
 * Tuya Magic Spell Validator (v1.0.0)
 * 
 * Ensures that all HybridSwitch and HybridPlug subclasses correctly implement 
 * the onNodeInit super call to trigger the 'Tuya Magic Spell' (ZCL wake-up).
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, 'drivers');

function main() {
  console.log('=== 🛠️ Tuya Magic Spell & SDK v3 Validation Audit ===');
  
  const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => {
    const p = path.join(DRIVERS_DIR, d, 'device.js');
    return fs.existsSync(p);
  });

  let errors = 0;
  let warnings = 0;

  for (const d of drivers) {
    const devicePath = path.join(DRIVERS_DIR, d, 'device.js');
    const content = fs.readFileSync(devicePath, 'utf8');

    // 1. Check for Hybrid Inheritance
    const isHybrid = /extends\s+Hybrid(Switch|Plug)Base/.test(content);
    if (!isHybrid) continue;

    // 2. Check for onNodeInit implementation
    if (/onNodeInit\s*\(\)\s*\{/.test(content)) {
      // Must call super.onNodeInit()
      if (!/super\.onNodeInit\s*\(\)/.test(content)) {
        console.error(`❌ [${d}] MISSING super.onNodeInit()! This breaks the Tuya Magic Spell (ZCL reporting).`);
        errors++;
      }
    }

    // 3. SECONARY: Check for safeSetCapability usage
    if (/this\.setCapabilityValue\s*\(/.test(content) && !content.includes('_safeSetCapability')) {
      console.warn(`⚠️ [${d}] Using raw setCapabilityValue. Should use _safeSetCapability for throttling/calibration.`);
      warnings++;
    }

    // 4. Energy Calibration Settings Audit
    const composePath = path.join(DRIVERS_DIR, d, 'driver.compose.json');
    if (fs.existsSync(composePath)) {
      const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      const caps = compose.capabilities || [];
      if (caps.includes('measure_power') || caps.includes('measure_current')) {
        const settingsRaw = fs.readFileSync(composePath, 'utf8');
        if (!settingsRaw.includes('current_scale') && !settingsRaw.includes('current_multiplier')) {
          console.error(`❌ [${d}] Energy MONITORING detected but no "current_scale" setting found! User won't be able to fix scaling (Issue #197).`);
          errors++;
        }
      }
    }
  }

  console.log('\n--- Result ---');
  console.log(`Errors: ${errors}`);
  console.log(`Warnings: ${warnings}`);

  if (errors > 0) {
    process.exit(1);
  }
}

main();
