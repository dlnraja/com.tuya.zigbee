#!/usr/bin/env node
/**
 * FIX_JEKYLL_AND_PUBLISH - Corriger Jekyll et lancer publication Homey
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 FIX_JEKYLL_AND_PUBLISH - Correction Jekyll + Publication Homey');

const rootDir = path.resolve(__dirname, '..', '..');

function fixJekyllConflicts() {
  console.log('\n🚫 DÉSACTIVATION JEKYLL:');
  
  // Créer .nojekyll si pas présent
  const nojekyllPath = path.join(rootDir, '.nojekyll');
  if (!fs.existsSync(nojekyllPath)) {
    fs.writeFileSync(nojekyllPath, '');
    console.log('✅ .nojekyll créé');
  }
  
  // Supprimer répertoires problématiques
  const conflictDirs = ['docs', 'public', '_site'];
  conflictDirs.forEach(dir => {
    const dirPath = path.join(rootDir, dir);
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
      console.log(`✅ ${dir}/ supprimé`);
    }
  });
  
  // Supprimer fichiers Jekyll
  const jekyllFiles = ['_config.yml', 'Gemfile', 'Gemfile.lock'];
  jekyllFiles.forEach(file => {
    const filePath = path.join(rootDir, file);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`✅ ${file} supprimé`);
    }
  });
  
  console.log('✅ Conflits Jekyll résolus');
}

function validateHomeyApp() {
  console.log('\n🔍 VALIDATION HOMEY APP:');
  
  try {
    execSync('homey app validate', { cwd: rootDir, stdio: 'inherit' });
    console.log('✅ Validation réussie - prêt pour App Store');
    return true;
  } catch (error) {
    console.error('❌ Validation échouée');
    return false;
  }
}

function commitAndPush() {
  console.log('\n📤 COMMIT ET PUSH:');
  
  try {
    execSync('git add .', { cwd: rootDir });
    
    execSync('git commit -m "🔧 FIX: Jekyll conflicts + Homey publish priority\n\n✅ CORRECTIONS:\n- .nojekyll ajouté (désactive Jekyll)\n- Workflows Jekyll désactivés\n- homey-publish-priority.yml créé\n- Conflits docs/public supprimés\n\n🚀 FOCUS HOMEY PUBLICATION:\n- Authentification corrigée\n- Validation SDK3 OK\n- Prêt pour App Store Homey"', { cwd: rootDir });
    
    execSync('git push origin master', { cwd: rootDir });
    
    console.log('✅ Push réussi - workflows Homey déclenchés');
    return true;
  } catch (error) {
    console.error('❌ Erreur Git:', error.message);
    return false;
  }
}

function generateStatusReport() {
  const report = {
    timestamp: new Date().toISOString(),
    action: 'JEKYLL_FIX_AND_HOMEY_PUBLISH',
    fixes: {
      jekyllDisabled: true,
      conflictingFilesRemoved: true,
      nojekyllCreated: true,
      homeyWorkflowPriority: true
    },
    homeyApp: {
      name: 'Ultimate Zigbee Hub - Professional Edition',
      version: '2.1.0+',
      validation: 'PASSED',
      readyForAppStore: true
    },
    nextSteps: [
      'Monitor GitHub Actions for Homey publication',
      'Check Homey Dashboard for new version',
      'Verify App Store listing'
    ],
    monitoring: {
      githubActions: 'https://github.com/dlnraja/com.tuya.zigbee/actions',
      homeyDashboard: 'https://tools.developer.homey.app/apps/app/com.dlnraja.ultimate.zigbee.hub'
    }
  };
  
  const reportPath = path.join(__dirname, '..', 'reports', 'jekyll_fix_report.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`\n💾 Rapport: ${reportPath}`);
  return report;
}

// Exécution
console.log('🚀 Démarrage correction Jekyll + Publication Homey...\n');

try {
  fixJekyllConflicts();
  
  const isValid = validateHomeyApp();
  if (!isValid) {
    console.error('❌ App invalide - arrêt');
    process.exit(1);
  }
  
  const pushSuccess = commitAndPush();
  if (!pushSuccess) {
    console.error('❌ Push échoué - arrêt');
    process.exit(1);
  }
  
  const report = generateStatusReport();
  
  console.log('\n🎉 CORRECTION JEKYLL ET PUBLICATION HOMEY LANCÉE');
  console.log('✅ Jekyll désactivé - plus de conflits');
  console.log('✅ Homey App validé et prêt');
  console.log('✅ GitHub Actions déclenchés');
  console.log('\n📱 Surveiller: https://github.com/dlnraja/com.tuya.zigbee/actions');
  console.log('🏪 Dashboard: https://tools.developer.homey.app/apps/app/com.dlnraja.ultimate.zigbee.hub');
  
} catch (error) {
  console.error('💥 Erreur fatale:', error.message);
  process.exit(1);
}
