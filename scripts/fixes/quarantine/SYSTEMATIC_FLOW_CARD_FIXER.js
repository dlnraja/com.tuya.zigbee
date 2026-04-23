const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(process.cwd(), 'drivers');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      walk(filePath, callback);
    } else if (file === 'driver.js') {
      callback(filePath);
    }
  });
}

let fixedDrivers = 0;

walk(DRIVERS_DIR, (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  const driverDir = path.basename(path.dirname(filePath));
  const suggestedClassName = driverDir
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('') + 'Driver';

  // 1. Fix missing assignments for Condition Cards
  // Pattern: this.homey.flow.getConditionCard('card_id')\n      this.variableName?.registerRunListener
  const conditionMatch = /this\.homey\.flow\.getConditionCard\(['"]([^'"]+)['"]\)\s+this\.(\w+ )\?.registerRunListener/g      ;
  if (conditionMatch.test(content)) {
    content = content.replace(conditionMatch, (match, cardId, varName) => {
      console.log(`  [FIX] Found broken condition registration in ${driverDir}: ${cardId} -> ${varName}`);
      return `this.${varName} = this.homey.flow.getConditionCard('${cardId}');\n      if (this.${varName}) this.${varName}.registerRunListener`;
    });
    changed = true;
  }

  // 2. Fix missing assignments for Action Cards
  const actionMatch = /this\.homey\.flow\.getActionCard\(['"]([^'"]+)['"]\)\s+this\.(\w+)\?.registerRunListener/g      ;
  if (actionMatch.test(content)) {
    content = content.replace(actionMatch, (match, cardId, varName) => {
      console.log(`  [FIX] Found broken action registration in ${driverDir}: ${cardId} -> ${varName}`);
      return `this.${varName} = this.homey.flow.getActionCard('${cardId}');\n      if (this.${varName}) this.${varName}.registerRunListener`;
    });
    changed = true;
  }

  // 3. Fix missing assignments for Trigger Cards
  // Pattern: this.homey.flow.getTriggerCard('card_id')
  // We want to turn this into this.cardIdTrigger = this.homey.flow.getTriggerCard('card_id')
  // But only if it's not already assigned.
  const triggerMatch = /^(\s+)this\.homey\.flow\.getTriggerCard\(['"]([^'"]+)['"]\)$/gm;
  if (triggerMatch.test(content)) {
    content = content.replace(triggerMatch, (match, indent, cardId) => {
      const varName = cardId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()).replace(/ /g, '') + 'Trigger';
      const camelVarName = varName.charAt(0).toLowerCase() + varName.slice(1);
      console.log(`  [FIX] Found bare trigger in ${driverDir}: ${cardId} -> ${camelVarName}`);
      return `${indent}this.${camelVarName} = this.homey.flow.getTriggerCard('${cardId}');`;
    });
    changed = true;
  }

  // 4. Fix Class Name collision (copy-paste errors)
  // If the directory name doesn't match the class name (roughly)
  // We only do this if the class is 'ClimateSensorDriver' but the dir is NOT climate_sensor
  if (content.includes('class ClimateSensorDriver') && !driverDir.includes('climate_sensor')) {
    console.log(`  [FIX] Renaming class ClimateSensorDriver to ${suggestedClassName} in ${driverDir}`);
    content = content.replace(/class ClimateSensorDriver/g, `class ${suggestedClassName}`);
    content = content.replace(/module\.exports = ClimateSensorDriver/g, `module.exports = ${suggestedClassName}`);
    // Also update log messages
    content = content.replace(/ClimateSensorDriver v5\.5\.564/g, `${suggestedClassName}`);
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content);
    fixedDrivers++;
  }
});

console.log(`\n Systematic fix complete. Fixed ${fixedDrivers} drivers.`);
