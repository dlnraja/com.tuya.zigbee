#!/usr/bin/env node
// Script pour exécuter les analyses multi-IA complètes
console.log('=== Exécution des analyses multi-IA ===');
console.log('Date:', new Date().toISOString());

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Créer le dossier des résultats
const resultsDir = path.join(__dirname, 'analysis-results');
if (!fs.existsSync(resultsDir)) {
  fs.mkdirSync(resultsDir, { recursive: true });
  console.log('📁 Dossier analysis-results créé');
}

// Liste des scripts d'analyse
const scripts = [
  { name: 'scout', script: 'scripts/scout.js' },
  { name: 'architect', script: 'scripts/architect.js' },
  { name: 'optimizer', script: 'scripts/optimizer.js' },
  { name: 'validator', script: 'scripts/validator.js' }
];

const results = [];

// Fonction pour exécuter un script
function runScript(scriptInfo) {
  return new Promise((resolve) => {
    console.log(`\n🚀 Démarrage de ${scriptInfo.name}...`);

    const startTime = Date.now();
    const outputFile = path.join(resultsDir, `${scriptInfo.name}-output.txt`);
    const errorFile = path.join(resultsDir, `${scriptInfo.name}-error.txt`);

    // Vérifier si le script existe
    if (!fs.existsSync(scriptInfo.script)) {
      console.log(`❌ ${scriptInfo.name}: script non trouvé`);
      resolve({
        name: scriptInfo.name,
        success: false,
        error: 'Script non trouvé',
        duration: 0
      });
      return;
    }

    const child = spawn('node', [scriptInfo.script], {
      cwd: __dirname,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;

      // Sauvegarder les sorties
      if (stdout) {
        fs.writeFileSync(outputFile, stdout);
      }
      if (stderr) {
        fs.writeFileSync(errorFile, stderr);
      }

      const result = {
        name: scriptInfo.name,
        success: code === 0,
        exitCode: code,
        duration: duration,
        hasOutput: stdout.length > 0,
        hasErrors: stderr.length > 0
      };

      if (result.success) {
        console.log(`✅ ${scriptInfo.name} terminé avec succès (${duration.toFixed(2)}s)`);
      } else {
        console.log(`❌ ${scriptInfo.name} échoué (code: ${code}, durée: ${duration.toFixed(2)}s)`);
        if (stderr) {
          console.log(`   Erreurs: ${stderr.substring(0, 100)}...`);
        }
      }

      results.push(result);
      resolve(result);
    });

    child.on('error', (error) => {
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;

      console.log(`❌ ${scriptInfo.name} erreur: ${error.message} (${duration.toFixed(2)}s)`);

      const result = {
        name: scriptInfo.name,
        success: false,
        error: error.message,
        duration: duration
      };

      results.push(result);
      resolve(result);
    });
  });
}

// Fonction principale
async function runAllAnalyses() {
  console.log('🔍 Démarrage des analyses multi-IA...\n');

  // Exécuter tous les scripts en séquence
  for (const script of scripts) {
    await runScript(script);
    // Attendre 2 secondes entre chaque script
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Générer le rapport final
  console.log('\n=== RAPPORT FINAL ===');

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  console.log(`📊 Scripts exécutés: ${results.length}`);
  console.log(`✅ Réussis: ${successful}`);
  console.log(`❌ Échoués: ${failed}`);
  console.log(`⏱️  Durée totale: ${totalDuration.toFixed(2)} secondes`);

  // Détails par script
  console.log('\n=== DÉTAILS ===');
  results.forEach(result => {
    console.log(`${result.name.toUpperCase()}:`);
    console.log(`  - Statut: ${result.success ? '✅' : '❌'}`);
    console.log(`  - Durée: ${result.duration.toFixed(2)}s`);
    console.log(`  - Sortie: ${result.hasOutput ? '✅' : '❌'}`);
    console.log(`  - Erreurs: ${result.hasErrors ? '⚠️' : '✅'}`);
  });

  // Sauvegarder le rapport complet
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: results.length,
      successful: successful,
      failed: failed,
      totalDuration: totalDuration
    },
    details: results,
    resultsDir: resultsDir
  };

  const reportPath = path.join(resultsDir, 'multi-ia-analysis-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(`\n📄 Rapport complet: ${reportPath}`);

  if (successful === results.length) {
    console.log('\n🎉 Toutes les analyses ont réussi!');
  } else {
    console.log(`\n⚠️  ${failed} analyse(s) ont échoué. Consultez les fichiers d'erreur.`);
  }

  console.log('\n=== Analyses multi-IA terminées ===');
}

// Démarrer les analyses
runAllAnalyses().catch(console.error);
