#!/usr/bin/env node
/**
 * Fix titleFormatted to use correct format for args
 */

const fs = require('fs');
const path = require('path');

const APP_JSON_PATH = path.join(__dirname, 'app.json');

console.log('🔧 Fixing titleFormatted args format...\n');

const appJson = JSON.parse(fs.readFileSync(APP_JSON_PATH, 'utf8'));

let fixedCount = 0;

if (appJson.flow && appJson.flow.triggers) {
  appJson.flow.triggers.forEach(trigger => {
    if (!trigger.args || trigger.args.length <= 1) return; // Only device arg or no args
    
    // Get base title
    let baseTitle = '';
    if (typeof trigger.title === 'string') {
      baseTitle = trigger.title;
    } else if (typeof trigger.title === 'object') {
      baseTitle = trigger.title.en || trigger.title[Object.keys(trigger.title)[0]];
    }
    
    if (!baseTitle) return;
    
    // Get non-device args
    const nonDeviceArgs = trigger.args.filter(arg => arg.name !== 'device');
    
    if (nonDeviceArgs.length === 0) {
      // No dropdown args, simple titleFormatted
      trigger.titleFormatted = baseTitle;
    } else {
      // Build titleFormatted with [[args.argname]]
      const argsList = nonDeviceArgs.map(arg => `[[${arg.name}]]`).join(' ');
      trigger.titleFormatted = `${baseTitle} ${argsList}`;
    }
    
    console.log(`✅ ${trigger.id}`);
    fixedCount++;
  });
}

fs.writeFileSync(APP_JSON_PATH, JSON.stringify(appJson, null, 2), 'utf8');

console.log(`\n✅ Fixed ${fixedCount} flow triggers`);
console.log('📄 app.json updated successfully!');
