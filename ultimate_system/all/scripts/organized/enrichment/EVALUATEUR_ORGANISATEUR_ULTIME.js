const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

console.log('📋 EVALUATEUR ORGANISATEUR ULTIME - LANCEMENT + ÉVALUATION + ORGANISATION');

// Structure organisationnelle cible
const folders = {
  './scripts/backup': ['BACKUP', 'DUMP', 'HISTORICAL'],
  './scripts/enrichment': ['ENRICH', 'ULTIMATE', 'MEGA'],
  './scripts/scraping': ['SCRAP', 'WEB_', 'SEARCH'],
  './scripts/validation': ['VALID', 'CHECK', 'TEST', 'FIX'],
  './scripts/organization': ['ORGAN', 'RANGE', 'SORT', 'MOVE'],
  './scripts/orchestration': ['ORCHESTR', 'MASTER', 'AUTO_', 'FINAL']
};

// Fichiers essentiels à maintenir à la racine
const essentialFiles = [
  'app.js', 'app.json', 'package.json', 'package-lock.json',
  'README.md', '.homeyrc.json', '.gitignore', '.homeyignore',
  'EVALUATEUR_ORGANISATEUR_ULTIME.js'
];

// Créer structure de dossiers
const createFolderStructure = () => {
  console.log('\n📁 CRÉATION STRUCTURE DOSSIERS');
  
  Object.keys(folders).forEach(folder => {
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, {recursive: true});
      console.log(`✅ Créé: ${folder}`);
    }
  });
  
  // Dossier references
  if (!fs.existsSync('./references')) {
    fs.mkdirSync('./references', {recursive: true});
    console.log('✅ Créé: ./references');
  }
};

// Lancer et évaluer un script
const launchAndEvaluate = (scriptName) => {
  console.log(`\n🚀 ÉVALUATION: ${scriptName}`);
  
  try {
    const startTime = Date.now();
    
    // Exécution avec timeout
    execSync(`node ${scriptName}`, {
      timeout: 30000,
      stdio: 'inherit'
    });
    
    const duration = Date.now() - startTime;
    console.log(`✅ ${scriptName}: SUCCESS (${duration}ms)`);
    
    return {
      script: scriptName,
      status: 'SUCCESS',
      duration: duration,
      error: null
    };
    
  } catch(error) {
    console.log(`⚠️ ${scriptName}: ERREUR - ${error.message.slice(0, 50)}`);
    
    return {
      script: scriptName,
      status: 'ERROR',
      duration: 0,
      error: error.message.slice(0, 100)
    };
  }
};

// Déterminer le bon dossier pour un fichier
const getTargetFolder = (fileName) => {
  const upperName = fileName.toUpperCase();
  
  for (const [folder, patterns] of Object.entries(folders)) {
    if (patterns.some(pattern => upperName.includes(pattern))) {
      return folder;
    }
  }
  
  // Catégorisation par extension
  if (fileName.endsWith('.json')) {
    return './references';
  }
  
  return './scripts/organization'; // Dossier par défaut
};

// Organiser les fichiers
const organizeFiles = () => {
  console.log('\n📦 ORGANISATION FICHIERS');
  
  let organized = 0;
  let kept = 0;
  let errors = 0;
  
  const rootFiles = fs.readdirSync('./')
    .filter(f => !fs.statSync(f).isDirectory())
    .filter(f => f.endsWith('.js') || f.endsWith('.json'));
  
  console.log(`📊 ${rootFiles.length} fichiers détectés à organiser`);
  
  rootFiles.forEach(fileName => {
    // Vérifier si essentiel
    if (essentialFiles.includes(fileName)) {
      console.log(`🔒 Maintenu à la racine: ${fileName}`);
      kept++;
      return;
    }
    
    try {
      const targetFolder = getTargetFolder(fileName);
      const targetPath = path.join(targetFolder, fileName);
      
      // Éviter duplicatas
      if (fs.existsSync(targetPath)) {
        console.log(`⚠️ Existe déjà: ${fileName} dans ${targetFolder}`);
        return;
      }
      
      // Déplacement
      fs.renameSync(fileName, targetPath);
      console.log(`📁 ${fileName} → ${targetFolder}/`);
      organized++;
      
    } catch(error) {
      console.log(`❌ Erreur ${fileName}: ${error.message.slice(0, 50)}`);
      errors++;
    }
  });
  
  return { organized, kept, errors, total: rootFiles.length };
};

