#!/usr/bin/env node
'use strict';

/**
 * REMOVE INVALID titleFormatted
 * 
 * Les warnings titleFormatted sont NON-BLOQUANTS
 * On les supprime pour éviter l'erreur de validation Invalid [[button]]
 */

const fs = require('fs');
const path = require('path');

const DRIVERS = [
  'wireless_switch_cr2032',
  'wireless_switch_1gang_cr2032',
  'wireless_switch_2gang_cr2032',
  'wireless_switch_3gang_cr2032',
  'wireless_switch_4gang_cr2032',
  'wireless_switch_4gang_cr2450',
  'wireless_switch_5gang_cr2032',
  'wireless_switch_6gang_cr2032',
  'wireless_scene_controller_4button_battery'
];

function processFlowFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const flow = JSON.parse(content);
    let modified = false;
    
    if (flow.triggers && Array.isArray(flow.triggers)) {
      for (const trigger of flow.triggers) {
        if (trigger.titleFormatted) {
          delete trigger.titleFormatted;
          console.log(`  ✅ Removed titleFormatted from: ${trigger.id}`);
          modified = true;
        }
      }
    }
    
    if (modified) {
      fs.writeFileSync(filePath, JSON.stringify(flow, null, 2) + '\n', 'utf8');
      return 1;
    }
    return 0;
  } catch (err) {
    console.error(`  ❌ Error: ${err.message}`);
    return 0;
  }
}

console.log('🔧 REMOVING INVALID titleFormatted\n');
console.log('Warnings are non-blocking, removing to avoid validation errors\n');
console.log('─'.repeat(60));

const driversPath = path.join(process.cwd(), 'drivers');
let fixedCount = 0;

for (const driverName of DRIVERS) {
  const flowFile = path.join(driversPath, driverName, 'driver.flow.compose.json');
  
  if (fs.existsSync(flowFile)) {
    console.log(`\n📁 ${driverName}`);
    fixedCount += processFlowFile(flowFile);
  }
}

console.log('\n' + '─'.repeat(60));
console.log(`\n✅ COMPLETED: ${fixedCount} files cleaned`);
console.log('\nValidation warnings are non-blocking and can be ignored.\n');

process.exit(0);
