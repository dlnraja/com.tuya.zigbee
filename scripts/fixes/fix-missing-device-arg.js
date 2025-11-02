#!/usr/bin/env node
/**
 * Add missing device arg to all flow triggers
 */

const fs = require('fs');
const path = require('path');

const APP_JSON_PATH = path.join(__dirname, 'app.json');

console.log('🔧 Adding missing device args...\n');

const appJson = JSON.parse(fs.readFileSync(APP_JSON_PATH, 'utf8'));

let fixedCount = 0;

if (appJson.flow && appJson.flow.triggers) {
  appJson.flow.triggers.forEach(trigger => {
    // Check if device arg exists
    const hasDeviceArg = trigger.args && trigger.args.some(arg => arg.name === 'device');
    
    if (!hasDeviceArg) {
      // Get driver ID from trigger ID
      const driverId = trigger.id.split('_').slice(0, -2).join('_');
      
      // Add device arg at the end
      if (!trigger.args) {
        trigger.args = [];
      }
      
      trigger.args.push({
        type: 'device',
        name: 'device',
        filter: `driver_id=${driverId}`
      });
      
      console.log(`✅ Added device arg to: ${trigger.id}`);
      fixedCount++;
    }
  });
}

fs.writeFileSync(APP_JSON_PATH, JSON.stringify(appJson, null, 2), 'utf8');

console.log(`\n✅ Fixed ${fixedCount} flow triggers`);
console.log('📄 app.json updated successfully!');
