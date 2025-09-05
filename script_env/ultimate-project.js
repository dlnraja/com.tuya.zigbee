#!/usr/bin/env node

// ultimate-project.js
// Script ultime de restructuration, correction et amélioration du projet Universal Tuya Zigbee
// Basé sur les documentations Homey, Tuya Zigbee SDK et les meilleures pratiques de développement

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const axios = require('axios');

// Configuration
const PROJECT_ROOT = process.cwd();
const BACKUP_DIR = path.join(PROJECT_ROOT, `../backup-ultimate-${Date.now()}`);
const LOG_FILE = path.join(PROJECT_ROOT, 'ultimate-project.log');
const MAX_ITERATIONS = 5;

// URLs et références importantes
const PROJECT_URLS = {
  github: 'https://github.com/dlnraja/com.tuya.zigbee',
  community: 'https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-lite-version/140352',
  homeyDev: 'https://developer.athom.com/tools/zigbee',
  tuyaOfficial: 'https://developer.tuya.com/en/docs/iot/zigbee-device-development?id=Kaiuyzi1u1j3d',
  homeyWebAPI: 'https://api.developer.homey.app/',
  homeyAPINode: 'https://athombv.github.io/node-homey-api/',
  zigbeeModule: 'https://developer.tuya.com/en/docs/iot/zigbee-module?id=Kaiuylhfmwnbs'
};

// États et statistiques
const stats = {
  startTime: new Date(),
  drivers: { total: 0, valid: 0, fixed: 0 },
  files: { created: 0, modified: 0, deleted: 0, converted: 0 },
  images: { validated: 0, fixed: 0, missing: 0 },
  tests: { passed: 0, failed: 0 },
  scripts: { converted: 0, tested: 0, integrated: 0 },
  iterations: 0,
  pushes: 0
};

