#!/usr/bin/env node

/**
 * MASTER FIX SCRIPT - Applies ALL corrections in correct order
 * 
 * This script is the single source of truth for fixing:
 * 1. Double suffix folder names
 * 2. driver.compose.json IDs and paths
 * 3. Duplicate device args in driver.flow.compose.json
 * 4. Orphaned [[device]] refs in titleFormatted
 * 5. app.json consistency
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║         MASTER FIX SCRIPT - Complete Repair Suite         ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

const rootDir = path.join(__dirname, '..', '..');
const driversDir = path.join(rootDir, 'drivers');

// ============================================================================
// STEP 1: DETECT AND FIX DOUBLE SUFFIXES IN FOLDER NAMES
// ============================================================================

function step1_fixDoubleSuffixFolders() {
  console.log('🔧 STEP 1: Fixing double suffix folder names\n');
  
  const drivers = fs.readdirSync(driversDir);
  const renames = [];
  
  for (const driver of drivers) {
    const fullPath = path.join(driversDir, driver);
    const stat = fs.statSync(fullPath);
    
    if (!stat.isDirectory()) continue;
    
    let newName = driver;
    let modified = false;
    
    // Apply all suffix fixes
    const fixes = [
      { pattern: /^ikea_ikea_/, replacement: 'ikea_' },
      { pattern: /_other_other$/, replacement: '_other' },
      { pattern: /_aaa_aaa$/, replacement: '_aaa' },
      { pattern: /_aa_aa$/, replacement: '_aa' },
      { pattern: /_internal_internal$/, replacement: '_internal' }
    ];
    
    for (const fix of fixes) {
      if (fix.pattern.test(newName)) {
        newName = String(newName).replace(fix.pattern, fix.replacement);
        modified = true;
      }
    }
    
    if (modified) {
      renames.push({
        old: driver,
        new: newName,
        oldPath: fullPath,
        newPath: path.join(driversDir, newName)
      });
    }
  }
  
  if (renames.length > 0) {
    console.log(`Found ${renames.length} folders to rename:\n`);
    
    for (const rename of renames) {
      try {
        fs.renameSync(rename.oldPath, rename.newPath);
        console.log(`  ✅ ${rename.old} → ${rename.new}`);
      } catch (error) {
        console.error(`  ❌ Error renaming ${rename.old}: ${error.message}`);
      }
    }
  } else {
    console.log('  ✅ No double suffix folders found');
  }
  
  console.log(`\n✅ Step 1 complete: ${renames.length} folders renamed\n`);
  return renames.length;
}

// ============================================================================
// STEP 2: FIX driver.compose.json FILES
// ============================================================================

function step2_fixDriverComposeJson() {
  console.log('🔧 STEP 2: Fixing driver.compose.json files\n');
  
  const drivers = fs.readdirSync(driversDir);
  let fixedCount = 0;
  
  for (const driverFolder of drivers) {
    const fullPath = path.join(driversDir, driverFolder);
    const stat = fs.statSync(fullPath);
    
    if (!stat.isDirectory()) continue;
    
    const composeFile = path.join(fullPath, 'driver.compose.json');
    
    if (!fs.existsSync(composeFile)) continue;
    
    try {
      let content = fs.readFileSync(composeFile, 'utf8');
      const originalContent = content;
      
      // Apply all double suffix fixes
      content = String(content).replace(/ikea_ikea_/g, 'ikea_');
      content = String(content).replace(/_other_other/g, '_other');
      content = String(content).replace(/_aaa_aaa/g, '_aaa');
      content = String(content).replace(/_aa_aa/g, '_aa');
      content = String(content).replace(/_internal_internal/g, '_internal');
      
      if (content !== originalContent) {
        fs.writeFileSync(composeFile, content, 'utf8');
        console.log(`  ✅ Fixed: ${driverFolder}/driver.compose.json`);
        fixedCount++;
      }
    } catch (error) {
      console.error(`  ❌ Error in ${driverFolder}: ${error.message}`);
    }
  }
  
  console.log(`\n✅ Step 2 complete: ${fixedCount} files fixed\n`);
  return fixedCount;
}

// ============================================================================
// STEP 3: REMOVE DEVICE ARGS FROM driver.flow.compose.json
// ============================================================================

function step3_removeDeviceArgs() {
  console.log('🔧 STEP 3: Removing device args from driver.flow.compose.json\n');
  
  const drivers = fs.readdirSync(driversDir);
  let totalRemoved = 0;
  let filesModified = 0;
  
  for (const driverFolder of drivers) {
    const fullPath = path.join(driversDir, driverFolder);
    const stat = fs.statSync(fullPath);
    
    if (!stat.isDirectory()) continue;
    
    const flowFile = path.join(fullPath, 'driver.flow.compose.json');
    
    if (!fs.existsSync(flowFile)) continue;
    
    try {
      const data = JSON.parse(fs.readFileSync(flowFile, 'utf8'));
      let fileModified = false;
      let removedInFile = 0;
      
      // Process all flow card types
      for (const cardType of ['actions', 'triggers', 'conditions']) {
        if (!data[cardType] || !Array.isArray(data[cardType])) continue;
        
        for (const card of data[cardType]) {
          if (!card.args) continue;
          
          const beforeCount = card.args.length;
          card.args = card.args.filter(arg => arg.name !== 'device');
          const afterCount = card.args.length;
          
          if (beforeCount !== afterCount) {
            const removed = beforeCount - afterCount;
            removedInFile += removed;
            fileModified = true;
          }
        }
      }
      
      if (fileModified) {
        fs.writeFileSync(flowFile, JSON.stringify(data, null, 2), 'utf8');
        console.log(`  ✅ ${driverFolder}: removed ${removedInFile} device args`);
        filesModified++;
        totalRemoved += removedInFile;
      }
    } catch (error) {
      console.error(`  ❌ Error in ${driverFolder}: ${error.message}`);
    }
  }
  
  console.log(`\n✅ Step 3 complete: ${totalRemoved} device args removed from ${filesModified} files\n`);
  return totalRemoved;
}

// ============================================================================
// STEP 4: FIX [[device]] IN titleFormatted
// ============================================================================

function step4_fixTitleFormatted() {
  console.log('🔧 STEP 4: Fixing [[device]] refs in titleFormatted\n');
  
  const drivers = fs.readdirSync(driversDir);
  let totalFixed = 0;
  let filesModified = 0;
  
  for (const driverFolder of drivers) {
    const fullPath = path.join(driversDir, driverFolder);
    const stat = fs.statSync(fullPath);
    
    if (!stat.isDirectory()) continue;
    
    const flowFile = path.join(fullPath, 'driver.flow.compose.json');
    
    if (!fs.existsSync(flowFile)) continue;
    
    try {
      const data = JSON.parse(fs.readFileSync(flowFile, 'utf8'));
      let fileModified = false;
      
      for (const cardType of ['actions', 'triggers', 'conditions']) {
        if (!data[cardType] || !Array.isArray(data[cardType])) continue;
        
        for (const card of data[cardType]) {
          if (!card.titleFormatted) continue;
          
          for (const lang in card.titleFormatted) {
            const titleFormatted = card.titleFormatted[lang];
            
            if (titleFormatted && titleFormatted.includes('[[device]]')) {
              const hasDeviceArg = card.args && card.args.some(arg => arg.name === 'device');
              
              if (!hasDeviceArg) {
                const newTitle = String(titleFormatted).replace(/\[\[device\]\]\s*/g, '').trim();
                card.titleFormatted[lang] = newTitle;
                fileModified = true;
                totalFixed++;
              }
            }
          }
        }
      }
      
      if (fileModified) {
        fs.writeFileSync(flowFile, JSON.stringify(data, null, 2), 'utf8');
        console.log(`  ✅ ${driverFolder}: fixed titleFormatted`);
        filesModified++;
      }
    } catch (error) {
      console.error(`  ❌ Error in ${driverFolder}: ${error.message}`);
    }
  }
  
  console.log(`\n✅ Step 4 complete: ${totalFixed} titleFormatted fixed in ${filesModified} files\n`);
  return totalFixed;
}

