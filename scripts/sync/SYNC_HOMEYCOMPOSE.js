#!/usr/bin/env node
'use strict';

/**
 * SYNC HOMEYCOMPOSE → APP.JSON
 * 
 * CRITICAL: .homeycompose/ est dans .gitignore INTENTIONNELLEMENT
 * - Évite problèmes de cache Homey
 * - Réduit taille du repo Git
 * - Évite conflits de merge
 * 
 * Ce script REBUILD app.json depuis .homeycompose/
 * À EXÉCUTER après toute modification dans .homeycompose/
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('\n🔄 SYNC HOMEYCOMPOSE → APP.JSON\n');

const rootDir = path.join(__dirname, '../..');
process.chdir(rootDir);

// 1. Vérifier que .homeycompose/ existe
const homeyComposePath = path.join(rootDir, '.homeycompose');
if (!fs.existsSync(homeyComposePath)) {
  console.error('❌ .homeycompose/ not found!');
  console.error('   This directory should exist even if gitignored.');
  process.exit(1);
}

console.log('✅ .homeycompose/ found');

// 2. Backup actuel app.json
const appJsonPath = path.join(rootDir, 'app.json');
const backupPath = path.join(rootDir, 'app.json.backup');

if (fs.existsSync(appJsonPath)) {
  fs.copyFileSync(appJsonPath, backupPath);
  console.log('✅ app.json backed up');
}

// 3. Rebuild depuis .homeycompose/
console.log('\n🔨 Rebuilding app.json from .homeycompose/...\n');

try {
  execSync('homey app build', { 
    stdio: 'inherit',
    cwd: rootDir
  });
  
  console.log('\n✅ Rebuild successful!');
  
  // 4. Vérifier que app.json a été modifié
  if (!fs.existsSync(appJsonPath)) {
    console.error('❌ app.json was not created!');
    process.exit(1);
  }
  
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  console.log(`✅ app.json version: ${appJson.version}`);
  console.log(`✅ Drivers: ${appJson.drivers ? appJson.drivers.length : 0}`);
  
  // 5. Cleanup backup si succès
  if (fs.existsSync(backupPath)) {
    fs.unlinkSync(backupPath);
  }
  
  console.log('\n✅ SYNC COMPLETE\n');
  console.log('📝 app.json is now in sync with .homeycompose/');
  console.log('🔒 .homeycompose/ remains gitignored (intentional)');
  console.log('✅ Ready to commit app.json\n');
  
  process.exit(0);
  
} catch (err) {
  console.error('\n❌ Rebuild failed:', err.message);
  
  // Restore backup
  if (fs.existsSync(backupPath)) {
    fs.copyFileSync(backupPath, appJsonPath);
    fs.unlinkSync(backupPath);
    console.log('✅ app.json restored from backup');
  }
  
  process.exit(1);
}
