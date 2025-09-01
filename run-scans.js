const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Créer un dossier pour les résultats
const resultsDir = path.join(__dirname, 'scan-results');
if (!fs.existsSync(resultsDir)) {
  fs.mkdirSync(resultsDir, { recursive: true });
}

// Liste des scripts à exécuter
const scripts = [
  'scout',
  'architect',
  'optimizer',
  'validator'
];

// Fonction pour exécuter un script
function runScript(scriptName) {
  const scriptPath = path.join(__dirname, 'scripts', `${scriptName}.js`);
  const outputFile = path.join(resultsDir, `${scriptName}-output.txt`);
  
  console.log(`\n=== Exécution de ${scriptName} ===`);
  
  try {
    const startTime = Date.now();
    const output = execSync(`node ${scriptPath}`, { stdio: 'pipe' });
    const endTime = Date.now();
    
    fs.writeFileSync(outputFile, output);
    
    console.log(`✅ ${scriptName} terminé avec succès (${(endTime - startTime) / 1000} secondes)`);
    console.log(`   Rapport enregistré dans: ${outputFile}`);
    
    return { success: true, duration: (endTime - startTime) / 1000 };
  } catch (error) {
    const errorFile = path.join(resultsDir, `${scriptName}-error.txt`);
    fs.writeFileSync(errorFile, error.message);
    
    console.error(`❌ Erreur lors de l'exécution de ${scriptName}:`);
    console.error(error.message);
    console.log(`   Fichier d'erreur: ${errorFile}`);
    
    return { success: false, error: error.message };
  }
}

// Exécuter tous les scripts
async function runAllScans() {
  console.log('=== Démarrage des analyses ===');
  console.log(`Date: ${new Date().toISOString()}`);
  console.log(`Dossier des résultats: ${resultsDir}`);
  
  const results = [];
  
  for (const script of scripts) {
    const result = await runScript(script);
    results.push({
      script,
      ...result,
      timestamp: new Date().toISOString()
    });
    
    // Attendre 1 seconde entre chaque script
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Générer un rapport récapitulatif
  const report = {
    timestamp: new Date().toISOString(),
    totalScripts: scripts.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    details: results
  };
  
  const reportFile = path.join(resultsDir, 'scan-report.json');
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  
  console.log('\n=== Rapport d\'analyse ===');
  console.log(`Scripts exécutés: ${report.totalScripts}`);
  console.log(`✅ Réussis: ${report.successful}`);
  if (report.failed > 0) {
    console.log(`❌ Échecs: ${report.failed}`);
  }
  console.log(`\nRapport complet: ${reportFile}`);
}

// Démarrer l'exécution
runAllScans().catch(console.error);
