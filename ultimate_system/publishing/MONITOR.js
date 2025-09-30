#!/usr/bin/env node
/**
 * MONITOR - Script de monitoring unifié
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('📊 HOMEY APP MONITORING - Version Unifiée');

const rootDir = path.resolve(__dirname, '..', '..');

function showAppStatus() {
  console.log('\n📱 STATUT APPLICATION:');
  try {
    const app = JSON.parse(fs.readFileSync(path.join(rootDir, 'app.json'), 'utf8'));
    console.log(`   Nom: ${app.name.en}`);
    console.log(`   ID: ${app.id}`);
    console.log(`   Version: ${app.version}`);
    console.log(`   Catégories: ${app.category.join(', ')}`);
  } catch (error) {
    console.log('   ❌ Erreur lecture app.json');
  }
}

function showGitStatus() {
  console.log('\n📤 STATUT GIT:');
  try {
    const status = execSync('git status --porcelain', { cwd: rootDir, encoding: 'utf8' });
    if (status.trim()) {
      console.log('   🔄 Changements en attente');
    } else {
      console.log('   ✅ Répertoire propre');
    }
    
    const lastCommit = execSync('git log -1 --format="%h - %s"', { cwd: rootDir, encoding: 'utf8' });
    console.log(`   📝 Dernier commit: ${lastCommit.trim()}`);
  } catch (error) {
    console.log('   ❌ Erreur Git');
  }
}

function showMonitoringLinks() {
  console.log('\n🌐 LIENS DE MONITORING:');
  console.log('   🔄 GitHub Actions: https://github.com/dlnraja/com.tuya.zigbee/actions');
  console.log('   📱 Homey Dashboard: https://tools.developer.homey.app/apps/app/com.dlnraja.ultimate.zigbee.hub');
  console.log('   🏪 App Store: https://homey.app/en-us/apps/');
}

// Exécution
showAppStatus();
showGitStatus();
showMonitoringLinks();

console.log('\n✨ Monitoring unifié - Sans suffixes ni redondances');