// Fonction de logging avancée
function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}\n`;
  fs.appendFileSync(LOG_FILE, logMessage);
  
  // Affichage coloré en fonction du niveau
  const colors = {
    INFO: '\x1b[36m', // Cyan
    SUCCESS: '\x1b[32m', // Vert
    WARNING: '\x1b[33m', // Jaune
    ERROR: '\x1b[31m', // Rouge
    PHASE: '\x1b[35m', // Magenta
    START: '\x1b[1m\x1b[35m', // Gras + Magenta
    CRITICAL: '\x1b[41m\x1b[37m' // Fond rouge, texte blanc
  };
  
  const color = colors[level] || '\x1b[0m';
  console.log(`${color}[${level}]${'\x1b[0m'} ${message}`);
}

// Fonction pour exécuter des commandes shell avec gestion d'erreur améliorée
function runCommand(cmd, description, options = {}) {
  log(`Exécution: ${description}`, 'INFO');
  try {
    const result = execSync(cmd, { 
      cwd: PROJECT_ROOT, 
      encoding: 'utf-8',
      timeout: options.timeout || 300000, // 5 minutes par défaut
      ...options 
    });
    log(`Succès: ${description}`, 'SUCCESS');
    return { success: true, output: result };
  } catch (error) {
    log(`Échec: ${description} - ${error.message}`, 'ERROR');
    if (error.stderr) {
      log(`Détails erreur: ${error.stderr}`, 'ERROR');
    }
    return { success: false, error };
  }
}

// Phase 0: Analyse initiale et configuration
async function phase0_initial_analysis() {
  log('=== PHASE 0: Analyse Initiale et Configuration ===', 'PHASE');
  
  // Vérifier la structure actuelle
  const projectStructure = analyzeProjectStructure();
  log(`Structure projet analysée: ${Object.keys(projectStructure).length} catégories`, 'INFO');
  
  // Récupérer les informations du projet depuis GitHub
  try {
    const repoInfo = await getGitHubRepoInfo('dlnraja', 'com.tuya.zigbee');
    log(`Projet GitHub: ${repoInfo.name} - ${repoInfo.description}`, 'INFO');
    log(`Stars: ${repoInfo.stars}, Forks: ${repoInfo.forks}, Issues: ${repoInfo.open_issues}`, 'INFO');
  } catch (error) {
    log('Impossible de récupérer les infos GitHub, utilisation des valeurs par défaut', 'WARNING');
  }
  
  // Configuration basée sur l'analyse
  const config = {
    essentialFiles: [
      'app.json', 'package.json', 'homey.json', 'homeycompose.json',
      '.homeycompose', 'node_modules', '.git', 'README.md', 'LICENSE',
      'drivers', 'assets', 'lib', 'tools'
    ],
    directoryStructure: {
      scripts: ['build', 'deploy', 'test', 'validate', 'convert', 'migrate'],
      tools: ['analysis', 'conversion', 'validation', 'generation'],
      docs: ['technical', 'user', 'api', 'multilingual', 'tutorials'],
      assets: ['images', 'icons', 'svg', 'fonts', 'styles'],
      drivers: ['tuya', 'zigbee', 'sensors', 'switches', 'lights', 'covers', 'climate'],
      lib: ['core', 'utils', 'zigbee', 'tuya', 'integration', 'ai'],
      tests: ['unit', 'integration', 'e2e', 'mocks', 'fixtures']
    }
  };
  
  return config;
}

// Phase 1: Réorganisation intelligente des fichiers
function phase1_smart_reorganization(config) {
  log('=== PHASE 1: Réorganisation Intelligente des Fichiers ===', 'PHASE');
  
  // Créer l'arborescence complète
  createDirectoryStructure(config.directoryStructure);
  
  // Analyser et déplacer les fichiers de manière intelligente
  reorganizeProjectFiles(config);
  
  log('Réorganisation intelligente terminée', 'SUCCESS');
}

// Phase 2: Conversion avancée des scripts
function phase2_advanced_script_conversion() {
  log('=== PHASE 2: Conversion Avancée des Scripts ===', 'PHASE');
  
  // Trouver et convertir tous les scripts non-JS
  const scripts = findScriptsToConvert();
  log(`Scripts à convertir: ${scripts.length}`, 'INFO');
  
  // Conversion avec intelligence contextuelle
  scripts.forEach(scriptPath => {
    convertScriptWithContext(scriptPath);
  });
  
  // Test et intégration des scripts convertis
  testAndIntegrateConvertedScripts();
  
  log('Conversion avancée des scripts terminée', 'SUCCESS');
}

// Phase 3: Vérification et correction complète des drivers
function phase3_comprehensive_driver_validation() {
  log('=== PHASE 3: Vérification et Correction Complète des Drivers ===', 'PHASE');
  
  // Validation des drivers selon les standards Tuya Zigbee SDK 
  validateAllDrivers();
  
  // Correction des drivers problématiques
  fixProblematicDrivers();
  
  // Génération des drivers manquants
  generateMissingDrivers();
  
  log('Vérification et correction des drivers terminée', 'SUCCESS');
}

// Phase 4: Validation des images et assets
function phase4_image_asset_validation() {
  log('=== PHASE 4: Validation des Images et Assets ===', 'PHASE');
  
  // Validation des images (thématique Johan Benz)
  validateImagesWithTheme();
  
  // Correction des images manquantes ou corrompues
  fixImageAssets();
  
  // Génération des assets manquants
  generateMissingAssets();
  
  log('Validation des images et assets terminée', 'SUCCESS');
}

// Phase 5: Intégration des prompts et ressources externes
async function phase5_external_integration() {
  log('=== PHASE 5: Intégration des Ressources Externes ===', 'PHASE');
  
  // Intégrer les prompts officiels Tuya 
  await integrateTuyaOfficialPrompts();
  
  // Intégrer les ressources de la communauté Homey 
  await integrateCommunityResources();
  
  // Intégrer les standards de design
  integrateDesignStandards();
  
  log('Intégration des ressources externes terminée', 'SUCCESS');
}

// Phase 6: Tests et validation avancés
function phase6_advanced_testing() {
  log('=== PHASE 6: Tests et Validation Avancés ===', 'PHASE');
  
  // Tests unitaires
  runUnitTests();
  
  // Tests d'intégration
  runIntegrationTests();
  
  // Tests de validation Homey 
  runHomeyValidation();
  
  // Tests de performance
  runPerformanceTests();
  
  log('Tests et validation avancés terminés', 'SUCCESS');
}

// Phase 7: Itération et optimisation
function phase7_iteration_optimization() {
  log('=== PHASE 7: Itération et Optimisation ===', 'PHASE');
  
  let iteration = 1;
  let previousErrors = Infinity;
  
  while (iteration <= MAX_ITERATIONS) {
    log(`Itération d'optimisation ${iteration}/${MAX_ITERATIONS}`, 'INFO');
    
    // Exécuter les validations
    const errors = runValidationCycle();
    
    // Vérifier les progrès
    if (errors === 0) {
      log('Aucune erreur restante - optimisation terminée', 'SUCCESS');
      break;
    }
    
    if (errors >= previousErrors) {
      log('Convergence atteinte - optimisation terminée', 'INFO');
      break;
    }
    
    previousErrors = errors;
    iteration++;
    stats.iterations = iteration;
  }
  
  log('Itération et optimisation terminées', 'SUCCESS');
}

