#!/usr/bin/env node
/**
 * Fix titleFormatted warnings properly with {{tokens}}
 */

const fs = require('fs');
const path = require('path');

const APP_JSON_PATH = path.join(__dirname, 'app.json');

console.log('🔧 Fixing titleFormatted with proper token format...\n');

const appJson = JSON.parse(fs.readFileSync(APP_JSON_PATH, 'utf8'));

let fixedCount = 0;

if (appJson.flow && appJson.flow.triggers) {
  appJson.flow.triggers.forEach(trigger => {
    // Skip if already has valid titleFormatted with tokens
    if (trigger.titleFormatted) {
      const formatted = typeof trigger.titleFormatted === 'string' 
        ? trigger.titleFormatted 
        : (trigger.titleFormatted.en || '');
      if (formatted && formatted.includes('{{')) {
        return;
      }
    }
    
    // Get base title
    let baseTitle = '';
    if (typeof trigger.title === 'string') {
      baseTitle = trigger.title;
    } else if (typeof trigger.title === 'object') {
      baseTitle = trigger.title.en || trigger.title[Object.keys(trigger.title)[0]];
    }
    
    if (!baseTitle) return;
    
    // Build titleFormatted with args
    let titleFormatted = baseTitle;
    
    if (trigger.args && trigger.args.length > 0) {
      // Add tokens for each arg
      const argTokens = trigger.args
        .filter(arg => arg.name !== 'device')
        .map(arg => `{{${arg.name}}}`)
        .join(' ');
      
      if (argTokens) {
        titleFormatted = `${baseTitle} (${argTokens})`;
      }
    }
    
    trigger.titleFormatted = titleFormatted;
    console.log(`✅ ${trigger.id}`);
    fixedCount++;
  });
}

fs.writeFileSync(APP_JSON_PATH, JSON.stringify(appJson, null, 2), 'utf8');

console.log(`\n✅ Fixed ${fixedCount} flow triggers with proper token format`);
console.log('📄 app.json updated successfully!');
