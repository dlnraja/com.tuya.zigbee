#!/usr/bin/env node
'use strict';

const fs = require('fs').promises;
const path = require('path');

/**
 * FIX TITLEFORMATTED WITH ARGS
 * Adds device placeholder [[device]] to all titleFormatted that have device args
 */

async function fixTitleFormattedWithArgs() {
  console.log('🔧 FIXING TITLEFORMATTED WITH DEVICE ARGS\n');
  
  const appJsonPath = path.join(__dirname, '../..', 'app.json');
  const appJson = JSON.parse(await fs.readFile(appJsonPath, 'utf8'));
  
  let fixed = 0;
  
  // Fix triggers
  if (appJson.flow && appJson.flow.triggers) {
    for (const trigger of appJson.flow.triggers) {
      // Check if has device args
      const hasDeviceArg = trigger.args && trigger.args.some(arg => arg.type === 'device');
      
      if (hasDeviceArg && trigger.titleFormatted) {
        // Add [[device]] to titleFormatted
        if (trigger.titleFormatted.en && !trigger.titleFormatted.en.includes('[[')) {
          trigger.titleFormatted.en = trigger.titleFormatted.en + ' [[device]]';
          if (trigger.titleFormatted.fr) {
            trigger.titleFormatted.fr = trigger.titleFormatted.fr + ' [[device]]';
          }
          fixed++;
          console.log(`  ✅ Fixed trigger: ${trigger.id}`);
        }
      }
    }
  }
  
  // Fix conditions
  if (appJson.flow && appJson.flow.conditions) {
    for (const condition of appJson.flow.conditions) {
      const hasDeviceArg = condition.args && condition.args.some(arg => arg.type === 'device');
      
      if (hasDeviceArg && condition.titleFormatted) {
        if (condition.titleFormatted.en && !condition.titleFormatted.en.includes('[[')) {
          condition.titleFormatted.en = '[[device]] ' + condition.titleFormatted.en;
          if (condition.titleFormatted.fr) {
            condition.titleFormatted.fr = '[[device]] ' + condition.titleFormatted.fr;
          }
          fixed++;
          console.log(`  ✅ Fixed condition: ${condition.id}`);
        }
      }
    }
  }
  
  // Fix actions
  if (appJson.flow && appJson.flow.actions) {
    for (const action of appJson.flow.actions) {
      const hasDeviceArg = action.args && action.args.some(arg => arg.type === 'device');
      
      if (hasDeviceArg && action.titleFormatted) {
        if (action.titleFormatted.en && !action.titleFormatted.en.includes('[[')) {
          action.titleFormatted.en = action.titleFormatted.en + ' [[device]]';
          if (action.titleFormatted.fr) {
            action.titleFormatted.fr = action.titleFormatted.fr + ' [[device]]';
          }
          fixed++;
          console.log(`  ✅ Fixed action: ${action.id}`);
        }
      }
    }
  }
  
  // Save
  await fs.writeFile(appJsonPath, JSON.stringify(appJson, null, 2));
  
  console.log(`\n📊 SUMMARY\n`);
  console.log(`Total fixed: ${fixed} flow cards`);
  console.log(`\n✅ app.json updated with [[device]] placeholders!`);
}

fixTitleFormattedWithArgs().catch(console.error);
