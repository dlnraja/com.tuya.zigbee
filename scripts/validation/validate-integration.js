#!/usr/bin/env node

/**
 * VALIDATION COMPLÈTE INTÉGRATION
 * 
 * Vérifie que tous les systèmes sont bien intégrés
 */

import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';

const PROJECT_ROOT = path.resolve(process.cwd(), '../..');

const CHECKS = {
  'IAS Zone Fix': {
    files: [
      'lib/IASZoneEnroller.js',
      'lib/IASZoneEnrollerEnhanced.js',
      'docs/fixes/PETER_IAS_ZONE_FIX_COMPLETE.md'
    ],
    patterns: ['zoneEnrollResponse', 'proactive']
  },
  'HealthCheck': {
    files: [
      'lib/HealthCheck.js'
    ],
    patterns: ['check()', 'connectivity', 'power', 'functionality', 'network']
  },
  'FallbackSystem': {
    files: [
      'lib/FallbackSystem.js'
    ],
    patterns: ['executeWithFallback', 'iasEnrollWithFallback', 'exponential']
  },
  'Enhanced DP Engine': {
    files: [
      'lib/tuya-engine/enhanced-dp-handler.js'
    ],
    patterns: ['parseDatapoint', 'TYPE_RAW', 'TYPE_BOOL', 'TYPE_VALUE']
  },
  'Node.js Tools': {
    files: [
      'scripts/node-tools/package.json',
      'scripts/node-tools/orchestrator-main.js',
      'scripts/node-tools/audit-complete.js'
    ],
    patterns: ['chalk', 'commander', 'glob', 'ora']
  }
};

async function validateSystem(name, config) {
  console.log(`\n🔍 Validating ${name}...`);
  
  let allFilesExist = true;
  let allPatternsFound = true;
  
  // Check files exist
  for (const file of config.files) {
    const filePath = path.join(PROJECT_ROOT, file);
    const exists = await fs.access(filePath).then(() => true).catch(() => false);
    
    if (exists) {
      console.log(`  ✅ ${file}`);
    } else {
      console.log(`  ❌ ${file} - NOT FOUND`);
      allFilesExist = false;
    }
  }
  
  // Check patterns in first file
  if (allFilesExist && config.files.length > 0) {
    const firstFile = path.join(PROJECT_ROOT, config.files[0]);
    const content = await fs.readFile(firstFile, 'utf8');
    
    for (const pattern of config.patterns) {
      if (content.includes(pattern)) {
        console.log(`  ✅ Pattern: ${pattern}`);
      } else {
        console.log(`  ⚠️  Pattern: ${pattern} - NOT FOUND`);
        allPatternsFound = false;
      }
    }
  }
  
  const status = allFilesExist && allPatternsFound ? '✅ PASSED' : '❌ FAILED';
  console.log(`  ${status}`);
  
  return allFilesExist && allPatternsFound;
}

async function main() {
  console.log('🎯 VALIDATION COMPLÈTE INTÉGRATION v3.1.1\n');
  console.log('═'.repeat(60));
  
  const results = {};
  
  for (const [name, config] of Object.entries(CHECKS)) {
    results[name] = await validateSystem(name, config);
  }
  
  console.log('\n' + '═'.repeat(60));
  console.log('\n📊 RÉSULTATS FINAUX:\n');
  
  let passed = 0;
  let failed = 0;
  
  for (const [name, result] of Object.entries(results)) {
    const status = result ? '✅ PASSED' : '❌ FAILED';
    console.log(`  ${status} - ${name}`);
    if (result) passed++;
    else failed++;
  }
  
  console.log('\n' + '═'.repeat(60));
  console.log(`\n✅ Passed: ${passed}/${Object.keys(CHECKS).length}`);
  console.log(`❌ Failed: ${failed}/${Object.keys(CHECKS).length}`);
  
  const percentage = (passed / Object.keys(CHECKS).length * 100).toFixed(1);
  console.log(`📈 Success Rate: ${percentage}%`);
  
  if (failed === 0) {
    console.log('\n🎉 ALL SYSTEMS INTEGRATED SUCCESSFULLY!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some systems need attention');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
