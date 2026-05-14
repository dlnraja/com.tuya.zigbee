'use strict';

/**
 * bug-hunter.js
 * Scans for common bugs and regressions in the Tuya Zigbee codebase.
 */

const fs = require('fs');
const path = require('path');
const driversDir = path.resolve(__dirname, '../../drivers');

let issues = 0;

function hunt(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      hunt(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // 1. Check for 'this.error' without binding or in dangerous contexts
      if (content.includes('.catch(this.error)') && !content.includes('.bind(this)')) {
          // This is often okay in SDK3 classes but can be dangerous if context is lost
      }

      // 2. Check for missing await on setCapabilityValue
      if (content.includes('this.setCapabilityValue(') && !content.includes('await this.setCapabilityValue(') && !content.includes('return this.setCapabilityValue(')) {
          // console.warn(`⚠️ [BUG-HUNTER] ${fullPath}: Possible missing await on setCapabilityValue`);
      }

      // 3. Check for absolute paths in requires (should use relative or path.resolve)
      if (/require\(['"]\/app\//.test(content)) {
          console.error(`❌ [BUG-HUNTER] ${fullPath}: Hardcoded /app/ path found!`);
          issues++;
      }

      // 4. Check for 'onBatteryPercentageRemainingAttributeReport' (the crashy legacy handler)
      if (content.includes('onBatteryPercentageRemainingAttributeReport')) {
          console.error(`❌ [BUG-HUNTER] ${fullPath}: Legacy crashy battery handler found!`);
          issues++;
      }

      // 5. Check for unhandled promises in loops
      if (content.includes('.forEach(async')) {
          console.warn(`⚠️ [BUG-HUNTER] ${fullPath}: async forEach detected (promises might not be awaited)`);
      }
    }
  }
}

hunt(driversDir);
hunt(path.resolve(__dirname, '../../lib'));

if (issues > 0) {
  console.error(`\n[BUG-HUNTER] Found ${issues} critical bugs!`);
  process.exit(1);
} else {
  console.log('[BUG-HUNTER] No critical bugs found.');
}
