#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');

console.log('\n🔧 FIXING ALL MISSING titleFormatted IN FLOW ACTIONS\n');

const driversDir = path.join(__dirname, '..', '..', 'drivers');

let fixedCount = 0;
let totalActions = 0;

// Get all driver directories
const driverDirs = fs.readdirSync(driversDir).filter(f => {
  return fs.statSync(path.join(driversDir, f)).isDirectory();
});

for (const driverName of driverDirs) {
  const flowComposeFile = path.join(driversDir, driverName, 'driver.flow.compose.json');
  
  if (!fs.existsSync(flowComposeFile)) continue;
  
  const flowData = fs.readJsonSync(flowComposeFile);
  let modified = false;
  
  // Fix actions
  if (flowData.actions) {
    for (const action of flowData.actions) {
      totalActions++;
      
      if (!action.titleFormatted && action.title) {
        // Generate titleFormatted based on title and args
        action.titleFormatted = {};
        
        for (const lang of Object.keys(action.title)) {
          let formatted = action.title[lang];
          
          // Add arg placeholders if args exist
          if (action.args && action.args.length > 0) {
            const argPlaceholders = action.args.map(arg => `[[${arg.name}]]`).join(' ');
            formatted = `${action.title[lang]} ${argPlaceholders}`;
          }
          
          // Add [[device]] only if not already present
          if (!formatted.includes('[[device]]')) {
            formatted = `${formatted} [[device]]`;
          }
          
          action.titleFormatted[lang] = formatted.trim().replace(/\s+/g, ' ');
        }
        
        modified = true;
        fixedCount++;
      }
    }
  }
  
  // Fix triggers
  if (flowData.triggers) {
    for (const trigger of flowData.triggers) {
      if (!trigger.titleFormatted && trigger.title) {
        trigger.titleFormatted = {};
        
        for (const lang of Object.keys(trigger.title)) {
          let formatted = trigger.title[lang];
          
          // Add arg/token placeholders if they exist
          if (trigger.args && trigger.args.length > 0) {
            const argPlaceholders = trigger.args.map(arg => `[[${arg.name}]]`).join(' ');
            formatted = `${trigger.title[lang]} ${argPlaceholders}`;
          }
          
          // Add [[device]] only if not already present
          if (!formatted.includes('[[device]]')) {
            formatted = `${formatted} [[device]]`;
          }
          
          trigger.titleFormatted[lang] = formatted.trim().replace(/\s+/g, ' ');
        }
        
        modified = true;
      }
    }
  }
  
  // Fix conditions
  if (flowData.conditions) {
    for (const condition of flowData.conditions) {
      if (!condition.titleFormatted && condition.title) {
        condition.titleFormatted = {};
        
        for (const lang of Object.keys(condition.title)) {
          let formatted = condition.title[lang];
          
          if (condition.args && condition.args.length > 0) {
            const argPlaceholders = condition.args.map(arg => `[[${arg.name}]]`).join(' ');
            formatted = `${condition.title[lang]} ${argPlaceholders}`;
          }
          
          // Add [[device]] only if not already present
          if (!formatted.includes('[[device]]')) {
            formatted = `${formatted} [[device]]`;
          }
          
          condition.titleFormatted[lang] = formatted.trim().replace(/\s+/g, ' ');
        }
        
        modified = true;
      }
    }
  }
  
  if (modified) {
    fs.writeJsonSync(flowComposeFile, flowData, { spaces: 2 });
    console.log(`✅ Fixed: ${driverName}`);
  }
}

console.log(`\n✅ FIXED ${fixedCount} MISSING titleFormatted (${totalActions} total actions checked)`);
console.log('\n🔄 Now run: homey app build\n');
