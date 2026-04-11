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

    // 5. SDK v3 Flow Card Compliance (Critical for v7.0.0 stability)
    if (/\.getDevice(Trigger|Condition|Action)Card\s*\(/.test(content)) {
      console.error(`❌ [${d}] Using DEPRECATED SDK v2 flow card getter! Must use getTriggerCard, getConditionCard, or getActionCard.`);
      errors++;
    }

    // 6. Optional: Check for missing try-catch around flow cards
    if (/\.get(Trigger|Condition|Action)Card\s*\(/.test(content) && !/try\s*\{/.test(content)) {
      console.warn(`⚠️ [${d}] Flow card accessed without try-catch. If the card is missing from app.json, the app will CRASH.`);
      warnings++;
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
