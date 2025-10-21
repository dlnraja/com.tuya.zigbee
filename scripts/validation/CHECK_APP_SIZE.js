#!/usr/bin/env node
'use strict';

/**
 * CHECK APP SIZE
 * 
 * Vérifie la taille de l'app et identifie les problèmes
 * Limite Homey: ~50 MB maximum
 */

const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');

async function checkAppSize() {
  console.log('📏 CHECK APP SIZE\n');
  console.log('═'.repeat(70) + '\n');
  
  // Check .homeyignore
  const homeyignorePath = path.join(ROOT, '.homeyignore');
  const homeyignore = await fs.readFile(homeyignorePath, 'utf8');
  
  console.log('📝 .homeyignore content:\n');
  console.log(homeyignore);
  console.log();
  
  // Required entries
  const required = [
    'node_modules',
    '.git',
    '.github',
    '.dev',
    '*.log',
    '.cache',
    'archive',
    'github-analysis',
    'project-data',
    'backup',
    'temp',
    '*.md',
    'reports',
    'docs',
    'references'
  ];
  
  console.log('✅ REQUIRED .homeyignore entries:\n');
  
  const missing = [];
  for (const entry of required) {
    const exists = homeyignore.includes(entry);
    console.log(`${exists ? '✅' : '❌'} ${entry}`);
    if (!exists) missing.push(entry);
  }
  
  console.log();
  
  if (missing.length > 0) {
    console.log('⚠️  MISSING ENTRIES:', missing.join(', '), '\n');
    
    // Add missing entries
    const newEntries = missing.join('\n');
    await fs.appendFile(homeyignorePath, '\n' + newEntries + '\n');
    console.log('✅ Added missing entries to .homeyignore\n');
  }
  
  // Check app.json size
  const appJsonPath = path.join(ROOT, 'app.json');
  const appJsonStat = await fs.stat(appJsonPath);
  const appJsonSizeKB = Math.round(appJsonStat.size / 1024);
  
  console.log('📊 app.json size:', appJsonSizeKB, 'KB');
  
  if (appJsonSizeKB > 500) {
    console.log('⚠️  app.json is very large (> 500 KB)');
    console.log('   Consider splitting or optimizing');
  } else if (appJsonSizeKB > 200) {
    console.log('⚠️  app.json is large (> 200 KB)');
  } else {
    console.log('✅ app.json size is acceptable');
  }
  
  console.log();
  
  // Check total project size (what would be published)
  console.log('🔍 Checking publishable size...\n');
  
  try {
    const result = execSync('homey app build --skip-validate', { 
      cwd: ROOT,
      encoding: 'utf8'
    });
    console.log(result);
  } catch (err) {
    console.log('⚠️  Could not build:', err.message);
  }
  
  console.log('\n' + '═'.repeat(70));
  console.log('\n✅ SIZE CHECK COMPLETE\n');
  console.log('RECOMMENDATIONS:');
  console.log('1. Ensure .homeyignore excludes all dev files');
  console.log('2. Remove .dev, archive, github-analysis folders');
  console.log('3. Keep app.json under 200 KB');
  console.log('4. Total app should be < 50 MB\n');
}

checkAppSize().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
