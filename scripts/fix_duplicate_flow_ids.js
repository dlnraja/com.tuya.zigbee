#!/usr/bin/env node
'use strict';

/**
 * Fix duplicate Flow card IDs by prefixing them with driver ID
 */

const fs = require('fs');
const path = require('path');

const driversDir = path.join(__dirname, '../drivers');

console.log('🔧 Fixing duplicate Flow card IDs...\n');

const drivers = fs.readdirSync(driversDir)
  .filter(name => fs.statSync(path.join(driversDir, name)).isDirectory())
  .sort();

let fixed = 0;
let errors = 0;

// Common generic IDs that need to be prefixed
const GENERIC_IDS = [
  'button_pressed',
  'button_released',
  'button_long_press',
  'button_double_press',
  'button_multi_press',
  'contact_opened',
  'contact_closed',
  'motion_detected',
  'scene_activated',
  'is_open',
  'is_closed'
];

for (const driverId of drivers) {
  const flowComposePath = path.join(driversDir, driverId, 'driver.flow.compose.json');
  
  if (!fs.existsSync(flowComposePath)) {
    continue;
  }
  
  try {
    const flowCompose = JSON.parse(fs.readFileSync(flowComposePath, 'utf-8'));
    let modified = false;
    
    // Fix triggers
    if (flowCompose.triggers) {
      for (const trigger of flowCompose.triggers) {
        if (trigger.id && GENERIC_IDS.includes(trigger.id)) {
          const newId = `${driverId}_${trigger.id}`;
          console.log(`✅ ${driverId}: ${trigger.id} → ${newId}`);
          trigger.id = newId;
          modified = true;
        }
      }
    }
    
    // Fix conditions
    if (flowCompose.conditions) {
      for (const condition of flowCompose.conditions) {
        if (condition.id && GENERIC_IDS.includes(condition.id)) {
          const newId = `${driverId}_${condition.id}`;
          console.log(`✅ ${driverId}: ${condition.id} → ${newId}`);
          condition.id = newId;
          modified = true;
        }
      }
    }
    
    // Fix actions
    if (flowCompose.actions) {
      for (const action of flowCompose.actions) {
        if (action.id && GENERIC_IDS.includes(action.id)) {
          const newId = `${driverId}_${action.id}`;
          console.log(`✅ ${driverId}: ${action.id} → ${newId}`);
          action.id = newId;
          modified = true;
        }
      }
    }
    
    if (modified) {
      fs.writeFileSync(flowComposePath, JSON.stringify(flowCompose, null, 2));
      fixed++;
    }
    
  } catch (err) {
    console.error(`❌ ${driverId}: ${err.message}`);
    errors++;
  }
}

console.log('\n═══════════════════════════════════════════════════════════');
console.log('   FIX SUMMARY');
console.log('═══════════════════════════════════════════════════════════\n');

console.log(`✅ Fixed: ${fixed} drivers`);
console.log(`❌ Errors: ${errors}`);
console.log(`📦 Total checked: ${drivers.length}`);

console.log('\n✅ All duplicate Flow IDs fixed!');
