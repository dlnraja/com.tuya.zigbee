#!/usr/bin/env node

/**
 * FINAL CLEANUP AND PUBLISH
 * 
 * Nettoie, range, valide et prépare pour publication
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');

console.log('🧹 FINAL CLEANUP AND PUBLISH\n');
console.log('='.repeat(70) + '\n');

const cleanup = {
  removed: [],
  kept: [],
  errors: []
};

// 1. Supprimer docs/ (dans .gitignore)
console.log('📋 Step 1: Cleaning ignored directories\n');

const docsPath = path.join(ROOT, 'docs');
if (fs.existsSync(docsPath)) {
  try {
    fs.rmSync(docsPath, { recursive: true, force: true });
    cleanup.removed.push('docs/');
    console.log('✅ Removed docs/ (gitignored)\n');
  } catch (err) {
    console.log('⚠️  Could not remove docs/:', err.message, '\n');
  }
} else {
  console.log('✅ docs/ already clean\n');
}

// 2. Supprimer fichiers backup auto
console.log('📋 Step 2: Cleaning backup files\n');

const driversDir = path.join(ROOT, 'drivers');
const drivers = fs.readdirSync(driversDir).filter(d => {
  return fs.statSync(path.join(driversDir, d)).isDirectory();
});

let backupCount = 0;
drivers.forEach(driver => {
  const deviceBackup = path.join(driversDir, driver, 'device.js.backup-auto');
  if (fs.existsSync(deviceBackup)) {
    try {
      fs.unlinkSync(deviceBackup);
      backupCount++;
    } catch (err) {
      // Skip
    }
  }
});

console.log(`✅ Removed ${backupCount} .backup-auto files\n`);

// 3. Nettoyer reports anciens (garder les importants)
console.log('📋 Step 3: Organizing reports\n');

const reportsDir = path.join(ROOT, 'reports');
const importantReports = [
  'PRE_PUBLISH_VALIDATION.json',
  'MASTER_UPDATE_REPORT.json',
  'TUYA_CLUSTER_DRIVERS_REPORT.json',
  'DEEP_FORUM_ANALYSIS.json',
  'CAPABILITIES_ENRICHMENT.json',
  'SCRIPTS_INDEX.json'
];

if (fs.existsSync(reportsDir)) {
  const reports = fs.readdirSync(reportsDir);
  console.log(`   Found ${reports.length} reports`);
  console.log(`   Keeping ${importantReports.length} important reports\n`);
}

// 4. Vérifier .gitignore
console.log('📋 Step 4: Verifying .gitignore\n');

const gitignorePath = path.join(ROOT, '.gitignore');
let gitignore = fs.readFileSync(gitignorePath, 'utf8');

const requiredIgnores = [
  'docs/',
  '.homeybuild/',
  'node_modules/',
  '*.backup-auto',
  '.dev/'
];

let gitignoreUpdated = false;
requiredIgnores.forEach(pattern => {
  if (!gitignore.includes(pattern)) {
    gitignore += `\n${pattern}`;
    gitignoreUpdated = true;
    console.log(`   Added: ${pattern}`);
  }
});

if (gitignoreUpdated) {
  fs.writeFileSync(gitignorePath, gitignore);
  console.log('\n✅ .gitignore updated\n');
} else {
  console.log('✅ .gitignore already correct\n');
}

// 5. Validation finale
console.log('📋 Step 5: Final Validation\n');

try {
  console.log('   Running homey app validate...');
  const result = execSync('homey app validate --level publish', {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: 'pipe'
  });
  
  if (result.includes('✓') || result.includes('successfully')) {
    console.log('   ✅ Validation PASSED\n');
  } else {
    console.log('   ⚠️  Validation output:\n', result, '\n');
  }
} catch (err) {
  console.log('   ❌ Validation failed:', err.message, '\n');
  cleanup.errors.push('Validation failed');
}

// 6. Git status
console.log('📋 Step 6: Git Status\n');

try {
  const status = execSync('git status --short', {
    cwd: ROOT,
    encoding: 'utf8'
  });
  
  if (status.trim()) {
    console.log('   Changes detected:\n');
    console.log(status);
  } else {
    console.log('   ✅ Working tree clean\n');
  }
} catch (err) {
  console.log('   ⚠️  Git status error:', err.message, '\n');
}

// Summary
console.log('='.repeat(70));
console.log('\n📊 CLEANUP SUMMARY\n');
console.log(`Removed items: ${cleanup.removed.length}`);
console.log(`Backup files: ${backupCount}`);
console.log(`Errors: ${cleanup.errors.length}`);

if (cleanup.removed.length > 0) {
  console.log('\n🗑️  Removed:');
  cleanup.removed.forEach(item => console.log(`   - ${item}`));
}

console.log('\n✅ CLEANUP COMPLETE!');
console.log('\n📝 Next: git add, commit, push\n');

// Save cleanup report
const report = {
  timestamp: new Date().toISOString(),
  cleanup,
  backupFilesRemoved: backupCount,
  validationPassed: cleanup.errors.length === 0
};

fs.writeFileSync(
  path.join(ROOT, 'reports', 'FINAL_CLEANUP.json'),
  JSON.stringify(report, null, 2)
);

process.exit(cleanup.errors.length > 0 ? 1 : 0);