// ============================================================================
// STEP 5: REBUILD app.json
// ============================================================================

function step5_rebuildAppJson() {
  console.log('🔧 STEP 5: Rebuilding app.json\n');
  
  try {
    // Delete old app.json
    const appJsonPath = path.join(rootDir, 'app.json');
    if (fs.existsSync(appJsonPath)) {
      fs.unlinkSync(appJsonPath);
      console.log('  🗑️  Deleted old app.json');
    }
    
    // Create stub from .homeycompose
    const composeAppPath = path.join(rootDir, '.homeycompose', 'app.json');
    const baseApp = JSON.parse(fs.readFileSync(composeAppPath, 'utf8'));
    
    const stubApp = {
      ...baseApp,
      drivers: [],
      flow: { actions: [], triggers: [], conditions: [] }
    };
    
    fs.writeFileSync(appJsonPath, JSON.stringify(stubApp, null, 2), 'utf8');
    console.log('  ✅ Created stub app.json');
    
    // Run homey app build
    console.log('  🔨 Running homey app build...');
    execSync('npx homey app build', {
      cwd: rootDir,
      stdio: 'inherit'
    });
    
    console.log('\n✅ Step 5 complete: app.json rebuilt\n');
    return true;
  } catch (error) {
    console.error(`  ❌ Build failed: ${error.message}`);
    return false;
  }
}