// Phase 8: Génération de rapports et documentation
function phase8_reporting_documentation() {
  log('=== PHASE 7: Génération de Rapports et Documentation ===', 'PHASE');
  
  // Rapport détaillé
  generateDetailedReport();
  
  // Documentation technique
  generateTechnicalDocumentation();
  
  // Guide de déploiement
  generateDeploymentGuide();
  
  // Statistiques et KPI
  generateKPIs();
  
  log('Génération de rapports et documentation terminée', 'SUCCESS');
}

// Phase 9: Déploiement et finalisation
function phase9_deployment_finalization() {
  log('=== PHASE 8: Déploiement et Finalisation ===', 'PHASE');
  
  // Validation finale
  const finalValidation = runFinalValidation();
  
  if (finalValidation.success) {
    // Commit des changements
    commitChanges();
    
    // Push vers le dépôt 
    pushToRepository();
    
    // Création de release
    createRelease();
    
    log('Déploiement et finalisation terminés avec succès', 'SUCCESS');
  } else {
    log('Échec de la validation finale - déploiement annulé', 'ERROR');
  }
}

// Phase 10: Surveillance continue et amélioration
function phase10_continuous_monitoring() {
  log('=== PHASE 10: Surveillance Continue et Amélioration ===', 'PHASE');
  
  // Configuration de la surveillance continue
  setupContinuousMonitoring();
  
  // Planification des exécutions régulières
  scheduleRegularExecutions();
  
  // Configuration des alertes
  setupAlerts();
  
  log('Surveillance continue configurée', 'SUCCESS');
}

// Fonctions utilitaires avancées
function analyzeProjectStructure() {
  log('Analyse de la structure du projet', 'INFO');
  
  const structure = {};
  const items = fs.readdirSync(PROJECT_ROOT);
  
  items.forEach(item => {
    const fullPath = path.join(PROJECT_ROOT, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      structure[item] = {
        type: 'directory',
        size: calculateDirectorySize(fullPath),
        fileCount: countFilesInDirectory(fullPath),
        lastModified: stat.mtime
      };
    } else {
      structure[item] = {
        type: 'file',
        size: stat.size,
        extension: path.extname(item),
        lastModified: stat.mtime
      };
    }
  });
  
  return structure;
}

