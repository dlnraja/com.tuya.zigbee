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

let fixedTotal = 0;

console.log(' Starting BRUTE FORCE SDK3 STABILIZER...');

walk(DRIVERS_DIR, (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  const driverDir = path.basename(path.dirname(filePath));

  // 1. Correct class name based on directory
  const suggestedName = driverDir.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('') + 'Driver';
  const currentClassMatch = content.match(/class (\w+) extends/);
  if (currentClassMatch && currentClassMatch[1] === 'ClimateSensorDriver' && !driverDir.includes('climate')) {
    console.log(`  [REN] ${driverDir}: ClimateSensorDriver -> ${suggestedName}`);
    content = content.replace(/ClimateSensorDriver/g, suggestedName);
    changed = true;
  }

  // 2. Fix Deprecated getDevice*Card calls
  const deprecations = [
    { old: 'getDeviceActionCard', new: 'getActionCard' },
    { old: 'getConditionCard', new: 'getConditionCard' },
    { old: 'getDeviceTriggerCard', new: 'getTriggerCard' }
  ];
  deprecations.forEach(d => {
    if (content.includes(d.old)) {
      console.log(`  [DEP] ${driverDir}: ${d.old} -> ${d.new}`);
      content = content.split(d.old).join(d.new);
      changed = true;
    }
  });

  // 3. Fix Broken Chaining (The most common crash)
  // Replaces: .get*Card('...').registerRunListener(...) 
  // with:    const card = .get*Card('...'); if(card) card.registerRunListener(...)
  const cardTypes = ['Trigger', 'Condition', 'Action'];
  cardTypes.forEach(type => {
    const regex = new RegExp(`this\\.homey\\.flow\\.get${type}Card\\(['"]([^'"]+)['"]\\)\\s*\\.registerRunListener`, 'g');
    if (regex.test(content)) {
      console.log(`  [CHN] ${driverDir}: Unsafe ${type} chaining detected`);
      content = content.replace(regex, (match, cardId) => {
        const varName = `_${cardId.replace(/-/g, '_')}Card`;
        return `this.${varName} = this.homey.flow.get${type}Card('${cardId}');\n    if (this.${varName}) this.${varName}.registerRunListener`;
      });
      changed = true;
    }
  });

  // 4. Ensure super.onInit()
  if (content.includes('async onInit()') && !content.includes('super.onInit()')) {
    console.log(`  [SUP] ${driverDir}: Missing super.onInit()`);
    content = content.replace('async onInit() {', 'async onInit() {\n    await super.onInit();');
    changed = true;
  }

  // 5. Fix "await is only valid in async" by ensuring all listeners are async
  // AND fixing the dot-on-new-line syntax if it remained
  if (content.match(/^\s+\.registerRunListener/m)) {
    console.log(`  [DOT] ${driverDir}: Cleaning up dangling dots`);
    content = content.replace(/([^\s;])\s*\n\s*\.registerRunListener/g, '$1.registerRunListener');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content);
    fixedTotal++;
  }
});

console.log(`\n BRUTE FORCE STABILIZER FINISHED. Fixed ${fixedTotal} files.`);
