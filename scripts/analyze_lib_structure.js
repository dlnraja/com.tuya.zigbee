#!/usr/bin/env node
'use strict';

/**
 * ANALYZE LIB STRUCTURE
 * 
 * Analyzes all JS files in lib/ and obsolete/
 * Identifies duplicates, similar files, and optimization opportunities
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const LIB_DIR = path.join(ROOT, 'lib');

console.log('🔍 ANALYZING LIB STRUCTURE');
console.log('═══════════════════════════════════════════════════\n');

// ============================================================================
// SCAN ALL JS FILES
// ============================================================================

function scanDirectory(dir, prefix = '') {
  const files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...scanDirectory(fullPath, prefix + item + '/'));
    } else if (item.endsWith('.js')) {
      const size = stat.size;
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n').length;
      
      files.push({
        name: item,
        path: prefix + item,
        fullPath: fullPath,
        size: size,
        lines: lines,
        content: content
      });
    }
  }
  
  return files;
}

const allFiles = scanDirectory(LIB_DIR);

console.log(`Found ${allFiles.length} JS files in lib/\n`);

// ============================================================================
// CATEGORIZE FILES
// ============================================================================

const categories = {
  battery: [],
  iasZone: [],
  tuya: [],
  flow: [],
  device: [],
  manager: [],
  helper: [],
  detector: [],
  protocol: [],
  utility: [],
  obsolete: [],
  backup: [],
  other: []
};

for (const file of allFiles) {
  const name = file.name.toLowerCase();
  
  if (name.includes('battery')) {
    categories.battery.push(file);
  } else if (name.includes('iaszone') || name.includes('ias_zone')) {
    categories.iasZone.push(file);
  } else if (name.includes('tuya')) {
    categories.tuya.push(file);
  } else if (name.includes('flow')) {
    categories.flow.push(file);
  } else if (name.includes('device')) {
    categories.device.push(file);
  } else if (name.includes('manager')) {
    categories.manager.push(file);
  } else if (name.includes('helper')) {
    categories.helper.push(file);
  } else if (name.includes('detector')) {
    categories.detector.push(file);
  } else if (name.includes('protocol') || name.includes('router')) {
    categories.protocol.push(file);
  } else if (name.includes('obsolete')) {
    categories.obsolete.push(file);
  } else if (name.includes('backup') || name.includes('.example')) {
    categories.backup.push(file);
  } else if (
    name.includes('utils') || 
    name.includes('logger') ||
    name.includes('promise') ||
    name.includes('sanitizer')
  ) {
    categories.utility.push(file);
  } else {
    categories.other.push(file);
  }
}

// ============================================================================
// DISPLAY CATEGORIES
// ============================================================================

console.log('═══════════════════════════════════════════════════');
console.log('FILE CATEGORIES');
console.log('═══════════════════════════════════════════════════\n');

for (const [category, files] of Object.entries(categories)) {
  if (files.length > 0) {
    console.log(`📁 ${category.toUpperCase()} (${files.length} files):`);
    files.forEach(f => {
      console.log(`   ${f.name.padEnd(50)} ${f.lines.toString().padStart(5)} lines  ${(f.size / 1024).toFixed(1).padStart(6)} KB`);
    });
    console.log('');
  }
}

// ============================================================================
// IDENTIFY DUPLICATES/SIMILAR
// ============================================================================

console.log('═══════════════════════════════════════════════════');
console.log('DUPLICATE/SIMILAR ANALYSIS');
console.log('═══════════════════════════════════════════════════\n');

const duplicateGroups = {
  'Battery Management': categories.battery,
  'IAS Zone Enrollment': categories.iasZone,
  'Tuya Integration': categories.tuya,
  'Flow Cards': categories.flow,
  'Device Types': categories.device
};

for (const [group, files] of Object.entries(duplicateGroups)) {
  if (files.length > 1) {
    console.log(`🔍 ${group}:`);
    console.log(`   Found ${files.length} related files`);
    
    // Analyze similarity
    const keywords = ['class', 'module.exports', 'constructor', 'async', 'require'];
    const analysis = files.map(f => {
      const counts = {};
      keywords.forEach(k => {
        const regex = new RegExp(k, 'g');
        const matches = f.content.match(regex);
        counts[k] = matches ? matches.length : 0;
      });
      return { file: f, counts };
    });
    
    analysis.forEach(a => {
      console.log(`   - ${a.file.name}`);
      console.log(`     Classes: ${a.counts.class}, Exports: ${a.counts['module.exports']}, Async: ${a.counts.async}`);
    });
    
    console.log('');
  }
}

// ============================================================================
// RECOMMENDATIONS
// ============================================================================

console.log('═══════════════════════════════════════════════════');
console.log('RECOMMENDATIONS');
console.log('═══════════════════════════════════════════════════\n');

console.log('🎯 CONSOLIDATION OPPORTUNITIES:\n');

console.log('1. Battery System (4 files → 1 unified):');
console.log('   Merge: BatteryCalculator, BatteryHelper, BatteryManager, BatteryMonitoringSystem');
console.log('   Into: → lib/battery/BatterySystem.js (unified)\n');

console.log('2. IAS Zone (5 files → 1 unified):');
console.log('   Merge: IASZoneEnroller*, IASZoneManager');
console.log('   Into: → lib/security/IASZoneSystem.js (unified)\n');

console.log('3. Tuya Integration (11 files → organized):');
console.log('   Keep: TuyaEF00Manager, TuyaSyncManager, TuyaMultiGangManager');
console.log('   Merge parsers: TuyaDPParser, TuyaDataPointParser → TuyaDataPointSystem.js');
console.log('   Folder: → lib/tuya/ (organized structure)\n');

console.log('4. Flow Cards (3 files → 1 unified):');
console.log('   Merge: AdvancedFlowCardManager, FlowCardManager, FlowTriggerHelpers');
console.log('   Into: → lib/flow/FlowSystem.js\n');

console.log('5. Device Types (4 files → organized):');
console.log('   Keep: ButtonDevice, PlugDevice, SensorDevice, SwitchDevice');
console.log('   Folder: → lib/devices/ (organized)\n');

console.log('6. Backup/Obsolete files:');
console.log('   Move to: → lib/_archive/\n');

// ============================================================================
// STATISTICS
// ============================================================================

const totalSize = allFiles.reduce((sum, f) => sum + f.size, 0);
const totalLines = allFiles.reduce((sum, f) => sum + f.lines, 0);

console.log('═══════════════════════════════════════════════════');
console.log('STATISTICS');
console.log('═══════════════════════════════════════════════════\n');

console.log(`Total files: ${allFiles.length}`);
console.log(`Total size: ${(totalSize / 1024).toFixed(1)} KB`);
console.log(`Total lines: ${totalLines}`);
console.log(`Average lines per file: ${Math.round(totalLines / allFiles.length)}`);
console.log('');

console.log('Potential consolidation savings:');
console.log(`  - Battery: 4 files → 1 file (save 3 files)`);
console.log(`  - IAS Zone: 5 files → 1 file (save 4 files)`);
console.log(`  - Tuya parsers: 3 files → 1 file (save 2 files)`);
console.log(`  - Flow: 3 files → 1 file (save 2 files)`);
console.log(`  - Total reduction: ~11 files (~18%)`);
console.log('');

// ============================================================================
// SAVE REPORT
// ============================================================================

const report = {
  timestamp: new Date().toISOString(),
  totalFiles: allFiles.length,
  totalSize: totalSize,
  totalLines: totalLines,
  categories: Object.entries(categories).reduce((obj, [k, v]) => {
    obj[k] = v.length;
    return obj;
  }, {}),
  recommendations: {
    consolidateBattery: true,
    consolidateIASZone: true,
    organizeTuya: true,
    consolidateFlow: true,
    organizeDevices: true
  }
};

fs.writeFileSync(
  path.join(ROOT, 'reports', 'lib-structure-analysis.json'),
  JSON.stringify(report, null, 2),
  'utf8'
);

console.log('✅ Report saved: reports/lib-structure-analysis.json');
console.log('');
