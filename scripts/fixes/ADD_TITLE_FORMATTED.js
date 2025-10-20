#!/usr/bin/env node
'use strict';

/**
 * ADD titleFormatted TO ALL FLOW TRIGGERS
 * 
 * SDK3 future requirement: Flow cards should have titleFormatted
 * This script automatically adds titleFormatted based on title and tokens
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_WITH_WARNINGS = [
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

function addTitleFormatted(trigger) {
  // Si titleFormatted existe déjà, skip
  if (trigger.titleFormatted) {
    return false;
  }

  // Créer titleFormatted basé sur les tokens
  const titleFormatted = {};
  
  for (const lang in trigger.title) {
    let formatted = trigger.title[lang];
    
    // Si le trigger a des tokens, ajouter les placeholders
    if (trigger.tokens && trigger.tokens.length > 0) {
      // Pour les boutons: "Button [[button]] [[action]]"
      const tokenNames = trigger.tokens.map(t => `[[${t.name}]]`).join(' ');
      formatted = `${formatted} ${tokenNames}`;
    }
    
    titleFormatted[lang] = formatted;
  }
  
  trigger.titleFormatted = titleFormatted;
  return true;
}

function processFlowFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const flow = JSON.parse(content);
    let modified = false;
    
    if (flow.triggers && Array.isArray(flow.triggers)) {
      for (const trigger of flow.triggers) {
        if (addTitleFormatted(trigger)) {
          console.log(`  ✅ Added titleFormatted to: ${trigger.id}`);
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
    console.error(`  ❌ Error processing ${filePath}:`, err.message);
    return 0;
  }
}

// Main execution
console.log('🔧 ADDING titleFormatted TO FLOW TRIGGERS\n');
console.log('SDK3 Future Requirement: Flow cards should have titleFormatted\n');
console.log('─'.repeat(60));

const driversPath = path.join(process.cwd(), 'drivers');
let fixedCount = 0;

for (const driverName of DRIVERS_WITH_WARNINGS) {
  const flowFile = path.join(driversPath, driverName, 'driver.flow.compose.json');
  
  if (fs.existsSync(flowFile)) {
    console.log(`\n📁 Processing: ${driverName}`);
    fixedCount += processFlowFile(flowFile);
  } else {
    console.log(`\n⚠️  Not found: ${driverName}/driver.flow.compose.json`);
  }
}

console.log('\n' + '─'.repeat(60));
console.log(`\n✅ COMPLETED: ${fixedCount} flow files modified`);
console.log('\nNext steps:');
console.log('1. Run: homey app validate --level publish');
console.log('2. Commit changes\n');

process.exit(0);
