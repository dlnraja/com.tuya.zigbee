#!/usr/bin/env node
/**
 * CHECK_PUBLISH_STATUS - Vérification statut publication
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 CHECK_PUBLISH_STATUS - Vérification état publication');

const rootDir = path.resolve(__dirname, '..', '..');

function checkAppStatus() {
  console.log('\n📱 STATUT APPLICATION:');
  console.log('=' .repeat(40));
  
  try {
    const appJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'app.json'), 'utf8'));
    console.log(`✅ App ID: ${appJson.id}`);
    console.log(`✅ Version: ${appJson.version}`);
    console.log(`✅ Nom: ${appJson.name.en}`);
    console.log(`✅ SDK: ${appJson.sdk}`);
  } catch (error) {
    console.error('❌ Erreur lecture app.json');
  }
}

function checkValidationStatus() {
  console.log('\n🔍 VALIDATION SDK3:');
  console.log('=' .repeat(40));
  
  try {
    execSync('homey app validate', { cwd: rootDir, stdio: 'ignore' });
    console.log('✅ Validation réussie - Prêt pour publication');
  } catch (error) {
    console.error('❌ Validation échouée');
  }
}

function checkGitStatus() {
  console.log('\n📂 STATUT GIT:');
  console.log('=' .repeat(40));
  
  try {
    const lastCommit = execSync('git log -1 --format="%h - %s"', {
      encoding: 'utf8',
      cwd: rootDir
    }).trim();
    
    console.log(`✅ Dernier commit: ${lastCommit}`);
    
    const gitStatus = execSync('git status --porcelain', {
      encoding: 'utf8',
      cwd: rootDir
    });
    
    if (gitStatus.trim()) {
      console.log('⚠️  Changements non committés présents');
    } else {
      console.log('✅ Working directory propre');
    }
    
  } catch (error) {
    console.error('❌ Erreur vérification Git');
  }
}

function checkPublicationHistory() {
  console.log('\n📊 HISTORIQUE PUBLICATION:');
  console.log('=' .repeat(40));
  
  const reportsDir = path.join(__dirname, '..', 'reports');
  
  try {
    const files = fs.readdirSync(reportsDir);
    const publishReports = files.filter(f => f.includes('orchestration') || f.includes('publish'));
    
    console.log(`📋 Rapports trouvés: ${publishReports.length}`);
    
    publishReports.forEach(file => {
      try {
        const report = JSON.parse(fs.readFileSync(path.join(reportsDir, file), 'utf8'));
        console.log(`   • ${file}: ${report.orchestration?.finalStatus || report.status || 'UNKNOWN'}`);
      } catch (e) {
        console.log(`   • ${file}: ERREUR LECTURE`);
      }
    });
    
  } catch (error) {
    console.log('❌ Pas de rapports trouvés');
  }
}

function getPublicationStatus() {
  console.log('\n🎯 ÉVALUATION GLOBALE:');
  console.log('=' .repeat(40));
  
  // Lire les derniers commits pour détecter les tentatives de publication
  try {
    const recentCommits = execSync('git log --oneline -10', {
      encoding: 'utf8',
      cwd: rootDir
    });
    
    const publishCommits = recentCommits.split('\n').filter(line => 
      line.includes('publish') || 
      line.includes('orchestration') || 
      line.includes('retry')
    );
    
    console.log(`📊 Commits de publication récents: ${publishCommits.length}`);
    publishCommits.forEach(commit => console.log(`   • ${commit}`));
    
    if (publishCommits.length > 0) {
      console.log('\n✅ PROCESSUS DE PUBLICATION DÉTECTÉ');
      console.log('🔄 Les workflows GitHub Actions ont été déclenchés');
      console.log('📱 Publication probablement en cours ou terminée');
    } else {
      console.log('\n⚠️  AUCUN PROCESSUS DE PUBLICATION RÉCENT');
    }
    
  } catch (error) {
    console.error('❌ Erreur analyse commits');
  }
}

function displayMonitoringLinks() {
  console.log('\n🌐 LIENS DE VÉRIFICATION:');
  console.log('=' .repeat(40));
  console.log('📊 GitHub Actions: https://github.com/dlnraja/com.tuya.zigbee/actions');
  console.log('📱 Homey Dashboard: https://tools.developer.homey.app/apps/app/com.dlnraja.ultimate.zigbee.hub');
  console.log('🔗 Repository: https://github.com/dlnraja/com.tuya.zigbee');
  console.log('\n💡 Pour vérifier si publié:');
  console.log('   1. Consultez le Dashboard Homey');
  console.log('   2. Vérifiez les GitHub Actions');
  console.log('   3. Cherchez la nouvelle version sur l\'App Store');
}

// Exécution
checkAppStatus();
checkValidationStatus();
checkGitStatus();
checkPublicationHistory();
getPublicationStatus();
displayMonitoringLinks();

console.log('\n🏁 VÉRIFICATION TERMINÉE');
console.log('📝 Consultez les liens ci-dessus pour confirmation définitive');
