// Script d'analyse autonome pour le projet Tuya Zigbee
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const OUTPUT_DIR = 'analysis-results';
const SCRIPTS = [
  { name: 'scout', file: 'scripts/scout.js' },
  { name: 'architect', file: 'scripts/architect.js' },
  { name: 'optimizer', file: 'scripts/optimizer.js' },
  { name: 'validator', file: 'scripts/validator.js' }
];

// Fonction utilitaire pour exécuter une commande
function runCommand(command) {
  try {
    console.log(`Exécution: ${command}`);
    const output = execSync(command, { stdio: 'pipe', encoding: 'utf-8' });
    return { success: true, output };
  } catch (error) {
    return { 
      success: false, 
      error: error.message,
      output: error.output ? error.output.toString() : ''
    };
  }
}

// Créer le dossier de sortie si nécessaire
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR);
}

// Journal des résultats
const results = {
  startTime: new Date().toISOString(),
  nodeVersion: process.version,
  platform: process.platform,
  arch: process.arch,
  cwd: process.cwd(),
  scripts: {}
};

console.log('=== Démarrage des analyses ===');
console.log(`Date: ${new Date().toLocaleString()}`);
console.log(`Node.js: ${results.nodeVersion}`);
console.log(`Plateforme: ${results.platform} ${results.arch}`);
console.log(`Répertoire: ${results.cwd}`);
console.log('='.repeat(50) + '\n');

// Vérifier les fichiers de script
console.log('Vérification des scripts...');
let allScriptsExist = true;

for (const script of SCRIPTS) {
  const scriptPath = path.join(process.cwd(), script.file);
  script.exists = fs.existsSync(scriptPath);
  script.size = script.exists ? fs.statSync(scriptPath).size : 0;
  
  console.log(`- ${script.file}: ${script.exists ? '✅ Trouvé' : '❌ Introuvable'}`);
  if (!script.exists) allScriptsExist = false;
  
  results.scripts[script.name] = {
    path: scriptPath,
    exists: script.exists,
    size: script.size
  };
}

if (!allScriptsExist) {
  console.log('\n❌ Certains scripts sont manquants. Arrêt.');
  process.exit(1);
}

// Exécuter chaque script
console.log('\nExécution des analyses...\n');

for (const script of SCRIPTS) {
  const startTime = Date.now();
  const outputFile = path.join(OUTPUT_DIR, `${script.name}-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`);
  
  console.log(`=== ${script.name.toUpperCase()} ===`);
  console.log(`Fichier: ${script.file}`);
  console.log(`Sortie: ${outputFile}`);
  
  try {
    // Exécuter le script avec Node.js
    const command = `node ${script.file}`;
    const result = runCommand(command);
    
    // Enregistrer les résultats
    const scriptResult = {
      startTime: new Date(startTime).toISOString(),
      endTime: new Date().toISOString(),
      duration: Date.now() - startTime,
      command,
      success: result.success,
      outputFile
    };
    
    if (result.success) {
      console.log(`✅ Succès (${scriptResult.duration}ms)`);
      // Écrire la sortie dans un fichier
      fs.writeFileSync(outputFile, result.output, 'utf8');
    } else {
      console.error(`❌ Échec (${scriptResult.duration}ms)`);
      console.error(`Erreur: ${result.error}`);
      // Écrire l'erreur dans un fichier
      fs.writeFileSync(outputFile, `ERREUR: ${result.error}\n\n${result.output}`, 'utf8');
    }
    
    results.scripts[script.name].result = scriptResult;
    
  } catch (error) {
    console.error(`❌ Erreur inattendue: ${error.message}`);
    results.scripts[script.name].error = error.message;
  }
  
  console.log(''); // Ligne vide pour la lisibilité
}

// Enregistrer le rapport final
results.endTime = new Date().toISOString();
const reportFile = path.join(OUTPUT_DIR, `analysis-report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
fs.writeFileSync(reportFile, JSON.stringify(results, null, 2), 'utf8');

// Afficher le résumé
console.log('=== RÉSUMÉ ===');
console.log(`Début: ${results.startTime}`);
console.log(`Fin: ${results.endTime}`);
console.log(`Rapport complet: ${reportFile}`);

let successCount = 0;
let errorCount = 0;

for (const script of SCRIPTS) {
  const result = results.scripts[script.name].result;
  if (result) {
    console.log(`- ${script.name}: ${result.success ? '✅ Succès' : '❌ Échec'} (${result.duration}ms)`);
    if (result.success) successCount++;
    else errorCount++;
  } else {
    console.log(`- ${script.name}: ⚠️  Non exécuté`);
  }
}

console.log(`\nTerminé: ${successCount} succès, ${errorCount} échecs`);
console.log(`Rapport complet enregistré dans: ${reportFile}`);
