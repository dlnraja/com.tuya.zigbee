'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const driversDir = path.join(__dirname, '..', 'drivers');
const dirs = fs.readdirSync(driversDir).filter(d => {
  const fp = path.join(driversDir, d, 'driver.js');
  return fs.existsSync(fp);
});

let fixed = 0;
let failed = 0;

dirs.forEach(dir => {
  const fp = path.join(driversDir, dir, 'driver.js');
  let content = fs.readFileSync(fp, 'utf8');
  let modified = false;

  // Check if file has syntax errors first
  try {
    execSync(`node -c "${fp}"`, { stdio: 'pipe' });
    return; // Already OK
  } catch (e) {
    // Has errors, try to fix
  }

  // Fix 1: Missing closing brace for getDeviceById
  // Pattern: "return null;\n      }\n  async onInit" (missing } for method)
  const fix1 = /(return null;\s*\n\s*\})\s*\n(\s*async onInit\(\))/;
  if (fix1.test(content)) {
    content = content.replace(fix1, '$1\n    }\n$2');
    modified = true;
  }

  // Fix 2: Corrupted trigger registration in for loop
  // Pattern: for loop with "Removed corrupted nested block" comment followed by dangling catch
  const fix2Pattern = /(\s*for \(const id of triggers\) \{)\s*\n\s*\/\/ Removed corrupted nested block[^\n]*\n[\s\n]*\} catch \(e\) \{ this\.error\(`Trigger \$\{id\}: \$\{e\.message\}`\);\s*\}/;
  if (fix2Pattern.test(content)) {
    content = content.replace(fix2Pattern, 
      '$1\n      try {\n        const card = this.homey.flow.getTriggerCard(id);\n        if (card) card.registerRunListener(async () => true);\n      } catch (e) { this.error(`Trigger ${id}: ${e.message}`); }\n    }');
    modified = true;
  }

  // Fix 3: Corrupted action card retrieval
  // Pattern: "try {  const card = (() => { try { return ; } catch (e) { return null; } })(); } catch..."
  // Replace with proper this.homey.flow.getActionCard call
  // We need to extract the action name from the error message in the catch block
  const fix3 = /try\s*\{\s*const card = \(\(\) => \{ try \{ return ; \} catch \(e\) \{ return null; \} \}\)\(\); \} catch \(e\) \{ return null; \} \}\)\(\);[^\n]*\}\)\(\);/g;
  if (fix3.test(content)) {
    // Find action names from catch blocks
    content = content.replace(
      /try\s*\{\s*const card = \(\(\) => \{ try \{ return ; \} catch \(e\) \{ return null; \} \}\)\(\);[^\n]*\n(\s*if \(card\) \{[\s\S]*?\}\s*\}\s*\} catch \(e\) \{ this\.error\('Action ([^']+)':)/g,
      (match, after, actionName) => {
        return `try {\n      const card = this.homey.flow.getActionCard('${dir}_${actionName}');\n${after}`;
      }
    );
    modified = true;
  }

  // Fix 4: Simpler corrupted pattern - just replace the entire corrupted IIFE chain
  const fix4 = /const card = \(\(\) => \{ try \{ return ; \} catch \(e\) \{ return null; \} \}\)\(\); \} catch \(e\) \{ return null; \} \}\)\(\);/g;
  if (fix4.test(content)) {
    // This is too corrupted to fix automatically without knowing the card name
    // Mark for manual review
    console.log('⚠️ Complex corruption in:', dir, '- needs manual review');
  }

  if (modified) {
    fs.writeFileSync(fp, content, 'utf8');
    try {
      execSync(`node -c "${fp}"`, { stdio: 'pipe' });
      fixed++;
      console.log('✅ Fixed:', dir);
    } catch (e) {
      failed++;
      const line = e.message.match(/:(\d+)/)?.[1];
      console.log('⚠️ Partial fix:', dir, '- still error at line', line);
    }
  } else {
    failed++;
  }
});

console.log(`\nTotal checked: ${dirs.length} | Fixed: ${fixed} | Still broken: ${failed}`);