// ============================================================================
// STEP 6: FIX REMAINING DOUBLE SUFFIXES IN app.json
// ============================================================================

function step6_fixAppJsonSuffixes() {
  console.log('🔧 STEP 6: Fixing remaining double suffixes in app.json\n');
  
  const appJsonPath = path.join(rootDir, 'app.json');
  let appJsonStr = fs.readFileSync(appJsonPath, 'utf8');
  
  const before = appJsonStr;
  
  // Apply all fixes
  appJsonStr = String(appJsonStr).replace(/ikea_ikea_/g, 'ikea_');
  appJsonStr = String(appJsonStr).replace(/_other_other/g, '_other');
  appJsonStr = String(appJsonStr).replace(/_aaa_aaa/g, '_aaa');
  appJsonStr = String(appJsonStr).replace(/_aa_aa/g, '_aa');
  appJsonStr = String(appJsonStr).replace(/_internal_internal/g, '_internal');
  
  const replacements = before.length - appJsonStr.length;
  
  if (replacements > 0) {
    fs.writeFileSync(appJsonPath, appJsonStr, 'utf8');
    console.log(`  ✅ Fixed ${replacements} character replacements in app.json`);
  } else {
    console.log('  ✅ No double suffixes found in app.json');
  }
  
  console.log('\n✅ Step 6 complete\n');
  return replacements;
}

// ============================================================================
// STEP 7: VALIDATE
// ============================================================================

function step7_validate() {
  console.log('🔧 STEP 7: Validating app\n');
  
  try {
    execSync('npx homey app validate --level publish', {
      cwd: rootDir,
      stdio: 'inherit'
    });
    
    console.log('\n✅ Step 7 complete: Validation passed\n');
    return true;
  } catch (error) {
    console.error('\n❌ Validation failed\n');
    return false;
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  const startTime = Date.now();
  
  const results = {
    foldersRenamed: 0,
    composeJsonFixed: 0,
    deviceArgsRemoved: 0,
    titleFormattedFixed: 0,
    appJsonRebuilt: false,
    appJsonSuffixesFixed: 0,
    validated: false
  };
  
  try {
    results.foldersRenamed = step1_fixDoubleSuffixFolders();
    results.composeJsonFixed = step2_fixDriverComposeJson();
    results.deviceArgsRemoved = step3_removeDeviceArgs();
    results.titleFormattedFixed = step4_fixTitleFormatted();
    results.appJsonRebuilt = step5_rebuildAppJson();
    
    if (results.appJsonRebuilt) {
      results.appJsonSuffixesFixed = step6_fixAppJsonSuffixes();
      results.validated = step7_validate();
    }
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                    EXECUTION SUMMARY                       ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    console.log(`  ⏱️  Duration: ${duration}s`);
    console.log(`  📁 Folders renamed: ${results.foldersRenamed}`);
    console.log(`  📝 driver.compose.json fixed: ${results.composeJsonFixed}`);
    console.log(`  ✂️  Device args removed: ${results.deviceArgsRemoved}`);
    console.log(`  🔤 titleFormatted fixed: ${results.titleFormattedFixed}`);
    console.log(`  🔨 app.json rebuilt: ${results.appJsonRebuilt ? 'YES' : 'NO'}`);
    console.log(`  🔧 app.json suffixes fixed: ${results.appJsonSuffixesFixed}`);
    console.log(`  ✅ Validation: ${results.validated ? 'PASSED' : 'FAILED'}`);
    
    if (results.validated) {
      console.log('\n🎉 ALL FIXES APPLIED SUCCESSFULLY!\n');
      process.exit(0);
    } else {
      console.log('\n⚠️  Some steps failed - review output above\n');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };
