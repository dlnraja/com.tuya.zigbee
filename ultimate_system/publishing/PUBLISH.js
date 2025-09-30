#!/usr/bin/env node
/**
 * PUBLISH - Script de publication unifié sans suffixes
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 HOMEY APP PUBLICATION - Version Unifiée');

const rootDir = path.resolve(__dirname, '..', '..');

function validateApp() {
  console.log('\n🔍 VALIDATION HOMEY APP:');
  try {
    execSync('homey app validate', { cwd: rootDir, stdio: 'inherit' });
    console.log('✅ Validation réussie');
    return true;
  } catch (error) {
    console.error('❌ Validation échouée');
    return false;
  }
}

function incrementVersion() {
  console.log('\n📝 INCREMENT VERSION:');
  try {
    const appPath = path.join(rootDir, 'app.json');
    const app = JSON.parse(fs.readFileSync(appPath, 'utf8'));
    
    const parts = app.version.split('.');
    parts[2] = String(parseInt(parts[2] || 0) + 1);
    app.version = parts.join('.');
    
    fs.writeFileSync(appPath, JSON.stringify(app, null, 2));
    console.log(`✅ Version: ${app.version}`);
    return app.version;
  } catch (error) {
    return null;
  }
}

function publishToHomey() {
  console.log('\n🏪 PUBLICATION HOMEY APP STORE:');
  try {
    // Publication interactive
    execSync('homey app publish', {
      cwd: rootDir,
      stdio: 'inherit'
    });
    console.log('✅ Publication réussie');
    return true;
{{ ... }}
    console.error('❌ Publication échouée');
    return false;
  }
}

function commitAndPush(version) {
  console.log('\n📤 COMMIT & PUSH:');
  try {
    execSync('git add .', { cwd: rootDir });
    execSync(`git commit -m "🎯 v${version} - Publication Homey App Store"`, { cwd: rootDir });
    execSync('git push origin master', { cwd: rootDir });
    console.log('✅ Push réussi');
    return true;
  } catch (error) {
    console.log('ℹ️ Pas de changements à committer');
    return true;
  }
}

// Exécution principale
async function main() {
  try {
    console.log('🎯 Démarrage publication unifiée...\n');
    
    const isValid = validateApp();
    if (!isValid) {
      console.error('💥 Validation échouée - arrêt');
      process.exit(1);
    }
    
    const version = incrementVersion();
    if (!version) {
      console.error('💥 Erreur version - arrêt');
      process.exit(1);
    }
    
    const published = publishToHomey();
    if (!published) {
      console.error('💥 Publication échouée - arrêt');
      process.exit(1);
    }
    
    commitAndPush(version);
    
    console.log('\n🎉 PUBLICATION RÉUSSIE !');
    console.log(`📱 Version: ${version}`);
    console.log('🏪 App Store: https://tools.developer.homey.app/apps/app/com.dlnraja.ultimate.zigbee.hub');
    
  } catch (error) {
    console.error('💥 Erreur fatale:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { validateApp, incrementVersion, publishToHomey };