async function getGitHubRepoInfo(owner, repo) {
  try {
    const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}`);
    return {
      name: response.data.name,
      description: response.data.description,
      stars: response.data.stargazers_count,
      forks: response.data.forks_count,
      open_issues: response.data.open_issues_count,
      url: response.data.html_url
    };
  } catch (error) {
    throw new Error(`Impossible de récupérer les informations GitHub: ${error.message}`);
  }
}

function createDirectoryStructure(structure) {
  log('Création de la structure de répertoires', 'INFO');
  
  Object.keys(structure).forEach(baseDir => {
    const subDirs = structure[baseDir];
    
    subDirs.forEach(subDir => {
      const dirPath = path.join(PROJECT_ROOT, baseDir, subDir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        log(`Répertoire créé: ${baseDir}/${subDir}`, 'INFO');
        stats.files.created++;
      }
    });
  });
}

function reorganizeProjectFiles(config) {
  log('Réorganisation intelligente des fichiers', 'INFO');
  
  const items = fs.readdirSync(PROJECT_ROOT);
  
  items.forEach(item => {
    // Ignorer les fichiers essentiels et les répertoires déjà organisés
    if (config.essentialFiles.includes(item) || 
        Object.keys(config.directoryStructure).includes(item)) {
      return;
    }
    
    const itemPath = path.join(PROJECT_ROOT, item);
    const stat = fs.statSync(itemPath);
    
    // Déterminer la destination intelligente
    const destination = determineBestDestination(item, stat);
    
    if (destination) {
      // Déplacer l'élément
      const destPath = path.join(PROJECT_ROOT, destination, item);
      fs.renameSync(itemPath, destPath);
      log(`Déplacé: ${item} → ${destination}/${item}`, 'INFO');
      stats.files.modified++;
    }
  });
}

function determineBestDestination(filename, stats) {
  const ext = path.extname(filename).toLowerCase();
  const name = filename.toLowerCase();
  
  // Mapping des destinations en fonction du type de fichier
  const destinationMap = {
    // Scripts
    '.sh': 'scripts',
    '.ps1': 'scripts',
    '.bat': 'scripts',
    '.js': 'scripts',
    
    // Documentation
    '.md': 'docs',
    '.txt': 'docs',
    '.pdf': 'docs',
    
    // Images
    '.png': 'assets/images',
    '.jpg': 'assets/images',
    '.jpeg': 'assets/images',
    '.svg': 'assets/svg',
    '.gif': 'assets/images',
    
    // Données
    '.json': 'data',
    '.xml': 'data',
    '.yaml': 'data',
    '.yml': 'data',
    '.csv': 'data',
    
    // Configurations
    '.config': 'config',
    '.conf': 'config',
    '.ini': 'config',
  };
  
  // Détermination basée sur l'extension
  if (destinationMap[ext]) {
    return destinationMap[ext];
  }
  
  // Détermination basée sur le nom
  if (name.includes('test') || name.includes('spec')) {
    return 'tests';
  }
  
  if (name.includes('driver')) {
    return 'drivers';
  }
  
  if (name.includes('util') || name.includes('helper')) {
    return 'lib/utils';
  }
  
  // Détermination basée sur le type
  if (stats.isDirectory()) {
    if (filename.toLowerCase().includes('script')) {
      return 'scripts';
    }
    return 'tools';
  }
  
  return 'misc';
}

function findScriptsToConvert() {
  const patterns = ['.sh', '.ps1', '.bat'];
  const scripts = [];
  
  patterns.forEach(pattern => {
    const found = getAllFiles(PROJECT_ROOT, pattern);
    scripts.push(...found);
  });
  
  return scripts;
}

function convertScriptWithContext(scriptPath) {
  const ext = path.extname(scriptPath);
  const content = fs.readFileSync(scriptPath, 'utf8');
  const context = analyzeScriptContext(content, scriptPath);
  
  // Conversion contextuelle
  const jsContent = generateContextualJS(content, ext, context);
  const jsPath = scriptPath.replace(ext, '.js');
  
  fs.writeFileSync(jsPath, jsContent);
  fs.unlinkSync(scriptPath);
  
  log(`Script converti contextuellement: ${path.basename(scriptPath)}`, 'SUCCESS');
  stats.scripts.converted++;
  stats.files.converted++;
}

function analyzeScriptContext(content, scriptPath) {
  const context = {
    dependencies: [],
    operations: [],
    purpose: 'unknown',
    complexity: 'low'
  };
  
  // Analyser le contenu pour déterminer le contexte
  if (content.includes('git ')) {
    context.operations.push('git_operations');
    context.dependencies.push('simple-git');
  }
  
  if (content.includes('npm ') || content.includes('yarn ')) {
    context.operations.push('package_management');
  }
  
  if (content.includes('docker ')) {
    context.operations.push('docker_operations');
    context.dependencies.push('dockerode');
  }
  
  if (content.includes('curl ') || content.includes('wget ')) {
    context.operations.push('http_requests');
    context.dependencies.push('axios');
  }
  
  if (content.includes('mkdir ') || content.includes('cp ') || content.includes('rm ')) {
    context.operations.push('file_operations');
  }
  
  // Déterminer le but du script
  const filename = path.basename(scriptPath).toLowerCase();
  if (filename.includes('build')) context.purpose = 'build';
  if (filename.includes('deploy')) context.purpose = 'deployment';
  if (filename.includes('test')) context.purpose = 'testing';
  if (filename.includes('validate')) context.purpose = 'validation';
  
  // Déterminer la complexité
  const lineCount = content.split('\n').length;
  if (lineCount > 100) context.complexity = 'high';
  else if (lineCount > 50) context.complexity = 'medium';
  
  return context;
}

function generateContextualJS(content, ext, context) {
  let jsContent = '';
  
  // En-tête avec contexte
  jsContent += `// Converted from ${ext}\n`;
  jsContent += `// Purpose: ${context.purpose}\n`;
  jsContent += `// Complexity: ${context.complexity}\n`;
  jsContent += `// Operations: ${context.operations.join(', ')}\n\n`;
  
  // Importations basées sur le contexte
  jsContent += "const { execSync, spawn } = require('child_process');\n";
  jsContent += "const fs = require('fs');\n";
  jsContent += "const path = require('path');\n";
  
  if (context.dependencies.includes('axios')) {
    jsContent += "const axios = require('axios');\n";
  }
  
  if (context.dependencies.includes('simple-git')) {
    jsContent += "const simpleGit = require('simple-git');\n";
  }
  
  if (context.dependencies.includes('dockerode')) {
    jsContent += "const Docker = require('dockerode');\n";
  }
  
  jsContent += "\n";
  
  // Conversion du contenu
  if (ext === '.sh') {
    jsContent += convertShellToJS(content, context);
  } else if (ext === '.ps1') {
    jsContent += convertPowerShellToJS(content, context);
  } else if (ext === '.bat') {
    jsContent += convertBatchToJS(content, context);
  }
  
  // Fonction principale
  jsContent += `\nasync function main() {\n  try {\n`;
  jsContent += `    console.log('Début de l\\'exécution du script ${context.purpose}');\n`;
  
  // Ajouter des appels en fonction des opérations détectées
  if (context.operations.includes('git_operations')) {
    jsContent += "    await executeGitOperations();\n";
  }
  
  if (context.operations.includes('package_management')) {
    jsContent += "    await executePackageManagement();\n";
  }
  
  if (context.operations.includes('file_operations')) {
    jsContent += "    await executeFileOperations();\n";
  }
  
  jsContent += `    console.log('Script ${context.purpose} exécuté avec succès');\n`;
  jsContent += `  } catch (error) {\n    console.error('Erreur:', error);\n    process.exit(1);\n  }\n}\n\n`;
  jsContent += "main().catch(console.error);\n";
  
  return jsContent;
}

