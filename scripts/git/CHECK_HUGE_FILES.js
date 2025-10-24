#!/usr/bin/env node
'use strict';

/**
 * CHECK HUGE FILES - Pre-push Hook
 * 
 * Vérifie les fichiers trop gros avant git push
 * Limites GitHub:
 * - Warning: > 50MB
 * - Reject: > 100MB
 * - Repo total: < 1GB recommandé
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('\n🔍 CHECK HUGE FILES (Pre-Push)\n');

const rootDir = path.join(__dirname, '../..');
process.chdir(rootDir);

const LIMITS = {
  WARNING: 50 * 1024 * 1024,  // 50MB
  ERROR: 100 * 1024 * 1024,   // 100MB
  REPO_MAX: 1024 * 1024 * 1024 // 1GB
};

// Fichiers à toujours ignorer (même si gros)
const ALWAYS_IGNORE = [
  '.git/',
  'node_modules/',
  '.homeybuild/',
  '.homeycompose/',
  'backup/',
  '.dev/',
  'archive_old/',
  'dumps/',
  'temp_clones/'
];

// 1. Get all tracked files
let trackedFiles;
try {
  const output = execSync('git ls-files', { encoding: 'utf8' });
  trackedFiles = output.trim().split('\n').filter(f => f.length > 0);
} catch (err) {
  console.error('❌ Failed to get tracked files:', err.message);
  process.exit(1);
}

console.log(`📊 Checking ${trackedFiles.length} tracked files...\n`);

// 2. Check each file size
const warnings = [];
const errors = [];
let totalSize = 0;

trackedFiles.forEach(file => {
  const filePath = path.join(rootDir, file);
  
  // Skip if doesn't exist
  if (!fs.existsSync(filePath)) return;
  
  // Skip directories
  const stats = fs.statSync(filePath);
  if (!stats.isFile()) return;
  
  const size = stats.size;
  totalSize += size;
  
  // Check limits
  if (size >= LIMITS.ERROR) {
    errors.push({ file, size, sizeMB: (size / 1024 / 1024).toFixed(2) });
  } else if (size >= LIMITS.WARNING) {
    warnings.push({ file, size, sizeMB: (size / 1024 / 1024).toFixed(2) });
  }
});

// 3. Display results
const totalSizeMB = (totalSize / 1024 / 1024).toFixed(2);
const totalSizeGB = (totalSize / 1024 / 1024 / 1024).toFixed(2);

console.log(`📊 Total repo size: ${totalSizeMB} MB (${totalSizeGB} GB)`);

if (totalSize >= LIMITS.REPO_MAX) {
  console.log('⚠️  WARNING: Repo size exceeds 1GB (not recommended)');
}

console.log('');

// Errors (> 100MB)
if (errors.length > 0) {
  console.log('🔴 ERRORS: Files > 100MB (WILL BE REJECTED BY GITHUB)\n');
  errors.forEach(({ file, sizeMB }) => {
    console.log(`   ${file} (${sizeMB} MB)`);
  });
  console.log('');
}

// Warnings (> 50MB)
if (warnings.length > 0) {
  console.log('🟡 WARNINGS: Files > 50MB\n');
  warnings.forEach(({ file, sizeMB }) => {
    console.log(`   ${file} (${sizeMB} MB)`);
  });
  console.log('');
}

// 4. Recommendations
if (errors.length > 0 || warnings.length > 0) {
  console.log('='.repeat(60));
  console.log('RECOMMENDATIONS');
  console.log('='.repeat(60) + '\n');
  
  console.log('Option 1: Add to .gitignore');
  console.log('   echo "path/to/large/file" >> .gitignore\n');
  
  console.log('Option 2: Remove from git (keep local)');
  console.log('   git rm --cached path/to/large/file\n');
  
  console.log('Option 3: Use Git LFS (Large File Storage)');
  console.log('   git lfs track "*.zip"');
  console.log('   git add .gitattributes\n');
  
  console.log('Option 4: Compress files');
  console.log('   node scripts/git/COMPRESS_LARGE_FILES.js\n');
}

// 5. Exit status
if (errors.length > 0) {
  console.log('❌ PUSH BLOCKED: Files exceed 100MB limit\n');
  process.exit(1);
} else if (warnings.length > 0) {
  console.log('⚠️  WARNING: Large files detected but push allowed\n');
  process.exit(0);
} else {
  console.log('✅ No huge files detected\n');
  process.exit(0);
}
