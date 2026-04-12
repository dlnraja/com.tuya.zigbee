const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(process.cwd(), 'drivers');

function walk(dir, callback) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      walk(filePath, callback);
    } else if (file === 'driver.js') {
      callback(filePath);
    }
  });
}

let fixedCount = 0;

console.log('🚀 Starting ULTIMATE DRIVER STABILIZER (309+ drivers)...');

walk(DRIVERS_DIR, (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  const driverDir = path.basename(path.dirname(filePath));
  
  // 1. Ensure await super.onInit() exists
  if (content.includes('async onInit()') && !content.includes('super.onInit()')) {
    console.log(`  [FIX] Missing super.onInit() in ${driverDir}`);
    content = content.replace('async onInit() {', 'async onInit() {\n    await super.onInit();');
    changed = true;
  } else if (content.includes('async onInit()') && content.includes('super.onInit()') && !content.includes('await super.onInit()')) {
    console.log(`  [FIX] Missing await on super.onInit() in ${driverDir}`);
    content = content.replace('super.onInit()', 'await super.onInit()');
    changed = true;
  }

  // 2. Fix broken flow card assignments (the pattern found earlier)
  const brokenPatterns = [
    {
      regex: /this\.homey\.flow\.getConditionCard\(['"]([^'"]+)['"]\)\s+this\.(\w+)\?.registerRunListener/g,
      replace: (match, cardId, varName) => {
        return `this.${varName} = this.homey.flow.getConditionCard('${cardId}');\n      if (this.${varName}) this.${varName}.registerRunListener`;
      }
    },
    {
      regex: /this\.homey\.flow\.getActionCard\(['"]([^'"]+)['"]\)\s+this\.(\w+)\?.registerRunListener/g,
      replace: (match, cardId, varName) => {
        return `this.${varName} = this.homey.flow.getActionCard('${cardId}');\n      if (this.${varName}) this.${varName}.registerRunListener`;
      }
    },
    {
      regex: /^(\s+)this\.homey\.flow\.getTriggerCard\(['"]([^'"]+)['"]\)$/gm,
      replace: (match, indent, cardId) => {
        const varName = cardId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()).replace(/ /g, '') + 'Trigger';
        const camelVarName = varName.charAt(0).toLowerCase() + varName.slice(1);
        return `${indent}this.${camelVarName} = this.homey.flow.getTriggerCard('${cardId}');`;
      }
    }
  ];

  brokenPatterns.forEach(p => {
    if (p.regex.test(content)) {
      content = content.replace(p.regex, p.replace);
      changed = true;
    }
  });

  // 3. Renounce incorrect class names
  const suggestedClassName = driverDir
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('') + 'Driver';

  if (content.includes('class ClimateSensorDriver') && !driverDir.includes('climate_sensor')) {
    console.log(`  [FIX] Renaming class ClimateSensorDriver to ${suggestedClassName} in ${driverDir}`);
    content = content.replace(/class ClimateSensorDriver/g, `class ${suggestedClassName}`);
    content = content.replace(/module\.exports = ClimateSensorDriver/g, `module.exports = ${suggestedClassName}`);
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content);
    fixedCount++;
  }
});

console.log(`\n✅ Finished. Stabilized ${fixedCount} drivers.`);
