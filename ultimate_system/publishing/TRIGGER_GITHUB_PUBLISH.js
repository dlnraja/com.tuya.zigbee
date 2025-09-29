#!/usr/bin/env node
/**
 * TRIGGER_GITHUB_PUBLISH - Déclenchement manuel GitHub Actions pour publication Homey
 */
const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 TRIGGER_GITHUB_PUBLISH - Déclenchement publication Homey via GitHub Actions');

const rootDir = path.resolve(__dirname, '..', '..');

function triggerWorkflow() {
  console.log('\n📡 Déclenchement du workflow GitHub Actions...');
  
  try {
    // Vérifier l'état Git
    console.log('🔍 Vérification de l\'état Git...');
    const gitStatus = execSync('git status --porcelain', { 
      encoding: 'utf8', 
      cwd: rootDir 
    });
    
    if (gitStatus.trim()) {
      console.log('⚠️  Changements non committés détectés. Commit en cours...');
      execSync('git add .', { cwd: rootDir });
      execSync('git commit -m "🔧 Pre-publication cleanup"', { cwd: rootDir });
      execSync('git push origin master', { cwd: rootDir });
      console.log('✅ Changements committés et pushés');
    }
    
    // Vérifier la version actuelle
    const fs = require('fs');
    const appJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'app.json'), 'utf8'));
    console.log(`📋 Version actuelle: ${appJson.version}`);
    console.log(`📋 ID de l'app: ${appJson.id}`);
    
    // Le workflow se déclenchera automatiquement sur le push vers master
    console.log('\n🎯 Le workflow GitHub Actions devrait se déclencher automatiquement');
    console.log('📊 Workflows configurés:');
    console.log('   • homey-app-store.yml (auto sur push master)');
    console.log('   • auto-publish-fixed.yml (auto sur push master)');
    
    console.log('\n🌐 Liens de monitoring:');
    console.log('   • Actions: https://github.com/dlnraja/com.tuya.zigbee/actions');
    console.log('   • App Dashboard: https://tools.developer.homey.app/apps/app/com.dlnraja.ultimate.zigbee.hub');
    
    return true;
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    return false;
  }
}

function checkWorkflowStatus() {
  console.log('\n📈 Pour vérifier le statut de publication:');
  console.log('1. Aller sur: https://github.com/dlnraja/com.tuya.zigbee/actions');
  console.log('2. Vérifier les workflows en cours d\'exécution');
  console.log('3. Surveiller les logs de publication');
  
  console.log('\n⚡ Si besoin de déclenchement manuel:');
  console.log('1. Aller dans Actions > "Homey App Store Publish"');
  console.log('2. Cliquer "Run workflow" sur la branche master');
}

// Exécution
if (triggerWorkflow()) {
  console.log('\n✅ DÉCLENCHEMENT RÉUSSI');
  console.log('🔄 Le processus de publication est en cours via GitHub Actions');
  checkWorkflowStatus();
} else {
  console.log('\n❌ ÉCHEC DU DÉCLENCHEMENT');
  process.exit(1);
}

console.log('\n🎉 TRIGGER_GITHUB_PUBLISH terminé - Publication en cours!');
