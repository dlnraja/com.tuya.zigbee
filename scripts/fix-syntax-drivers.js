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
let skipped = 0;

dirs.forEach(dir => {
  const fp = path.join(driversDir, dir, 'driver.js');
  let content = fs.readFileSync(fp, 'utf8');
  let modified = false;

  // Pattern: Missing closing brace for getDeviceById before async onInit
  // The catch block closes but the getDeviceById method doesn't
  const pattern = /(return null;\s*\n\s*\})\s*\n(\s*async onInit\(\))/;
  if (pattern.test(content)) {
    content = content.replace(pattern, '$1\n    }\n$2');
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(fp, content, 'utf8');
    // Verify syntax
    try {
      execSync(`node -c "${fp}"`, { stdio: 'pipe' });
      fixed++;
      console.log('✅ Fixed:', dir);
    } catch (e) {
      console.log('⚠️ Fixed but still has errors:', dir, e.message.split('\n')[0]);
    }
  } else {
    // Check if it already passes syntax check
    try {
      execSync(`node -c "${fp}"`, { stdio: 'pipe' });
      skipped++;
    } catch (e) {
      console.log('❌ Could not auto-fix:', dir, '- Line:', e.message.match(/:(\d+)/)?.[1]);
    }
  }
});

console.log(`\nTotal: ${dirs.length} | Fixed: ${fixed} | Already OK: ${skipped}`);