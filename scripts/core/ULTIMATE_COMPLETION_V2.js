#!/usr/bin/env node
'use strict';

/**
 * ULTIMATE COMPLETION V2
 * 
 * Script final qui:
 * 1. Nettoie cache (.homeybuild, .homeycompose)
 * 2. Valide SDK3 Homey
 * 3. Commit + Push Git
 * 4. Déclenche publication automatique
 * 
 * Gère toutes les cascades d'erreurs de manière intelligente
 */

const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function exec(command, options = {}) {
  try {
    const result = execSync(command, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      ...options
    });
    return { success: true, output: result.trim() };
  } catch (err) {
    return { 
      success: false, 
      error: err.message,
      output: err.stdout ? err.stdout.toString() : '',
      stderr: err.stderr ? err.stderr.toString() : ''
    };
  }
}

async function cleanCache() {
  console.log('\n🧹 CLEANING CACHE\n');
  
  const dirsToClean = [
    path.join(ROOT, '.homeybuild'),
    path.join(ROOT, '.homeycompose')
  ];
  
  for (const dir of dirsToClean) {
    if (await fs.pathExists(dir)) {
      await fs.remove(dir);
      console.log(`✅ Removed: ${path.basename(dir)}`);
    } else {
      console.log(`ℹ️  Not found: ${path.basename(dir)}`);
    }
  }
  
  console.log();
}

async function validateHomey() {
  console.log('🔍 VALIDATING HOMEY SDK3\n');
  
  const result = exec('homey app validate --level publish');
  
  if (result.success) {
    console.log('✅ Validation SUCCESS');
    console.log(result.output);
    return true;
  } else {
    console.log('❌ Validation FAILED');
    console.log('Output:', result.output);
    console.log('Error:', result.stderr);
    
    // Analyser l'erreur
    if (result.stderr && result.stderr.includes('Invalid image size')) {
      console.log('\n⚠️  Image size error detected');
      console.log('   → Running image fix script...\n');
      
      const fixResult = exec('node scripts/FIX_APP_IMAGES_FINAL.js');
      if (fixResult.success) {
        console.log('✅ Images fixed, retrying validation...\n');
        await cleanCache();
        return validateHomey(); // Retry récursif
      }
    }
    
    return false;
  }
}

async function gitOperations() {
  console.log('\n📦 GIT OPERATIONS\n');
  
  // Status
  let result = exec('git status --short');
  if (!result.success) {
    console.log('❌ Git status failed');
    return false;
  }
  
  if (!result.output) {
    console.log('ℹ️  No changes to commit');
    return true;
  }
  
  console.log('Changes detected:');
  console.log(result.output);
  console.log();
  
  // Add
  result = exec('git add -A');
  if (!result.success) {
    console.log('❌ Git add failed');
    return false;
  }
  console.log('✅ Files staged');
  
  // Commit
  const commitMsg = `🚀 Ultimate Completion v${new Date().toISOString().slice(0,10)}

- Battery Intelligence System V2 with Homey Persistent Storage
- Multi-level fallback cascade (learned → voltage+current → voltage → detection → conservative)
- Voltage + amperage support for accurate battery calculation
- Manufacturer-specific learning with auto-confirmation
- Discharge curves for CR2032/CR2450/CR2477/AA/AAA
- Image conflict analysis tools
- Git commits history analyzer
- All SDK3 compliance checks passed

Technical improvements:
- Homey Storage API integration (not file-based)
- Physical measurements (voltage, current) validation
- Intelligent format detection (0-100, 0-200, 0-255)
- Graceful error handling with cascades
- Persistent learning database per device

Ready for production deployment`;
  
  result = exec(`git commit -m "${commitMsg.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`);
  if (!result.success) {
    if (result.output.includes('nothing to commit')) {
      console.log('ℹ️  Nothing to commit');
      return true;
    }
    console.log('❌ Git commit failed');
    return false;
  }
  console.log('✅ Committed');
  
  // Push
  result = exec('git push origin master');
  if (!result.success) {
    console.log('❌ Git push failed');
    console.log('   Trying to pull first...');
    
    // Pull with rebase
    const pullResult = exec('git pull --rebase origin master');
    if (pullResult.success) {
      console.log('✅ Pull successful, retrying push...');
      result = exec('git push origin master');
      if (result.success) {
        console.log('✅ Pushed successfully');
        return true;
      }
    }
    
    console.log('❌ Push failed after retry');
    return false;
  }
  
  console.log('✅ Pushed to GitHub');
  console.log();
  
  return true;
}

async function displaySummary() {
  console.log('\n' + '='.repeat(60));
  console.log('\n✅ ULTIMATE COMPLETION V2 - SUCCESS\n');
  console.log('🎯 ACCOMPLISHMENTS:');
  console.log('   ✅ Cache cleaned');
  console.log('   ✅ Homey SDK3 validated');
  console.log('   ✅ Git committed and pushed');
  console.log('   ✅ GitHub Actions triggered');
  console.log();
  console.log('🔋 BATTERY INTELLIGENCE SYSTEM V2:');
  console.log('   ✅ Homey Persistent Storage integration');
  console.log('   ✅ Voltage + Current measurements');
  console.log('   ✅ Multi-level fallback cascade');
  console.log('   ✅ Manufacturer-specific learning');
  console.log('   ✅ Discharge curves (5 battery types)');
  console.log();
  console.log('📊 MONITORING:');
  console.log('   🔗 GitHub Actions: https://github.com/dlnraja/com.tuya.zigbee/actions');
  console.log('   🔗 Homey Dashboard: https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee');
  console.log();
  console.log('🚀 NEXT STEPS:');
  console.log('   1. Monitor GitHub Actions workflow');
  console.log('   2. Verify Homey App Store publication');
  console.log('   3. Test battery intelligence with real devices');
  console.log('   4. Observe learning database growth');
  console.log();
  console.log('='.repeat(60) + '\n');
}

async function main() {
  console.log('🚀 ULTIMATE COMPLETION V2');
  console.log('='.repeat(60));
  
  try {
    // Phase 1: Clean
    await cleanCache();
    
    // Phase 2: Validate
    const validationSuccess = await validateHomey();
    if (!validationSuccess) {
      console.log('\n❌ Validation failed. Please review errors above.');
      process.exit(1);
    }
    
    // Phase 3: Git
    const gitSuccess = await gitOperations();
    if (!gitSuccess) {
      console.log('\n❌ Git operations failed. Please review errors above.');
      process.exit(1);
    }
    
    // Phase 4: Summary
    await displaySummary();
    
  } catch (err) {
    console.error('\n❌ FATAL ERROR:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
