#!/usr/bin/env node
/**
 * FORCE PUBLISH
 * Force la publication vers Homey App Store en évitant les conflits de tags
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

console.log('🚀 FORCE PUBLISH TO HOMEY APP STORE\n');

// Lire la version actuelle
const appJsonPath = path.join(ROOT, 'app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
const currentVersion = appJson.version;

console.log(`📦 Version actuelle: ${currentVersion}\n`);

// Étape 1: Valider
console.log('🔍 Étape 1: Validation...');
try {
  execSync('homey app validate --level publish', { stdio: 'inherit', cwd: ROOT });
  console.log('✅ Validation OK\n');
} catch (err) {
  console.error('❌ Validation FAILED');
  process.exit(1);
}

// Étape 2: Build
console.log('🔨 Étape 2: Build...');
try {
  execSync('homey app build', { stdio: 'inherit', cwd: ROOT });
  console.log('✅ Build OK\n');
} catch (err) {
  console.error('❌ Build FAILED');
  process.exit(1);
}

// Étape 3: Publish
console.log('📤 Étape 3: Publish...');
try {
  execSync('homey app publish', { stdio: 'inherit', cwd: ROOT });
  console.log('✅ Publish OK\n');
} catch (err) {
  console.error('⚠️  Publish may have failed (check output above)');
  console.log('\n💡 Si le publish a échoué, essayez:');
  console.log('   1. Vérifier votre token: homey login');
  console.log('   2. Publier manuellement: homey app publish');
  process.exit(1);
}

console.log('🎉 SUCCESS!\n');
console.log(`Version ${currentVersion} publiée sur Homey App Store`);
console.log('Dashboard: https://tools.developer.homey.app/apps\n');
