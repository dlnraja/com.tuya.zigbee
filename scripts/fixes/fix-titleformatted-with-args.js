#!/usr/bin/env node
'use strict';

/**
 * FIX TITLEFORMATTED WITH DEVICE ARGS
 * 
 * Adds [[device]] placeholder to titleFormatted for flow cards that have device args
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const APP_JSON_PATH = path.join(ROOT, 'app.json');

console.log('🔧 FIXING TITLEFORMATTED WITH DEVICE ARGS\n');
console.log('='.repeat(60));

// Read app.json
const appJson = JSON.parse(fs.readFileSync(APP_JSON_PATH, 'utf8'));

let fixed = 0;

// Fix flow triggers
if (appJson.flow && appJson.flow.triggers) {
  for (const trigger of appJson.flow.triggers) {
    if (trigger.titleFormatted && trigger.args) {
      const hasDeviceArg = trigger.args.some(arg => arg.type === 'device' || arg.name === 'device');
      
      if (hasDeviceArg && !trigger.titleFormatted.includes('[[device]]')) {
        trigger.titleFormatted = trigger.titleFormatted + ' [[device]]';
        fixed++;
        console.log(`✅ TRIGGER: ${trigger.id}`);
      }
    }
  }
}

// Fix flow conditions  
if (appJson.flow && appJson.flow.conditions) {
  for (const condition of appJson.flow.conditions) {
    if (condition.titleFormatted && condition.args) {
      const hasDeviceArg = condition.args.some(arg => arg.type === 'device' || arg.name === 'device');
      
      if (hasDeviceArg) {
        if (typeof condition.titleFormatted === 'string') {
          if (!condition.titleFormatted.includes('[[device]]')) {
            condition.titleFormatted = condition.titleFormatted + ' [[device]]';
            fixed++;
            console.log(`✅ CONDITION: ${condition.id}`);
          }
        } else if (typeof condition.titleFormatted === 'object') {
          // Handle object with translations
          let modified = false;
          for (const lang in condition.titleFormatted) {
            if (!condition.titleFormatted[lang].includes('[[device]]')) {
              condition.titleFormatted[lang] = condition.titleFormatted[lang] + ' [[device]]';
              modified = true;
            }
          }
          if (modified) {
            fixed++;
            console.log(`✅ CONDITION: ${condition.id}`);
          }
        }
      }
    }
  }
}

// Fix flow actions
if (appJson.flow && appJson.flow.actions) {
  for (const action of appJson.flow.actions) {
    if (action.titleFormatted && action.args) {
      const hasDeviceArg = action.args.some(arg => arg.type === 'device' || arg.name === 'device');
      
      if (hasDeviceArg) {
        if (typeof action.titleFormatted === 'string') {
          if (!action.titleFormatted.includes('[[device]]')) {
            action.titleFormatted = action.titleFormatted + ' [[device]]';
            fixed++;
            console.log(`✅ ACTION: ${action.id}`);
          }
        } else if (typeof action.titleFormatted === 'object') {
          // Handle object with translations
          let modified = false;
          for (const lang in action.titleFormatted) {
            if (!action.titleFormatted[lang].includes('[[device]]')) {
              action.titleFormatted[lang] = action.titleFormatted[lang] + ' [[device]]';
              modified = true;
            }
          }
          if (modified) {
            fixed++;
            console.log(`✅ ACTION: ${action.id}`);
          }
        }
      }
    }
  }
}

// Write back app.json
if (fixed > 0) {
  fs.writeFileSync(APP_JSON_PATH, JSON.stringify(appJson, null, 2) + '\n', 'utf8');
}

console.log('\n' + '='.repeat(60));
console.log(`\n📊 SUMMARY:`);
console.log(`  Flow items fixed: ${fixed}`);

if (fixed > 0) {
  console.log('\n✅ All flow cards now have proper [[device]] placeholders!');
  console.log('\n🎯 This fixes the "Missing all args" validation error!');
} else {
  console.log('\n✅ All flow cards already have proper placeholders!');
}
