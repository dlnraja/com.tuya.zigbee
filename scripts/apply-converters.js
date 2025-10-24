#!/usr/bin/env node
'use strict';

/**
 * AUTO-APPLY BATTERY & ILLUMINANCE CONVERTERS
 * 
 * Scans all device.js files and applies:
 * - fromZclBatteryPercentageRemaining() for battery
 * - fromZigbeeMeasuredValue() for illuminance
 * 
 * Usage: node scripts/apply-converters.js
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');
let modified = 0;
let skipped = 0;
let errors = 0;

// Patterns to find and replace
const BATTERY_PATTERNS = [
  // Pattern 1: Manual division by 2
  {
    find: /value\s*<=\s*100\s*\?\s*value\s*:\s*value\s*\/\s*2/g,
    replace: 'fromZclBatteryPercentageRemaining(value)'
  },
  // Pattern 2: Math.max(0, Math.min(100, percentage))
  {
    find: /const\s+percentage\s*=\s*value\s*<=\s*100\s*\?\s*value\s*:\s*value\s*\/\s*2;\s*return\s+Math\.max\(0,\s*Math\.min\(100,\s*percentage\)\);/g,
    replace: 'return fromZclBatteryPercentageRemaining(value);'
  },
  // Pattern 3: Direct Math.max/min without variable
  {
    find: /return\s+Math\.max\(0,\s*Math\.min\(100,\s*value\s*<=\s*100\s*\?\s*value\s*:\s*value\s*\/\s*2\)\);/g,
    replace: 'return fromZclBatteryPercentageRemaining(value);'
  }
];

const ILLUMINANCE_PATTERNS = [
  // Pattern 1: Manual log-lux calculation
  {
    find: /Math\.pow\(10,\s*\(value\s*-\s*1\)\s*\/\s*10000\)/g,
    replace: 'fromZigbeeMeasuredValue(value)'
  },
  // Pattern 2: With variable
  {
    find: /const\s+lux\s*=\s*Math\.pow\(10,\s*\(value\s*-\s*1\)\s*\/\s*10000\);\s*return\s+lux;/g,
    replace: 'return fromZigbeeMeasuredValue(value);'
  }
];

/**
 * Check if file already has converter import
 */
function hasConverterImport(content, converter) {
  if (converter === 'battery') {
    return content.includes('fromZclBatteryPercentageRemaining');
  }
  if (converter === 'illuminance') {
    return content.includes('fromZigbeeMeasuredValue');
  }
  return false;
}

/**
 * Add converter import to file
 */
function addConverterImport(content, converter) {
  const lines = content.split('\n');
  let insertIndex = -1;
  
  // Find last require() statement
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('require(') && !lines[i].trim().startsWith('//')) {
      insertIndex = i;
    }
    // Stop at class definition
    if (lines[i].includes('class ') && lines[i].includes('extends')) {
      break;
    }
  }
  
  if (insertIndex === -1) {
    // No requires found, insert after 'use strict'
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("'use strict'")) {
        insertIndex = i + 1;
        break;
      }
    }
  }
  
  if (insertIndex === -1) return content; // Can't find insertion point
  
  // Build import statement
  let importStatement = '';
  if (converter === 'battery') {
    importStatement = "const { fromZclBatteryPercentageRemaining } = require('../../lib/tuya-engine/converters/battery');";
  } else if (converter === 'illuminance') {
    importStatement = "const { fromZigbeeMeasuredValue } = require('../../lib/tuya-engine/converters/illuminance');";
  }
  
  // Insert after last require
  lines.splice(insertIndex + 1, 0, importStatement);
  
  return lines.join('\n');
}

/**
 * Process a single device.js file
 */
function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Check if file has battery or illuminance capabilities
    const hasBattery = content.includes('measure_battery');
    const hasIlluminance = content.includes('measure_luminance') || content.includes('measure_illuminance');
    
    if (!hasBattery && !hasIlluminance) {
      return 'skip'; // No relevant capabilities
    }
    
    // Apply battery converter
    if (hasBattery) {
      const hasBatteryImport = hasConverterImport(content, 'battery');
      let batteryModified = false;
      
      for (const pattern of BATTERY_PATTERNS) {
        const before = content;
        content = String(content).replace(pattern.find, pattern.replace);
        if (content !== before) {
          batteryModified = true;
        }
      }
      
      if (batteryModified && !hasBatteryImport) {
        content = addConverterImport(content, 'battery');
        modified = true;
      }
    }
    
    // Apply illuminance converter
    if (hasIlluminance) {
      const hasIlluminanceImport = hasConverterImport(content, 'illuminance');
      let illuminanceModified = false;
      
      for (const pattern of ILLUMINANCE_PATTERNS) {
        const before = content;
        content = String(content).replace(pattern.find, pattern.replace);
        if (content !== before) {
          illuminanceModified = true;
        }
      }
      
      if (illuminanceModified && !hasIlluminanceImport) {
        content = addConverterImport(content, 'illuminance');
        modified = true;
      }
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      return 'modified';
    }
    
    return 'skip';
    
  } catch (err) {
    console.error(`❌ Error processing ${filePath}:`, err.message);
    return 'error';
  }
}

/**
 * Walk directory recursively
 */
function walkDir(dir, callback) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      walkDir(filePath, callback);
    } else if (stat.isFile() && file === 'device.js') {
      callback(filePath);
    }
  }
}

// Main execution
console.log('🔧 AUTO-APPLYING CONVERTERS TO ALL DRIVERS...\n');

walkDir(DRIVERS_DIR, (filePath) => {
  const relativePath = path.relative(DRIVERS_DIR, filePath);
  const result = processFile(filePath);
  
  if (result === 'modified') {
    console.log(`✅ ${relativePath}`);
    modified++;
  } else if (result === 'skip') {
    skipped++;
  } else if (result === 'error') {
    console.log(`❌ ${relativePath}`);
    errors++;
  }
});

console.log('\n' + '='.repeat(60));
console.log(`📊 SUMMARY:`);
console.log(`   ✅ Modified: ${modified}`);
console.log(`   ⏭️  Skipped: ${skipped}`);
console.log(`   ❌ Errors: ${errors}`);
console.log('='.repeat(60));

if (modified > 0) {
  console.log('\n✅ Converters applied successfully!');
  console.log('   Next step: git add -A && git commit');
} else {
  console.log('\n⚠️  No files modified (already up-to-date?)');
}

process.exit(errors > 0 ? 1 : 0);