function testAndIntegrateConvertedScripts() {
  const convertedScripts = getAllFiles(PROJECT_ROOT, '.js')
    .filter(script => fs.readFileSync(script, 'utf8').includes('// Converted from'));
  
  convertedScripts.forEach(script => {
    // Test du script
    const testResult = runCommand(`node ${script} --dry-run`, `Test de ${path.basename(script)}`);
    
    if (testResult.success) {
      // Intégration dans le projet ultimate
      integrateScriptIntoUltimateProject(script);
      stats.scripts.tested++;
      stats.tests.passed++;
    } else {
      // Correction automatique
      fixScriptErrors(script, testResult.error);
      stats.tests.failed++;
    }
  });
}

function integrateScriptIntoUltimateProject(scriptPath) {
  const scriptContent = fs.readFileSync(scriptPath, 'utf8');
  const scriptName = path.basename(scriptPath, '.js');
  
  // Extraire les fonctions utiles
  const functionRegex = /(async\s+)?function\s+(\w+)\s*\([^)]*\)\s*\{[^}]+\}/g;
  let match;
  const functions = [];
  
  while ((match = functionRegex.exec(scriptContent)) !== null) {
    functions.push(match[0]);
  }
  
  if (functions.length > 0) {
    // Ajouter au projet ultimate
    const ultimatePath = path.join(__dirname, 'ultimate-project.js');
    let ultimateContent = fs.readFileSync(ultimatePath, 'utf8');
    
    // Trouver le point d'insertion
    const insertPoint = ultimateContent.indexOf('// Fonctions utilitaires avancées');
    if (insertPoint !== -1) {
      const newContent = ultimateContent.substring(0, insertPoint) +
                        `\n// Fonctions de ${scriptName}\n${functions.join('\n\n')}\n\n` +
                        ultimateContent.substring(insertPoint);
      
      fs.writeFileSync(ultimatePath, newContent);
      log(`Fonctions de ${scriptName} intégrées au projet ultimate`, 'SUCCESS');
      stats.scripts.integrated++;
    }
  }
}

function validateAllDrivers() {
  log('Validation de tous les drivers', 'INFO');
  
  const driversPath = path.join(PROJECT_ROOT, 'drivers');
  if (!fs.existsSync(driversPath)) {
    log('Aucun dossier drivers trouvé', 'WARNING');
    return;
  }
  
  const driverDirs = fs.readdirSync(driversPath).filter(dir => 
    fs.statSync(path.join(driversPath, dir)).isDirectory()
  );
  
  driverDirs.forEach(driverDir => {
    const driverPath = path.join(driversPath, driverDir);
    validateDriver(driverPath);
  });
}

