#!/usr/bin/env node
/**
 * Move device arg to FIRST position in all flow triggers
 */

const fs = require('fs');
const path = require('path');

const APP_JSON_PATH = path.join(__dirname, 'app.json');

console.log('🔧 Moving device args to first position...\n');

const appJson = JSON.parse(fs.readFileSync(APP_JSON_PATH, 'utf8'));

let fixedCount = 0;

if (appJson.flow && appJson.flow.triggers) {
  appJson.flow.triggers.forEach(trigger => {
    if (!trigger.args || trigger.args.length === 0) return;
    
    // Find device arg
    const deviceArgIndex = trigger.args.findIndex(arg => arg.name === 'device');
    
    if (deviceArgIndex > 0) {
      // Move to first position
      const deviceArg = trigger.args.splice(deviceArgIndex, 1)[0];
      trigger.args.unshift(deviceArg);
      
      console.log(`✅ Moved device arg to first: ${trigger.id}`);
      fixedCount++;
    }
  });
}

fs.writeFileSync(APP_JSON_PATH, JSON.stringify(appJson, null, 2), 'utf8');

console.log(`\n✅ Fixed ${fixedCount} flow triggers`);
console.log('📄 app.json updated successfully!');
