const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, 'drivers');

function fixDriver(driverName) {
  const driverPath = path.join(DRIVERS_DIR, driverName, 'driver.js');
  if (!fs.existsSync(driverPath)) return;

  let content = fs.readFileSync(driverPath, 'utf8');
  let changed = false;

  // 1. Add _flowCardsRegistered guard if complex flow registration exists
  if (content.includes('this.homey.flow.get') && !content.includes('this._flowCardsRegistered')) {
    // Find onInit
    const onInitRegex = /async\s+onInit\s*\(\)\s*\{/;
    if (onInitRegex.test(content)) {
      content = content.replace(onInitRegex, 'async onInit() {\n    if (this._flowCardsRegistered) return;\n    this._flowCardsRegistered = true;\n');
      changed = true;
    }
  }

  // 2. Refactor direct homey.flow access to safeRegisterCard pattern
  // Example: this.homey.flow.getTriggerCard('id').registerRunListener(...)
  // Note: This is complex with regex, let's look for common patterns
  
  // Pattern: const card = this.homey.flow.get...Card('id'); if (card) { card.registerRunListener(...) }
  // We will replace with FlowCardHelper.safeRegisterCard
  
  if (content.includes('this.homey.flow.')) {
    // Add require for FlowCardHelper if not exists
    if (!content.includes('FlowCardHelper')) {
      const requireLine = "const { safeRegisterCard } = require('../../lib/FlowCardHelper');\n";
      content = requireLine + content;
      changed = true;
    }
    
    // Replace patterns (this is a simplified version, manual fix is safer for complex ones)
    // But let's try to fix the common "return null if fail" pattern
    const legacyPattern = /\(\(\)\s*=>\s*\{\s*try\s*\{\s*return\s*this\.homey\.flow\.get(Trigger|Action|Condition)Card\('([^']+)'\);\s*\}\s*catch\(e\)\s*\{\s*return\s*null;\s*\}\s*\}\)\(\)/g;
    
    if (legacyPattern.test(content)) {
      content = content.replace(legacyPattern, (match, type, id) => {
        return `safeRegisterCard(this.homey, '${type.toLowerCase()}', '${id}', async (args, state) => { /* logic moved below */ }, this)`;
      });
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(driverPath, content);
    console.log(` Refactored ${driverName}`);
  }
}

const folders = fs.readdirSync(DRIVERS_DIR);
folders.forEach(fixDriver);

console.log(' Global flow refactoring complete.');
