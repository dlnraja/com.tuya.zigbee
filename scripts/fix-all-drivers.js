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
let alreadyOk = 0;
let failed = 0;

dirs.forEach(dir => {
  const fp = path.join(driversDir, dir, 'driver.js');
  let content = fs.readFileSync(fp, 'utf8');
  
  // Check if already OK
  try {
    execSync(`node -c "${fp}"`, { stdio: 'pipe' });
    alreadyOk++;
    return;
  } catch (e) {
    // Has errors
  }

  let modified = false;

  // Fix 1: Missing closing brace for getDeviceById
  // Pattern: "return null;\n      }\n  async onInit" (missing } for method)
  const fix1 = /(return null;\s*\n\s*\})\s*\n(\s*async onInit\(\))/;
  if (fix1.test(content)) {
    content = content.replace(fix1, '$1\n    }\n$2');
    modified = true;
  }

  // Fix 2: Corrupted reg/r function with IIFE chain
  // Pattern: const reg = (id, fn) => { // Removed corrupted nested block ... }.registerRunListener(fn)
  const regPatterns = [
    /const reg = \(id, fn\) => \{[^}]*Removed corrupted nested block[^}]*\}\)\(\)\.registerRunListener\(fn\)[^\n]*/g,
    /const r=\(i,fn\)=>\{[^}]*Removed corrupted nested block[^}]*\}\)\(\)\.registerRunListener\(fn\)[^\n]*/g,
    /const reg = \(id, fn\) => \{[^}]*Removed corrupted nested block[^\n]*/g,
  ];
  
  for (const pattern of regPatterns) {
    if (pattern.test(content)) {
      content = content.replace(pattern, 
        "const reg = (id, fn) => {\n      try {\n        const card = this.homey.flow.getActionCard(id);\n        if (card) card.registerRunListener(fn);\n      } catch (e) { this.log('[Flow]', id, e.message); }\n    };");
      modified = true;
      break;
    }
  }

  // Fix 3: Remove orphan "} catch (e) { this.log('[Flow]', id, e.message); }" lines
  content = content.replace(/\n\s*\} catch \(e\) \{ this\.log\('\[Flow\]', id, e\.message\);\s*\}\n/g, '\n');

  // Fix 4: Corrupted IIFE chains for action cards
  // Pattern: try {  const card = (() => { try { return ; } catch ... })(); ... }
  // Replace with: try { const card = this.homey.flow.getActionCard('drivername_actionname'); ... }
  const iifeRegex = /try\s*\{\s*const card = \(\(\) => \{ try \{ return ; \} catch \(e\) \{ return null; \} \}\)\(\);[^\n]*/g;
  if (iifeRegex.test(content)) {
    // Find action names from catch blocks
    content = content.replace(
      /try\s*\{\s*const card = \(\(\) => \{ try \{ return ; \} catch \(e\) \{ return null; \} \}\)\(\);[^\n]*\n(\s*if \(card\) \{[\s\S]*?\}\s*\}\s*\} catch \(e\) \{ this\.error\('Action ([^']+)':)/g,
      (match, after, actionName) => {
        return `try {\n      const card = this.homey.flow.getActionCard('${dir}_${actionName}');\n${after}`;
      }
    );
    modified = true;
  }

  // Fix 5: Remove "Removed corrupted nested block" comments
  content = content.replace(/\s*\/\/ Removed corrupted nested block[^\n]*/g, '');

  // Fix 6: Remove empty lines left by removal
  content = content.replace(/\n{4,}/g, '\n\n\n');

  if (modified) {
    fs.writeFileSync(fp, content, 'utf8');
  }

  // Verify
  try {
    execSync(`node -c "${fp}"`, { stdio: 'pipe' });
    fixed++;
    console.log('✅ Fixed:', dir);
  } catch (e) {
    failed++;
    const line = e.message.match(/:(\d+)/)?.[1];
    console.log('❌ Still broken:', dir, '- line', line);
  }
});

console.log(`\nTotal: ${dirs.length} | OK: ${alreadyOk} | Fixed: ${fixed} | Still broken: ${failed}`);