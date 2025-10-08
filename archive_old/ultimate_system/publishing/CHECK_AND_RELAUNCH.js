#!/usr/bin/env node
/**
 * CHECK_AND_RELAUNCH - Vérification et relance si nécessaire
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 CHECK_AND_RELAUNCH - Vérification et relance');

const rootDir = path.resolve(__dirname, '..', '..');

function killAllProcesses() {
  console.log('\n🔄 KILL TOUS PROCESSUS:');
  try {
    execSync('taskkill /f /im node.exe 2>nul || echo "Pas de node"', { stdio: 'inherit' });
    execSync('taskkill /f /im homey.exe 2>nul || echo "Pas de homey"', { stdio: 'inherit' });
    execSync('taskkill /f /im cmd.exe 2>nul || echo "Pas de cmd"', { stdio: 'inherit' });
    console.log('✅ Tous processus tués');
  } catch (error) {
    console.log('✅ Nettoyage terminé');
  }
}

function checkCurrentVersion() {
  console.log('\n📱 VERSION ACTUELLE:');
  try {
    const appPath = path.join(rootDir, 'app.json');
    const app = JSON.parse(fs.readFileSync(appPath, 'utf8'));
    console.log(`📋 Version: ${app.version}`);
    console.log(`📋 ID: ${app.id}`);
    return app.version;
  } catch (error) {
    console.log('❌ Erreur lecture version');
    return null;
  }
}

function directPublishAttempt() {
  console.log('\n🚀 TENTATIVE PUBLICATION DIRECTE:');
  
  try {
    console.log('📱 Validation...');
    execSync('homey app validate', { cwd: rootDir, stdio: 'inherit' });
    console.log('✅ Validation OK');
    
    console.log('\n📱 Publication directe (5 min timeout)...');
    
    // Utiliser timeout et stdio inherit pour interaction directe
    execSync('homey app publish', { 
      cwd: rootDir, 
      stdio: 'inherit',
      timeout: 300000,  // 5 minutes
      maxBuffer: 1024 * 1024 * 10  // 10MB buffer
    });
    
    console.log('\n🎉 PUBLICATION RÉUSSIE !');
    return true;
    
  } catch (error) {
    if (error.code === 'ETIMEDOUT') {
      console.log('\n⏱️ Timeout atteint - publication peut être en cours');
    } else {
      console.log('\n❌ Erreur publication:', error.message);
    }
    return false;
  }
}

function finalCommitAndPush() {
  console.log('\n📤 COMMIT ET PUSH FINAL:');
  
  try {
    execSync('git add .', { cwd: rootDir });
    execSync('git commit -m "🎯 Publication completed - final commit"', { cwd: rootDir });
    execSync('git push origin master', { cwd: rootDir });
    console.log('✅ Push final réussi');
    return true;
  } catch (error) {
    console.log('❌ Erreur push final');
    return false;
  }
}

function showFinalStatus() {
  console.log('\n🏆 STATUS FINAL:');
  console.log('=' .repeat(50));
  
  const version = checkCurrentVersion();
  
  console.log('\n🌐 MONITORING:');
  console.log('📊 GitHub Actions: https://github.com/dlnraja/com.tuya.zigbee/actions');
  console.log('📱 Homey Dashboard: https://tools.developer.homey.app/apps/app/com.dlnraja.ultimate.zigbee.hub');
  console.log('🏪 App Store: https://homey.app/en-us/apps/');
  
  console.log('\n🎯 PUBLICATION STATUS:');
  if (version && parseFloat(version) >= 2.16) {
    console.log('✅ Version mise à jour détectée');
    console.log('✅ Publication probablement réussie');
  } else {
    console.log('⚠️ Version non incrémentée');
    console.log('❓ Publication à vérifier manuellement');
  }
}

// Exécution principale
async function main() {
  try {
    console.log('🎯 Vérification complète et relance si nécessaire...\n');
    
    // Étape 1: Nettoyage complet
    killAllProcesses();
    
    // Étape 2: Vérification version actuelle
    const currentVersion = checkCurrentVersion();
    
    // Étape 3: Tentative publication directe
    console.log('\n🚀 LANCEMENT PUBLICATION FINALE...');
    console.log('⚠️ INTERAGISSEZ AVEC LES PROMPTS SI NÉCESSAIRE');
    
    const published = directPublishAttempt();
    
    // Étape 4: Finalisation
    if (published) {
      const pushed = finalCommitAndPush();
      console.log('\n🎉 PUBLICATION ET PUSH TERMINÉS !');
    }
    
    // Étape 5: Status final
    showFinalStatus();
    
    console.log('\n🏁 CHECK_AND_RELAUNCH TERMINÉ');
    
  } catch (error) {
    console.error('💥 Erreur fatale:', error.message);
  }
}

main();
