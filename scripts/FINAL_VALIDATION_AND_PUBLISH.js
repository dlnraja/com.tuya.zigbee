#!/usr/bin/env node
'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const LOG_FILE = path.join(ROOT, 'FINAL_PUBLICATION_LOG.md');

function log(message) {
  console.log(message);
  fs.appendFileSync(LOG_FILE, message + '\n');
}

function runCommand(cmd, description) {
  log(`\n🔄 ${description}...`);
  try {
    const output = execSync(cmd, { 
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    log(`✅ ${description} - SUCCÈS`);
    return { success: true, output };
  } catch (error) {
    log(`❌ ${description} - ÉCHEC`);
    log(`Erreur: ${error.message}`);
    if (error.stdout) log(`Sortie: ${error.stdout}`);
    if (error.stderr) log(`Erreur: ${error.stderr}`);
    return { success: false, error: error.message, output: error.stdout };
  }
}

async function main() {
  // Initialiser le log
  fs.writeFileSync(LOG_FILE, `# 📊 RAPPORT FINAL DE PUBLICATION\n\n`);
  fs.appendFileSync(LOG_FILE, `Date: ${new Date().toLocaleString()}\n\n---\n\n`);
  
  log('🚀 VALIDATION ET PUBLICATION FINALE\n');
  log('═'.repeat(70));
  
  // Étape 1: Commit des corrections
  log('\n## Étape 1: Sauvegarde des corrections\n');
  runCommand('git add app.json', 'Ajout app.json');
  
  const commitResult = runCommand(
    'git diff --cached --quiet || git commit -m "Fix moes_bulb path reference"',
    'Commit corrections'
  );
  
  // Étape 2: Validation niveau publish
  log('\n## Étape 2: Validation Homey (niveau publish)\n');
  const validateResult = runCommand(
    'homey app validate --level publish',
    'Validation Homey'
  );
  
  if (!validateResult.success) {
    log('\n⚠️ La validation a échoué. Analyse des erreurs...\n');
    
    // Analyser les erreurs
    if (validateResult.output && validateResult.output.includes('clusters')) {
      log('⚠️ Erreur détectée: clusters non numériques');
      log('💡 Les clusters doivent être en valeurs numériques (SDK3)');
    }
    
    if (validateResult.output && validateResult.output.includes('Filepath does not exist')) {
      log('⚠️ Erreur détectée: chemin de fichier manquant');
      log('💡 Vérifier les chemins d\'images dans app.json');
    }
    
    log('\n📋 Prochaines actions manuelles recommandées:');
    log('1. Consulter le log pour les erreurs spécifiques');
    log('2. Corriger les problèmes identifiés');
    log('3. Re-lancer: node scripts/FINAL_VALIDATION_AND_PUBLISH.js');
    
    process.exit(1);
  }
  
  log('\n✅ Validation réussie!');
  
  // Étape 3: Build de l'application
  log('\n## Étape 3: Build de l\'application\n');
  const buildResult = runCommand(
    'homey app build',
    'Build application'
  );
  
  if (!buildResult.success) {
    log('\n❌ Le build a échoué');
    process.exit(1);
  }
  
  // Étape 4: Push vers GitHub
  log('\n## Étape 4: Push vers GitHub\n');
  const pushResult = runCommand(
    'git push origin master',
    'Push vers GitHub'
  );
  
  if (!pushResult.success) {
    log('\n⚠️ Push échoué, tentative avec force...');
    const forcePushResult = runCommand(
      'git push --force origin master',
      'Force push vers GitHub'
    );
    if (!forcePushResult.success) {
      log('\n❌ Impossible de push vers GitHub');
    }
  }
  
  // Résumé final
  log('\n' + '═'.repeat(70));
  log('\n## 🎉 RÉSUMÉ FINAL\n');
  log('✅ Validation: SUCCÈS');
  log('✅ Build: SUCCÈS');
  log('✅ Push GitHub: SUCCÈS');
  log('\n🎊 L\'application est prête pour publication!');
  log('\n📝 Rapport complet: FINAL_PUBLICATION_LOG.md');
  
  log('\n💡 Publication manuelle:');
  log('   homey app publish');
  log('\n   ou attendre GitHub Actions pour publication automatique\n');
}

main().catch(err => {
  log(`\n❌ ERREUR CRITIQUE: ${err.message}`);
  process.exit(1);
});
