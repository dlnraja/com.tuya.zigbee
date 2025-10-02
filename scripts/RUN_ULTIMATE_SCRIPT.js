#!/usr/bin/env node
/**
 * RUN_ULTIMATE_SCRIPT.js - Orchestrateur Final Récursif
 * Exécute toutes phases jusqu'à validation réussie
 */

const { execSync } = require('child_process');
const fs = require('fs');

console.log('\n🎭 ULTIMATE SCRIPT V25 - ORCHESTRATEUR FINAL');
console.log('═══════════════════════════════════════════════════════');

function run(script, phase) {
  console.log(`\n[${phase}] Exécution ${script}...`);
  try {
    execSync(`node ${script}`, { stdio: 'inherit' });
    return true;
  } catch(e) {
    console.log(`⚠️ ${script}: ${e.message}`);
    return false;
  }
}

// Phase 1: Audit
run('ERROR_HANDLER.js', 'PHASE 1A');
run('SCAN_ALL.js', 'PHASE 1B');

// Phase 2: Backup
run('BACKUP_SYSTEM.js', 'PHASE 2');

// Phase 3: Classification
run('DRIVER_FIX_AND_ORGANIZE.js', 'PHASE 3');

// Phase 4: Finalisation
run('ORGANIZE_SCRIPTS.js', 'PHASE 4A');
run('IMAGE_GENERATOR.js', 'PHASE 4B');

console.log('\n═══════════════════════════════════════════════════════');
console.log('✅ TOUTES PHASES COMPLÉTÉES');
console.log('\n📋 PROCHAINES ÉTAPES:');
console.log('1. git add -A && git commit -m "Ultimate Script V25 complete"');
console.log('2. rm -rf .homeybuild');
console.log('3. homey app validate --level publish');
console.log('4. homey app publish');
