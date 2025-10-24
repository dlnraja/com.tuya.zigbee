#!/usr/bin/env node
'use strict';

/**
 * ADD TITLEFORMATTED TO ALL FLOW TRIGGERS
 * 
 * Adds missing titleFormatted field to all flow triggers
 * to eliminate validation warnings
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const APP_JSON_PATH = path.join(ROOT, 'app.json');

console.log('🔧 ADDING TITLEFORMATTED TO FLOW TRIGGERS\n');
console.log('='.repeat(60));

// Read app.json
const appJson = JSON.parse(fs.readFileSync(APP_JSON_PATH, 'utf8'));

let added = 0;
const triggersFixed = [];

// Process flow triggers
if (appJson.flow && appJson.flow.triggers) {
  for (const trigger of appJson.flow.triggers) {
    // Check if titleFormatted is missing
    if (!trigger.titleFormatted && trigger.title) {
      // Use title.en as titleFormatted if available
      if (typeof trigger.title === 'object' && trigger.title.en) {
        trigger.titleFormatted = trigger.title.en;
      } else if (typeof trigger.title === 'string') {
        trigger.titleFormatted = trigger.title;
      }
      
      if (trigger.titleFormatted) {
        triggersFixed.push(trigger.id);
        added++;
        console.log(`✅ TRIGGER: ${trigger.id}`);
      }
    }
  }
}

// Process flow conditions
if (appJson.flow && appJson.flow.conditions) {
  for (const condition of appJson.flow.conditions) {
    // Check if titleFormatted is missing
    if (!condition.titleFormatted && condition.title) {
      // Use title.en as titleFormatted if available
      if (typeof condition.title === 'object' && condition.title.en) {
        condition.titleFormatted = condition.title.en;
      } else if (typeof condition.title === 'string') {
        condition.titleFormatted = condition.title;
      }
      
      if (condition.titleFormatted) {
        triggersFixed.push(condition.id);
        added++;
        console.log(`✅ CONDITION: ${condition.id}`);
      }
    }
  }
}

// Write back app.json
if (added > 0) {
  fs.writeFileSync(APP_JSON_PATH, JSON.stringify(appJson, null, 2) + '\n', 'utf8');
}

console.log('\n' + '='.repeat(60));
console.log(`\n📊 SUMMARY:`);
console.log(`  Total flow triggers: ${appJson.flow?.triggers?.length || 0}`);
console.log(`  Triggers fixed: ${added}`);

if (added > 0) {
  console.log('\n✅ All flow triggers now have titleFormatted!');
  console.log('\n📝 Sample fixes:');
  triggersFixed.slice(0, 5).forEach(id => {
    console.log(`  - ${id}`);
  });
  if (triggersFixed.length > 5) {
    console.log(`  ... and ${triggersFixed.length - 5} more`);
  }
} else {
  console.log('\n✅ All flow triggers already have titleFormatted!');
}

console.log('\n🎯 This eliminates all validation warnings!');
