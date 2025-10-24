#!/usr/bin/env node
'use strict';

/**
 * FIX FLOW CARD WARNINGS
 * 
 * Adds titleFormatted to all action flow cards that are missing it
 * Ensures proper driver ID prefixes to avoid "cannot get device by id" errors
 */

const fs = require('fs');
const path = require('path');

const driversDir = path.join(__dirname, '../drivers');

console.log('🔧 Fixing Flow Card Warnings and Prefixes...\n');

let fixed = 0;
let prefixFixed = 0;

const drivers = fs.readdirSync(driversDir)
  .filter(name => fs.statSync(path.join(driversDir, name)).isDirectory())
  .sort();

for (const driverId of drivers) {
  const flowPath = path.join(driversDir, driverId, 'driver.flow.compose.json');
  
  if (!fs.existsSync(flowPath)) continue;
  
  try {
    const flows = JSON.parse(fs.readFileSync(flowPath, 'utf-8'));
    let modified = false;
    
    // Fix actions with missing titleFormatted
    if (flows.actions) {
      for (const action of flows.actions) {
        // Check if ID has correct prefix
        if (!action.id.startsWith(driverId + '_')) {
          console.log(`⚠️  ${driverId}: Action ID missing prefix: ${action.id}`);
          action.id = `${driverId}_${action.id}`;
          prefixFixed++;
          modified = true;
        }
        
        // Add titleFormatted for actions with args
        if (action.args && action.args.length > 0 && !action.titleFormatted) {
          // Generate titleFormatted based on action type
          if (action.id.includes('set_dim')) {
            action.titleFormatted = {
              en: "Set brightness to [[brightness]]%",
              fr: "Régler la luminosité à [[brightness]]%"
            };
          } else if (action.id.includes('set_target_temperature')) {
            action.titleFormatted = {
              en: "Set temperature to [[temperature]]°C",
              fr: "Régler la température à [[temperature]]°C"
            };
          } else if (action.id.includes('set_windowcoverings')) {
            action.titleFormatted = {
              en: "Set position to [[position]]%",
              fr: "Régler la position à [[position]]%"
            };
          } else {
            // Generic titleFormatted for other actions with args
            const argName = action.args[0].name;
            action.titleFormatted = {
              en: `Set ${argName} to [[${argName}]]`,
              fr: `Régler ${argName} à [[${argName}]]`
            };
          }
          
          modified = true;
          fixed++;
        }
      }
    }
    
    // Fix triggers with missing prefixes
    if (flows.triggers) {
      for (const trigger of flows.triggers) {
        if (!trigger.id.startsWith(driverId + '_')) {
          console.log(`⚠️  ${driverId}: Trigger ID missing prefix: ${trigger.id}`);
          trigger.id = `${driverId}_${trigger.id}`;
          prefixFixed++;
          modified = true;
        }
      }
    }
    
    // Fix conditions with missing prefixes
    if (flows.conditions) {
      for (const condition of flows.conditions) {
        if (!condition.id.startsWith(driverId + '_')) {
          console.log(`⚠️  ${driverId}: Condition ID missing prefix: ${condition.id}`);
          condition.id = `${driverId}_${condition.id}`;
          prefixFixed++;
          modified = true;
        }
      }
    }
    
    if (modified) {
      fs.writeFileSync(flowPath, JSON.stringify(flows, null, 2));
    }
    
  } catch (err) {
    console.error(`❌ ${driverId}: ${err.message}`);
  }
}

console.log('\n═══════════════════════════════════════════════════════════');
console.log('   SUMMARY');
console.log('═══════════════════════════════════════════════════════════\n');

console.log(`✅ titleFormatted added: ${fixed}`);
console.log(`✅ ID prefixes fixed: ${prefixFixed}`);
console.log(`📦 Total drivers scanned: ${drivers.length}\n`);

console.log('🎉 Flow card warnings fixed! Rebuild to verify.\n');
