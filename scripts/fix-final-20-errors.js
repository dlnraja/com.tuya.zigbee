#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

/**
 * MEGA FIX FINAL - Corriger les 20 dernières erreurs parsing
 */

const fixes = [
  // 1. air_quality_monitor - ligne 189 unexpected (
  {
    file: 'drivers/air_quality_monitor/device.js',
    search: /async triggerFlowCard\(cardId, tokens = \{\}\) \{/,
    replace: 'async triggerFlowCard(cardId, tokens = {}) {',
    description: 'Fix triggerFlowCard syntax'
  },

  // 2. contact_alarm - ligne 225 unexpected (
  {
    file: 'drivers/contact_alarm/device.js',
    search: /async triggerFlowCard\(cardId, tokens = \{\}\) \{/,
    replace: 'async triggerFlowCard(cardId, tokens = {}) {',
    description: 'Fix triggerFlowCard syntax'
  },

  // 3. curtain_motor - ligne 252 unexpected (
  {
    file: 'drivers/curtain_motor/device.js',
    search: /async triggerFlowCard\(cardId, tokens = \{\}\) \{/,
    replace: 'async triggerFlowCard(cardId, tokens = {}) {',
    description: 'Fix triggerFlowCard syntax'
  },

  // 4. doorbell_button - ligne 188 unexpected (
  {
    file: 'drivers/doorbell_button/device.js',
    search: /async triggerFlowCard\(cardId, tokens = \{\}\) \{/,
    replace: 'async triggerFlowCard(cardId, tokens = {}) {',
    description: 'Fix triggerFlowCard syntax'
  },

  // 5. radiator_valve_smart - ligne 31 unexpected catch
  {
    file: 'drivers/radiator_valve_smart/device.js',
    search: /try\s*{\s*await this\.configureAttributeReporting\(\[\{/,
    replace: 'try {\n      await this.configureAttributeReporting([{',
    description: 'Fix try/catch structure'
  },

  // 6. scene_controller_wireless - ligne 163 unexpected catch
  {
    file: 'drivers/scene_controller_wireless/device.js',
    search: /}\s*catch\s*\(\s*err\s*\)\s*{\s*this\.error\('Await error:', err\);\s*}/,
    replace: '',
    description: 'Remove orphan catch block'
  },

  // 7. switch_touch_3gang - ligne 55 unexpected )
  {
    file: 'drivers/switch_touch_3gang/device.js',
    search: /\/\/\s*this\.registerCapability.*?\n\s*\/\/\s*endpoint:\s*3\s*\n\s*\}\);/,
    replace: '// this.registerCapability(\'onoff.switch_3\', 6, {\n//       endpoint: 3\n//     });',
    description: 'Fix commented code'
  },

  // 8. usb_outlet_1gang - ligne 85 unexpected :
  {
    file: 'drivers/usb_outlet_1gang/device.js',
    search: /reportOpts:\s*{/,
    replace: '// reportOpts: {',
    description: 'Comment out orphan reportOpts'
  },

  // 9. water_valve_controller - ligne 74 unexpected catch
  {
    file: 'drivers/water_valve_controller/device.js',
    search: /}\s*catch\s*\(\s*err\s*\)\s*{\s*this\.error\(err\);\s*}\s*\]\);/,
    replace: '}]);',
    description: 'Remove inline catch from array'
  }
];

console.log('🔧 MEGA FIX - Final 20 Errors');
console.log('================================\n');

let successCount = 0;
let errorCount = 0;

fixes.forEach((fix, index) => {
  console.log(`[${index + 1}/${fixes.length}] ${fix.description}`);
  console.log(`   File: ${fix.file}`);

  const filePath = path.join(__dirname, '..', fix.file);

  if (!fs.existsSync(filePath)) {
    console.log(`   ❌ File not found\n`);
    errorCount++;
    return;
  }

  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;

    if (typeof fix.search === 'string') {
      if (content.includes(fix.search)) {
        content = content.replace(fix.search, fix.replace);
      }
    } else {
      content = content.replace(fix.search, fix.replace);
    }

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`   ✅ Fixed\n`);
      successCount++;
    } else {
      console.log(`   ⏭️  Pattern not found (may be already fixed)\n`);
    }
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}\n`);
    errorCount++;
  }
});

console.log('================================');
console.log(`✅ Success: ${successCount}`);
console.log(`❌ Errors: ${errorCount}`);
console.log(`⏭️  Skipped: ${fixes.length - successCount - errorCount}`);

process.exit(errorCount > 0 ? 1 : 0);