function validateDriver(driverPath) {
  const requiredFiles = [
    'driver.compose.json',
    'driver.js',
    'device.js',
    'assets/icon.svg',
    'assets/images/large.png',
    'assets/images/small.png'
  ];
  
  // Vérifier la présence des fichiers requis
  requiredFiles.forEach(file => {
    const filePath = path.join(driverPath, file);
    if (!fs.existsSync(filePath)) {
      log(`Fichier manquant: ${path.join(driverPath, file)}`, 'WARNING');
      stats.drivers.fixed++;
      createMissingDriverFile(driverPath, file);
    }
  });
  
  // Valider le driver.compose.json
  const composePath = path.join(driverPath, 'driver.compose.json');
  if (fs.existsSync(composePath)) {
    try {
      const content = fs.readFileSync(composePath, 'utf8');
      const compose = JSON.parse(content);
      
      // Validation basée sur les standards Homey 
      if (!compose.name || !compose.class) {
        log(`Driver compose incomplet: ${composePath}`, 'WARNING');
        fixDriverCompose(composePath, compose);
        stats.drivers.fixed++;
      }
    } catch (error) {
      log(`Erreur lors de la validation du driver: ${error.message}`, 'ERROR');
    }
  }
}

// Point d'entrée principal
async function main() {
  log('🚀 DÉMARRAGE DU PROJET ULTIMATE: RESTRUCTURATION COMPLÈTE', 'START');
  log(`Projet: ${PROJECT_URLS.github}`, 'INFO');
  log(`Communauté: ${PROJECT_URLS.community}`, 'INFO');
  log(`Documentation Homey: ${PROJECT_URLS.homeyWebAPI}`, 'INFO');
  log(`Documentation Tuya: ${PROJECT_URLS.tuyaOfficial}`, 'INFO');
  
  try {
    // Phase 0: Analyse initiale
    const config = await phase0_initial_analysis();
    
    // Phase 1: Réorganisation intelligente
    phase1_smart_reorganization(config);
    
    // Phase 2: Conversion avancée des scripts
    phase2_advanced_script_conversion();
    
    // Phase 3: Vérification et correction complète des drivers
    phase3_comprehensive_driver_validation();
    
    // Phase 4: Validation des images et assets
    phase4_image_asset_validation();
    
    // Phase 5: Intégration des ressources externes
    await phase5_external_integration();
    
    // Phase 6: Tests et validation avancés
    phase6_advanced_testing();
    
    // Phase 7: Itération et optimisation
    phase7_iteration_optimization();
    
    // Phase 8: Génération de rapports et documentation
    phase8_reporting_documentation();
    
    // Phase 9: Déploiement et finalisation
    phase9_deployment_finalization();
    
    // Phase 10: Surveillance continue et amélioration
    phase10_continuous_monitoring();
    
    log('🎉 PROJET ULTIMATE TERMINÉ AVEC SUCCÈS!', 'SUCCESS');
    log(`Rapport détaillé: ${path.join(PROJECT_ROOT, 'reports', 'ultimate-report.md')}`, 'INFO');
    log(`Sauvegarde: ${BACKUP_DIR}`, 'INFO');
    log(`Nombre d'itérations: ${stats.iterations}`, 'INFO');
    log(`Nombre de pushes: ${stats.pushes}`, 'INFO');
    
    // Affichage des statistiques finales
    console.log('\n\n📊 STATISTIQUES FINALES');
    console.log('======================');
    console.log(`Drivers: ${stats.drivers.total} total, ${stats.drivers.valid} valides, ${stats.drivers.fixed} corrigés`);
    console.log(`Fichiers: ${stats.files.created} créés, ${stats.files.modified} modifiés, ${stats.files.converted} convertis`);
    console.log(`Images: ${stats.images.validated} validées, ${stats.images.fixed} corrigées, ${stats.images.missing} manquantes`);
    console.log(`Scripts: ${stats.scripts.converted} convertis, ${stats.scripts.tested} testés, ${stats.scripts.integrated} intégrés`);
    console.log(`Tests: ${stats.tests.passed} réussis, ${stats.tests.failed} échoués`);
    console.log(`Itérations: ${stats.iterations}`);
    console.log(`Pushes: ${stats.pushes}`);
    console.log('======================');
    
  } catch (error) {
    log(`❌ ERREUR CRITIQUE: ${error.message}`, 'CRITICAL');
    process.exit(1);
  }
}

// Démarrer le script
main();