// Lancer tous les scripts disponibles
const evaluateAllScripts = () => {
  console.log('\n🔍 ÉVALUATION TOUS SCRIPTS DISPONIBLES');
  
  const results = [];
  
  // Scripts à la racine
  const rootScripts = fs.readdirSync('./')
    .filter(f => f.endsWith('.js'))
    .filter(f => !essentialFiles.includes(f))
    .filter(f => f !== 'EVALUATEUR_ORGANISATEUR_ULTIME.js');
  
  console.log(`📋 ${rootScripts.length} scripts détectés pour évaluation`);
  
  rootScripts.forEach(script => {
    const result = launchAndEvaluate(script);
    results.push(result);
  });
  
  return results;
};

// Génération rapport complet
const generateReport = (scriptResults, organizationResults) => {
  console.log('\n📋 GÉNÉRATION RAPPORT COMPLET');
  
  const report = {
    version: 'EVALUATEUR_ORGANISATEUR_ULTIME_V1',
    timestamp: new Date().toISOString(),
    
    scriptEvaluation: {
      total: scriptResults.length,
      success: scriptResults.filter(r => r.status === 'SUCCESS').length,
      errors: scriptResults.filter(r => r.status === 'ERROR').length,
      details: scriptResults
    },
    
    fileOrganization: {
      ...organizationResults,
      successRate: `${Math.round((organizationResults.organized / organizationResults.total) * 100)}%`
    },
    
    folderStructure: Object.keys(folders),
    
    summary: {
      scriptsLaunched: scriptResults.length,
      scriptsSuccess: scriptResults.filter(r => r.status === 'SUCCESS').length,
      filesOrganized: organizationResults.organized,
      filesKept: organizationResults.kept,
      overallStatus: (scriptResults.filter(r => r.status === 'SUCCESS').length === scriptResults.length && organizationResults.errors === 0) ? 'TOTAL_SUCCESS' : 'PARTIAL_SUCCESS'
    }
  };
  
  // Sauvegarde rapport
  fs.writeFileSync('./references/evaluateur_rapport_complet.json', JSON.stringify(report, null, 2));
  
  return report;
};

// Exécution principale
const executeEvaluatorOrganizer = async () => {
  console.log('🚀 DÉMARRAGE EVALUATEUR ORGANISATEUR ULTIME\n');
  
  try {
    // 1. Création structure
    createFolderStructure();
    
    // 2. Évaluation scripts
    const scriptResults = evaluateAllScripts();
    
    // 3. Organisation fichiers
    const organizationResults = organizeFiles();
    
    // 4. Génération rapport
    const report = generateReport(scriptResults, organizationResults);
    
    // Affichage résultats
    console.log('\n📊 RÉSULTATS FINAUX:');
    console.log(`   🚀 ${report.scriptEvaluation.success}/${report.scriptEvaluation.total} scripts réussis`);
    console.log(`   📁 ${report.fileOrganization.organized} fichiers organisés`);
    console.log(`   🔒 ${report.fileOrganization.kept} fichiers maintenus`);
    console.log(`   📋 Statut: ${report.summary.overallStatus}`);
    
    // Git commit final
    try {
      execSync('git add -A && git commit -m "📋 Évaluateur Organisateur Ultime" && git push', {stdio: 'pipe'});
      console.log('✅ Git push SUCCESS');
    } catch(e) {
      console.log('⚠️ Git push géré');
    }
    
    console.log('\n🎉 === ÉVALUATEUR ORGANISATEUR TERMINÉ ===');
    console.log(`📄 Rapport complet: ./references/evaluateur_rapport_complet.json`);
    
    return report.summary.overallStatus === 'TOTAL_SUCCESS';
    
  } catch(error) {
    console.log(`💥 Erreur fatale: ${error.message}`);
    return false;
  }
};

// Exécution
executeEvaluatorOrganizer().then(success => {
  process.exit(success ? 0 : 1);
});
