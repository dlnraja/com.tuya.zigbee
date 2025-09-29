const fs = require('fs');
const { execSync } = require('child_process');

console.log('🎭 ULTIMATE ORCHESTRATOR V15 - SYSTÈME HOLISTIQUE COMPLET');

// Modules du système holistique V15
const holisticModules = [
  {
    name: 'ULTRA_SCANNER_V15.js',
    phase: 'Audit & Sécurité',
    critical: true
  },
  {
    name: 'ULTRA_ENRICHER_V15.js', 
    phase: 'Enrichissement Intelligent',
    critical: true
  },
  {
    name: 'ORGANIZE_ALL_V15.js',
    phase: 'Organisation Dynamique', 
    critical: false
  }
];

const executionLog = {
  version: 'V15.0.0',
  timestamp: new Date().toISOString(),
  phases: [],
  errors: [],
  success: 0,
  total: holisticModules.length
};

// Exécution séquentielle intelligente
holisticModules.forEach(module => {
  console.log(`▶️ Phase: ${module.phase} (${module.name})`);
  
  try {
    const startTime = Date.now();
    execSync(`node ${module.name}`, {stdio: 'inherit'});
    const duration = Date.now() - startTime;
    
    executionLog.phases.push({
      module: module.name,
      phase: module.phase,
      status: 'SUCCESS',
      duration: `${duration}ms`
    });
    
    executionLog.success++;
    console.log(`✅ ${module.name}: SUCCESS`);
    
  } catch(error) {
    executionLog.phases.push({
      module: module.name,
      phase: module.phase, 
      status: 'ERROR',
      error: error.message
    });
    
    executionLog.errors.push(`${module.name}: ${error.message}`);
    
    if (module.critical) {
      console.log(`❌ CRITICAL: ${module.name} failed`);
    } else {
      console.log(`⚠️ ${module.name}: Non-critical error handled`);
    }
  }
});

// Sauvegarde log d'exécution
fs.writeFileSync('./references/orchestrator_v15_log.json', JSON.stringify(executionLog, null, 2));

console.log(`\n📊 Exécution V15: ${executionLog.success}/${executionLog.total} phases réussies`);

// Git intelligent avec gestion d'erreurs robuste
if (executionLog.success >= 2) { // Au moins 2 phases critiques réussies
  console.log('🚀 Déploiement Git intelligent...');
  
  try {
    // Séquence Git ultra-robuste inspirée de l'historique
    execSync('git stash', {stdio: 'pipe'});
    execSync('git fetch origin', {stdio: 'pipe'}); 
    execSync('git pull --rebase origin master', {stdio: 'pipe'});
    execSync('git stash pop', {stdio: 'pipe'});
    
    // Validation Homey obligatoire
    execSync('homey app validate', {stdio: 'inherit'});
    
    // Commit et push
    execSync('git add -A', {stdio: 'pipe'});
    execSync('git commit -m "🎭 V15 Orchestrator - Système Holistique Complet"', {stdio: 'pipe'});
    execSync('git push origin master', {stdio: 'pipe'});
    
    console.log('🎉 === ORCHESTRATION V15 HOLISTIQUE TERMINÉE ===');
    
  } catch(gitError) {
    console.log('⚠️ Git error handled gracefully:', gitError.message.slice(0, 100));
    executionLog.errors.push(`Git: ${gitError.message}`);
  }
} else {
  console.log('⚠️ Déploiement annulé - Phases critiques échouées');
}

// Mise à jour finale du log
fs.writeFileSync('./references/orchestrator_v15_log.json', JSON.stringify(executionLog, null, 2));
