#!/usr/bin/env node
/**
 * Fix titleFormatted warnings in app.json
 * Adds titleFormatted field to all flow triggers that are missing it
 */

const fs = require('fs');
const path = require('path');

const APP_JSON_PATH = path.join(__dirname, 'app.json');

console.log('🔧 Fixing titleFormatted warnings...\n');

// Read app.json
const appJson = JSON.parse(fs.readFileSync(APP_JSON_PATH, 'utf8'));

let fixedCount = 0;

// Process all flow triggers
if (appJson.flow && appJson.flow.triggers) {
  appJson.flow.triggers.forEach(trigger => {
    // Check if titleFormatted is missing
    if (!trigger.titleFormatted && trigger.title) {
      // Create titleFormatted from title
      if (typeof trigger.title === 'string') {
        trigger.titleFormatted = trigger.title;
      } else if (typeof trigger.title === 'object') {
        // Use English title or first available language
        trigger.titleFormatted = trigger.title.en || trigger.title[Object.keys(trigger.title)[0]];
      }
      
      if (trigger.titleFormatted) {
        console.log(`✅ Fixed: ${trigger.id}`);
        fixedCount++;
      }
    }
  });
}

// Write back to app.json
fs.writeFileSync(APP_JSON_PATH, JSON.stringify(appJson, null, 2), 'utf8');

console.log(`\n✅ Fixed ${fixedCount} flow triggers`);
console.log('📄 app.json updated successfully!');
